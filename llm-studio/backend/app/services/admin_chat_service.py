from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import get_database
from app.models.admin_chat import Ticket, TicketCreate, TicketUpdate, Message, MessageCreate, TicketStatus

async def get_user_tickets(user_id: str) -> List[Ticket]:
    """
    Get all tickets for a user
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of tickets
    """
    db = await get_database()
    
    cursor = db.tickets.find({"user_id": user_id}).sort("updated_at", -1)
    tickets = []
    
    async for ticket_data in cursor:
        ticket_data["id"] = str(ticket_data.pop("_id"))
        
        messages_cursor = db.admin_messages.find({"ticket_id": ticket_data["id"]}).sort("created_at", 1)
        messages = []
        
        async for message_data in messages_cursor:
            message_data["id"] = str(message_data.pop("_id"))
            messages.append(Message(**message_data))
        
        ticket_data["messages"] = messages
        tickets.append(Ticket(**ticket_data))
    
    return tickets

async def get_admin_tickets(status: Optional[TicketStatus] = None) -> List[Ticket]:
    """
    Get all tickets for admin view, optionally filtered by status
    
    Args:
        status: Optional status filter
        
    Returns:
        List of tickets
    """
    db = await get_database()
    
    query = {}
    if status:
        query["status"] = status.value
    
    cursor = db.tickets.find(query).sort("updated_at", -1)
    tickets = []
    
    async for ticket_data in cursor:
        ticket_data["id"] = str(ticket_data.pop("_id"))
        
        messages_cursor = db.admin_messages.find({"ticket_id": ticket_data["id"]}).sort("created_at", 1)
        messages = []
        
        async for message_data in messages_cursor:
            message_data["id"] = str(message_data.pop("_id"))
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
    ticket_data = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    
    if not ticket_data:
        return None
    
    ticket_data["id"] = str(ticket_data.pop("_id"))
    
    messages_cursor = db.admin_messages.find({"ticket_id": ticket_id}).sort("created_at", 1)
    messages = []
    
    async for message_data in messages_cursor:
        message_data["id"] = str(message_data.pop("_id"))
        messages.append(Message(**message_data))
    
    ticket_data["messages"] = messages
    return Ticket(**ticket_data)

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
    
    now = datetime.utcnow()
    new_ticket = {
        "user_id": user_id,
        "title": ticket_data.title,
        "status": TicketStatus.OPEN.value,
        "created_at": now,
        "updated_at": now
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
    
    return await get_ticket(ticket_id)

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

async def add_message(ticket_id: str, user_id: str, message_data: MessageCreate, is_admin: bool = False, admin_id: Optional[str] = None, admin_name: Optional[str] = None) -> Message:
    """
    Add a message to a ticket
    
    Args:
        ticket_id: The ID of the ticket
        user_id: The ID of the user sending the message
        message_data: The message data
        is_admin: Whether the message is from an admin
        admin_id: Optional admin ID if the message is from an admin
        admin_name: Optional admin name if the message is from an admin
        
    Returns:
        The created message
    """
    db = await get_database()
    
    ticket = await get_ticket(ticket_id)
    if not ticket:
        raise ValueError(f"Ticket with ID {ticket_id} not found")
    
    now = datetime.utcnow()
    new_message = {
        "ticket_id": ticket_id,
        "user_id": user_id,
        "content": message_data.content,
        "is_admin": is_admin,
        "created_at": now
    }
    
    if is_admin:
        new_message["admin_id"] = admin_id
        new_message["admin_name"] = admin_name
    
    result = await db.admin_messages.insert_one(new_message)
    message_id = str(result.inserted_id)
    
    await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {"updated_at": now}}
    )
    
    if is_admin and ticket.status == TicketStatus.OPEN and len(ticket.messages) <= 1:
        await update_ticket(
            ticket_id=ticket_id,
            ticket_data=TicketUpdate(status=TicketStatus.IN_PROGRESS)
        )
    
    new_message["id"] = message_id
    return Message(**new_message)

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