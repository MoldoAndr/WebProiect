from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.core.db import get_database  # This now uses settings.MONGO_URI and enhanced options
from app.models.admin_chat import Ticket, TicketCreate, TicketUpdate, Message, MessageCreate, TicketStatus
import logging # Import logging
from pymongo.errors import WriteError, OperationFailure # Import specific errors

logger = logging.getLogger(__name__)

async def get_user_tickets(user_id: str) -> List[Ticket]:
    """
    Get all tickets for a user
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of tickets
    """
    db = await get_database()
    if db is None:
        raise Exception("Database connection not established. Please check your MongoDB configuration.")
    
    cursor = db.tickets.find({"user_id": user_id}).sort("updated_at", -1)
    tickets = []
    
    async for ticket_data in cursor:
        # Ensure _id is properly set and converted to string
        ticket_data["_id"] = str(ticket_data["_id"])
        
        messages_cursor = db.admin_messages.find({"ticket_id": ticket_data["_id"]}).sort("created_at", 1)
        messages = []
        
        async for message_data in messages_cursor:
            message_data["_id"] = str(message_data["_id"])
            messages.append(Message(**message_data))
        
        ticket_data["messages"] = messages
        tickets.append(Ticket(**ticket_data))
    
    return tickets

async def get_admin_tickets(status: Optional[TicketStatus] = None) -> List[Ticket]:
    """
    Get all tickets for admin view, optionally filtered by status
    """
    db = await get_database()
    if db is None:
        raise Exception("Database connection not established. Please check your MongoDB configuration.")
    
    query = {}
    if status:
        query["status"] = status.value
    
    cursor = db.tickets.find(query).sort("updated_at", -1)
    tickets = []
    
    async for ticket_data in cursor:
        # Convert the ObjectId to a string and keep the key as "_id"
        ticket_data["_id"] = str(ticket_data["_id"])
        
        # Use the _id string when querying messages
        messages_cursor = db.admin_messages.find({"ticket_id": ticket_data["_id"]}).sort("created_at", 1)
        messages = []
        
        async for message_data in messages_cursor:
            # Ensure message _id is also a string and keep key as "_id"
            message_data["_id"] = str(message_data["_id"])
            messages.append(Message(**message_data))
        
        ticket_data["messages"] = messages
        tickets.append(Ticket(**ticket_data))
    
    return tickets


async def get_ticket(ticket_id: str) -> Optional[Ticket]:
    """
    Get a ticket by ID
    
    Args:
        ticket_id: The ID of the ticket
        
    Returns:
        The ticket if found, None otherwise
    """
    db = await get_database()
    if db is None:
        raise Exception("Database connection not established. Please check your MongoDB configuration.")
    
    ticket_data = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    
    if not ticket_data:
        return None
    
    # Keep _id as is, don't convert to id
    ticket_data["_id"] = str(ticket_data["_id"])
    
    messages_cursor = db.admin_messages.find({"ticket_id": ticket_id}).sort("created_at", 1)
    messages = []
    
    async for message_data in messages_cursor:
        message_data["_id"] = str(message_data["_id"])
        messages.append(Message(**message_data))
    
    ticket_data["messages"] = messages
    return Ticket(**ticket_data)

async def add_message(ticket_id: str, user_id: str, message_data: MessageCreate, is_admin: bool = False, admin_id: Optional[str] = None, admin_name: Optional[str] = None) -> Message:
    logger.debug(f"Entered add_message for ticket_id: {ticket_id}, user_id: {user_id}, is_admin: {is_admin}")

    # --- Database Connection Check (Optional but helpful) ---
    # if not await _check_db_connection():
    #      raise Exception("Database connection check failed before adding message.")
    # -------------------------------------------------------

    db = await get_database()
    if db is None:
        logger.error("Database connection failed in add_message.")
        raise Exception("Database connection not established. Please check your MongoDB configuration.")

    logger.debug(f"Fetching ticket {ticket_id} within add_message.")
    try:
        # Assuming get_ticket uses find_one({"_id": ObjectId(ticket_id)})
        ticket_data = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket_data:
            logger.warning(f"Ticket {ticket_id} not found within add_message query.")
            raise ValueError(f"Ticket with ID {ticket_id} not found")
        # Minimal processing needed here, just need ticket existence and maybe user_id/status
        ticket_user_id = ticket_data.get("user_id")
        ticket_status_str = ticket_data.get("status")
        ticket_status = TicketStatus(ticket_status_str) if ticket_status_str else None
        logger.debug(f"Ticket {ticket_id} found (status: {ticket_status}). Owner: {ticket_user_id}")

        # Add authorization/status checks directly here if not done in the route
        if not is_admin and ticket_user_id != user_id:
             logger.warning(f"Authorization failed: User {user_id} cannot add message to ticket {ticket_id} owned by {ticket_user_id}")
             raise ValueError("Not authorized to add messages to this ticket") # Or a custom exception

        if ticket_status == TicketStatus.CLOSED:
             logger.warning(f"Attempt to add message to closed ticket {ticket_id}")
             raise ValueError("Cannot add messages to a closed ticket")

    except ValueError as ve: # Catch specific errors from checks
        raise ve
    except Exception as e:
        logger.error(f"Error fetching/checking ticket {ticket_id} within add_message: {e}", exc_info=True)
        raise Exception(f"Failed to retrieve or validate ticket {ticket_id}") # Raise generic for 500

    now = datetime.utcnow()
    new_message = {
        "ticket_id": ticket_id,
        "user_id": user_id, # The user who *owns* the ticket
        "content": message_data.content,
        "is_admin": is_admin,
        "created_at": now,
        # Add sender info distinctly if needed:
        # "sender_id": admin_id if is_admin else user_id, # ID of the actual sender
        # "sender_name": admin_name if is_admin else None # Name of the actual sender (fetch user name?)
    }

    if is_admin:
        if not admin_id or not admin_name:
             logger.warning(f"Admin message added to ticket {ticket_id} without admin_id/admin_name.")
        # Ensure admin_id is string if provided, otherwise null/None is fine for Mongo
        new_message["admin_id"] = str(admin_id) if admin_id else None
        new_message["admin_name"] = admin_name

    logger.info(f"Attempting to insert message into 'admin_messages': {new_message}")

    try:
        # Use the collection name directly from db
        result = await db.admin_messages.insert_one(new_message.copy()) # Use copy to avoid mutation issues
        logger.info(f"Insert result acknowledged: {result.acknowledged}, Inserted ID: {result.inserted_id}")

        if not result.inserted_id:
             logger.error("MongoDB insert_one for 'admin_messages' did not return an inserted_id!")
             # Even if acknowledged, if ID is missing, we can't proceed reliably
             raise OperationFailure("Message insert acknowledged but no ID returned.")

        message_id = str(result.inserted_id)
        logger.debug(f"Message ID created: {message_id}")

    except WriteError as we:
        logger.error(f"MongoDB WriteError inserting into 'admin_messages' for ticket {ticket_id}: Code={we.code}, Details={we.details}", exc_info=True)
        raise # Re-raise to be caught by endpoint -> 500
    except OperationFailure as of:
         logger.error(f"MongoDB OperationFailure inserting into 'admin_messages' for ticket {ticket_id}: Code={of.code}, Details={of.details}", exc_info=True)
         # Could be auth error, schema validation, etc.
         raise # Re-raise -> 500
    except Exception as e:
        # Catch any other unexpected error during insert
        logger.error(f"Unexpected error during 'admin_messages' insertion for ticket {ticket_id}: {e}", exc_info=True)
        raise # Re-raise -> 500

    # --- Update Ticket Timestamp ---
    logger.debug(f"Attempting to update timestamp for ticket {ticket_id}")
    try:
        update_result = await db.tickets.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": {"updated_at": now}}
        )
        if update_result.matched_count == 0:
             logger.warning(f"Ticket {ticket_id} not found during timestamp update after message insert.")
        elif update_result.modified_count == 0:
             logger.warning(f"Ticket {ticket_id} timestamp was already current, not modified.")
        else:
             logger.debug(f"Ticket {ticket_id} timestamp updated successfully.")
    except Exception as e:
        # Log this error but don't necessarily fail the request, message is saved.
        logger.error(f"Non-critical error updating ticket timestamp for {ticket_id} after message insert: {e}", exc_info=True)

    # --- Conditional Status Update (Admin Reply) ---
    # Note: The original code fetched messages again here via get_ticket.
    # Avoid refetching. We know a message was just added. Check ticket status directly.
    if is_admin and ticket_status == TicketStatus.OPEN:
         logger.info(f"Admin replied to OPEN ticket {ticket_id}. Updating status to IN_PROGRESS.")
         try:
             # Call update_ticket directly, avoiding redundant get_ticket inside it if possible
             await db.tickets.update_one(
                 {"_id": ObjectId(ticket_id)},
                 {"$set": {"status": TicketStatus.IN_PROGRESS.value, "updated_at": now}}
             )
         except Exception as e:
              logger.error(f"Failed to update ticket {ticket_id} status to IN_PROGRESS after admin reply: {e}", exc_info=True)


    # --- Prepare and return Pydantic model ---
    # Construct the dictionary for the Pydantic model *from the data we know*
    message_model_data = new_message.copy() # Start with the inserted data
    message_model_data["_id"] = message_id # Add the string ID

    # Ensure all fields required by the Pydantic 'Message' model are present
    # Example: If 'Message' requires 'admin_id'/'admin_name' even for non-admins, set them to None
    message_model_data.setdefault("admin_id", None)
    message_model_data.setdefault("admin_name", None)

    # Remove internal MongoDB '_id' if it was accidentally added (it shouldn't be in new_message)
    # message_model_data.pop("_id", None)

    logger.debug(f"Data prepared for Pydantic Message model: {message_model_data}")
    try:
        # Validate and create the Pydantic model instance
        message_obj = Message(**message_model_data)
        logger.debug(f"Successfully created Pydantic Message object for ID {message_id}")
        return message_obj
    except Exception as e: # Catch Pydantic validation errors
         logger.error(f"Pydantic validation failed creating Message object: {e}", exc_info=True)
         logger.error(f"Data passed to Pydantic: {message_model_data}")
         # Message *is* saved, but we can't return the correct object. Critical error.
         raise Exception("Message saved, but failed creating response object.") # -> 500

async def create_ticket(user_id: str, ticket_data: TicketCreate, initial_message: Optional[str] = None) -> Ticket:
    """
    Create a new ticket
    
    Args:
        user_id: The ID of the user creating the ticket
        ticket_data: The ticket data
        initial_message: Optional initial message
        
    Returns:
        The created ticket
    """
    db = await get_database()
    if db is None:
        raise Exception("Database connection not established. Please check your MongoDB configuration.")
    
    now = datetime.utcnow()
    new_ticket = {
        "user_id": user_id,
        "title": ticket_data.title,
        "status": TicketStatus.OPEN.value,
        "created_at": now,
        "updated_at": now,
        "messages": []  # Initialize empty messages array
    }
    
    result = await db.tickets.insert_one(new_ticket)
    ticket_id = str(result.inserted_id)
    
    if initial_message:
        await add_message(
            ticket_id=ticket_id,
            user_id=user_id,
            message_data=MessageCreate(content=initial_message),
            is_admin=False
        )
    
    # Get the created ticket and ensure the _id field is properly set
    ticket_data = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket_data:
        raise ValueError(f"Failed to create ticket with ID {ticket_id}")
    
    # Ensure _id is properly set as a string
    ticket_data["_id"] = str(ticket_data["_id"])
    
    # Create Ticket model instance with the data
    return Ticket(**ticket_data)

async def update_ticket(ticket_id: str, ticket_data: TicketUpdate) -> Optional[Ticket]:
    """
    Update a ticket
    
    Args:
        ticket_id: The ID of the ticket to update
        ticket_data: The updated ticket data
        
    Returns:
        The updated ticket if found, None otherwise
    """
    db = await get_database()
    if db is None:
        raise Exception("Database connection not established. Please check your MongoDB configuration.")
    
    update_data = {}
    if ticket_data.title is not None:
        update_data["title"] = ticket_data.title
    if ticket_data.status is not None:
        update_data["status"] = ticket_data.status.value
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return None
    
    return await get_ticket(ticket_id)

async def close_ticket(ticket_id: str) -> Optional[Ticket]:
    """
    Close a ticket
    
    Args: 
        ticket_id: The ID of the ticket to close
        
    Returns:
        The updated ticket if found, None otherwise
    """
    return await update_ticket(
        ticket_id=ticket_id,
        ticket_data=TicketUpdate(status=TicketStatus.CLOSED)
    )

async def reopen_ticket(ticket_id: str) -> Optional[Ticket]:
    """
    Reopen a closed ticket
    
    Args:
        ticket_id: The ID of the ticket to reopen
        
    Returns:
        The updated ticket if found, None otherwise
    """
    return await update_ticket(
        ticket_id=ticket_id,
        ticket_data=TicketUpdate(status=TicketStatus.OPEN)
    )