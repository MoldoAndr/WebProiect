# app/routes/admin_chat.py
import logging # <--- Import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId # Import ObjectId if you need to validate it here
from pymongo.errors import OperationFailure # <--- ADD THIS IMPORT
from app.models.admin_chat import Ticket, TicketCreate, TicketUpdate, Message, MessageCreate, TicketStatus
from app.services import admin_chat_service # Adjust import path as needed
from app.models.user import User # Assuming you have a User model defined in app/models/user.py

# --- Import security functions ---
from app.core.security import get_current_user, check_admin_access
# If you need technician access later, import check_technician_access as well
# -------------------------------

# --- Setup Logger ---
logger = logging.getLogger(__name__)
# --------------------

router = APIRouter()

# Helper function for ID validation (optional but good practice)
def validate_object_id(id_str: str, id_name: str = "ID"):
    try:
        return ObjectId(id_str)
    except Exception:
        logger.warning(f"Invalid ObjectId format provided for {id_name}: {id_str}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {id_name} format")

# === User Routes ===

@router.get("/tickets", response_model=List[Ticket])
async def read_user_tickets(
    current_user: User = Depends(get_current_user)
    
):
    logger.info(f"Loaded user: {current_user}")
    """
    Get all tickets for the currently logged-in user.
    """
    logger.info(f"Attempting to read tickets for user: {current_user.username} (ID: {current_user.id})")
    if not current_user.id:
         logger.error(f"User ID missing for authenticated user {current_user.username}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User ID not found in token")
    try:
        user_id_str = str(current_user.id)
        logger.debug(f"Calling admin_chat_service.get_user_tickets for user_id: {user_id_str}")
        tickets = await admin_chat_service.get_user_tickets(user_id=user_id_str)
        logger.info(f"Successfully retrieved {len(tickets)} tickets for user: {current_user.username}")
        return tickets
    except Exception as e:
        logger.error(f"Failed to retrieve tickets for user {current_user.username} (ID: {current_user.id}): {e}", exc_info=True) # Log with traceback
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user tickets")


@router.post("/tickets", response_model=Ticket, status_code=status.HTTP_201_CREATED)
async def create_new_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user) # Use the dependency
):
    """
    Create a new ticket for the currently logged-in user.
    """
    logger.info(f"User {current_user.username} (ID: {current_user.id}) attempting to create ticket with title: '{ticket_in.title}'")
    try:
        user_id_str = str(current_user.id)
        logger.debug(f"Calling admin_chat_service.create_ticket for user_id: {user_id_str}")
        new_ticket = await admin_chat_service.create_ticket(
            user_id=user_id_str,
            ticket_data=ticket_in,
            initial_message=ticket_in.initial_message
        )
        logger.info(f"Successfully created ticket ID: {new_ticket.id} for user: {current_user.username}")
        return new_ticket
    except ValueError as e:
        logger.warning(f"Value error creating ticket for user {current_user.username}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create ticket for user {current_user.username}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create ticket")


@router.get("/tickets/{ticket_id}", response_model=Ticket)
async def read_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user) # Use the dependency
):
    """
    Get a specific ticket by ID. Users can only access their own tickets
    (or admins/technicians might have broader access - adjust as needed).
    """
    logger.info(f"User {current_user.username} (ID: {current_user.id}) attempting to read ticket_id: {ticket_id}")
    validate_object_id(ticket_id, "Ticket ID") # Validate ID format early
    try:
        logger.debug(f"Calling admin_chat_service.get_ticket for ticket_id: {ticket_id}")
        ticket = await admin_chat_service.get_ticket(ticket_id)
        if not ticket:
            logger.warning(f"Ticket not found: {ticket_id} (requested by user {current_user.username})")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        logger.debug(f"Ticket {ticket_id} found. Checking authorization for user {current_user.username} (Role: {current_user.role}). Ticket owner: {ticket.user_id}")
        # Authorization check
        user_id_str = str(current_user.id)
        if ticket.user_id != user_id_str and current_user.role not in ["admin", "technician"]:
            logger.warning(f"Authorization failed for user {current_user.username} trying to access ticket {ticket_id} owned by {ticket.user_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this ticket")

        logger.info(f"Successfully authorized and retrieved ticket {ticket_id} for user {current_user.username}")
        return ticket
    except HTTPException as e: # Re-raise HTTPExceptions directly
        raise e
    except ValueError as e: # Catch potential errors from service layer (if not caught earlier)
         logger.warning(f"Value error retrieving ticket {ticket_id} for user {current_user.username}: {e}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data or ticket ID format")


# In admin_chat.py

@router.post("/tickets/{ticket_id}/messages", response_model=Message)
async def add_user_message_to_ticket(
    ticket_id: str,
    message_in: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) attempting to add message to ticket_id: {ticket_id}")
    validate_object_id(ticket_id, "Ticket ID") # Keep this early validation

    try:
        user_id_str = str(current_user.id)
        logger.debug(f"Calling admin_chat_service.add_message for ticket {ticket_id} by user {user_id_str}")

        new_message = await admin_chat_service.add_message(
            ticket_id=ticket_id,
            user_id=user_id_str,
            message_data=message_in,
            is_admin=False,
        )

        logger.info(f"Successfully added message ID {new_message.id} to ticket {ticket_id} by user {current_user.username}")
        return new_message

    except ValueError as e:
        # Map specific ValueErrors raised from add_message to HTTP status codes
        err_detail = str(e)
        logger.warning(f"ValueError adding message to ticket {ticket_id}: {err_detail}", exc_info=False) # No need for full stack trace for ValueErrors
        if "not found" in err_detail:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_detail)
        elif "closed" in err_detail:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_detail)
        elif "Not authorized" in err_detail:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=err_detail)
        else: # Other ValueErrors
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_detail)
    except HTTPException as e:
         # Re-raise HTTP exceptions from validation etc.
         raise e
    except OperationFailure as of:
        # Catch specific DB operation failures if not handled lower down
        logger.error(f"Database OperationFailure for ticket {ticket_id} in route: {of.details}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database operation failed.")
    except Exception as e:
         # Catch unexpected errors (like DB connection, Pydantic validation errors raised from service)
         logger.error(f"Unexpected failure adding message to ticket {ticket_id}: {e}", exc_info=True)

# === Admin Routes ===

# Define the dependency to be used for all admin routes
admin_only = Depends(check_admin_access) # check_admin_access already includes get_current_user

@router.get("/admin/tickets", response_model=List[Ticket], dependencies=[admin_only])
async def read_all_tickets_admin(
    status: Optional[TicketStatus] = Query(None),
    # Get user from dependency if needed later, but check_admin_access already does the check
    # current_admin: User = Depends(check_admin_access)
):
    """
    Get all tickets (admin view), optionally filtered by status.
    Requires admin privileges.
    """
    logger.info(f"Admin attempting to read all tickets. Filter status: {status}")
    try:
        logger.debug(f"Calling admin_chat_service.get_admin_tickets with status filter: {status}")
        tickets = await admin_chat_service.get_admin_tickets(status=status)
        logger.info(f"Admin successfully retrieved {len(tickets)} tickets (filter: {status})")
        return tickets
    except Exception as e:
        logger.error(f"Admin failed to retrieve all tickets (filter: {status}): {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve tickets for admin")


@router.put("/admin/tickets/{ticket_id}", response_model=Ticket, dependencies=[admin_only])
async def update_ticket_admin(
    ticket_id: str,
    ticket_data: TicketUpdate,
    current_admin: User = Depends(check_admin_access) # Get admin user for logging
):
    """
    Update a ticket's title or status (admin action).
    Requires admin privileges.
    """
    logger.info(f"Admin {current_admin.username} attempting to update ticket_id: {ticket_id} with data: {ticket_data.dict()}")
    validate_object_id(ticket_id, "Ticket ID")
    try:
        logger.debug(f"Calling admin_chat_service.update_ticket for ticket_id: {ticket_id}")
        updated_ticket = await admin_chat_service.update_ticket(ticket_id, ticket_data)
        if not updated_ticket:
            logger.warning(f"Admin {current_admin.username} update call for ticket {ticket_id} returned None. Checking existence.")
            # Check if the ticket existed at all
            ticket_exists = await admin_chat_service.get_ticket(ticket_id) # Reuse service layer logic
            if not ticket_exists:
                logger.warning(f"Ticket {ticket_id} not found during update attempt by admin {current_admin.username}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
            else:
                 logger.warning(f"Ticket {ticket_id} exists but update by admin {current_admin.username} resulted in no changes or failed silently.")
                 # Return current state or raise error - let's raise 400 suggesting no change/issue
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket found but could not be updated (no changes or error)")
        logger.info(f"Admin {current_admin.username} successfully updated ticket {ticket_id}")
        return updated_ticket
    except ValueError: # Catch invalid ObjectId format (already handled by validate_object_id, but belt-and-suspenders)
         logger.warning(f"Invalid ticket ID format during update by admin {current_admin.username}: {ticket_id}")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Ticket ID format")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Admin {current_admin.username} failed to update ticket {ticket_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update ticket")


@router.post("/admin/tickets/{ticket_id}/messages", response_model=Message)
async def add_admin_message_to_ticket(
    ticket_id: str,
    message_in: MessageCreate,
    current_admin: User = Depends(check_admin_access) # Inject the admin user object
):
    """
    Add a message from an admin to a ticket.
    Requires admin privileges.
    """
    logger.info(f"Admin {current_admin.username} (ID: {current_admin.id}) attempting to add message to ticket_id: {ticket_id}")
    validate_object_id(ticket_id, "Ticket ID")
    try:
        # Get the ticket to associate message correctly and check status
        logger.debug(f"Checking status for ticket {ticket_id} before admin adds message.")
        ticket = await admin_chat_service.get_ticket(ticket_id)
        if not ticket:
             logger.warning(f"Ticket {ticket_id} not found when admin {current_admin.username} tried to add message.")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        if ticket.status == TicketStatus.CLOSED:
             logger.warning(f"Admin {current_admin.username} attempt to add message to closed ticket {ticket_id}")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add messages to a closed ticket")

        # Add message
        logger.debug(f"Calling admin_chat_service.add_message as admin for ticket {ticket_id}")
        admin_name = current_admin.full_name or current_admin.username
        new_message = await admin_chat_service.add_message(
            ticket_id=ticket_id,
            user_id=ticket.user_id, # Associate message with the ticket's original user
            message_data=message_in,
            is_admin=True,
            admin_id=str(current_admin.id), # Get ID from the authenticated admin user
            admin_name=admin_name
        )
        logger.info(f"Admin {current_admin.username} successfully added message ID {new_message.id} to ticket {ticket_id}")
        return new_message
    except ValueError as e:
        logger.warning(f"Value error adding admin message to ticket {ticket_id} by {current_admin.username}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Admin {current_admin.username} failed to add message to ticket {ticket_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")


@router.post("/admin/tickets/{ticket_id}/close", response_model=Ticket, dependencies=[admin_only])
async def close_ticket_admin(
    ticket_id: str,
    current_admin: User = Depends(check_admin_access) # Get admin user for logging
    ):
    """
    Close a ticket (admin action).
    Requires admin privileges.
    """
    logger.info(f"Admin {current_admin.username} attempting to close ticket_id: {ticket_id}")
    validate_object_id(ticket_id, "Ticket ID")
    try:
        logger.debug(f"Calling admin_chat_service.close_ticket for ticket_id: {ticket_id}")
        closed_ticket = await admin_chat_service.close_ticket(ticket_id)
        if not closed_ticket:
            logger.warning(f"Admin {current_admin.username} close call for ticket {ticket_id} returned None. Checking existence/status.")
            ticket_exists = await admin_chat_service.get_ticket(ticket_id)
            if not ticket_exists:
                 logger.warning(f"Ticket {ticket_id} not found during close attempt by admin {current_admin.username}")
                 raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
            else:
                 logger.warning(f"Ticket {ticket_id} exists but could not be closed by admin {current_admin.username}. Status: {ticket_exists.status}")
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket could not be closed, may already be closed or error occurred.")

        logger.info(f"Admin {current_admin.username} successfully closed ticket {ticket_id}")
        return closed_ticket
    except ValueError: # Should be caught by validate_object_id
         logger.warning(f"Invalid ticket ID format during close by admin {current_admin.username}: {ticket_id}")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Ticket ID format")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Admin {current_admin.username} failed to close ticket {ticket_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to close ticket")


@router.post("/admin/tickets/{ticket_id}/reopen", response_model=Ticket, dependencies=[admin_only])
async def reopen_ticket_admin(
    ticket_id: str,
    current_admin: User = Depends(check_admin_access) # Get admin user for logging
    ):
    """
    Reopen a closed ticket (admin action).
    Requires admin privileges.
    """
    logger.info(f"Admin {current_admin.username} attempting to reopen ticket_id: {ticket_id}")
    validate_object_id(ticket_id, "Ticket ID")
    try:
        # Explicitly check status before calling service (optional, good for logging)
        logger.debug(f"Checking status for ticket {ticket_id} before admin reopens.")
        ticket = await admin_chat_service.get_ticket(ticket_id)
        if not ticket:
            logger.warning(f"Ticket {ticket_id} not found during reopen attempt by admin {current_admin.username}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        if ticket.status != TicketStatus.CLOSED:
             logger.warning(f"Admin {current_admin.username} attempted to reopen ticket {ticket_id} which is not closed (Status: {ticket.status})")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket is not closed")

        logger.debug(f"Calling admin_chat_service.reopen_ticket for ticket_id: {ticket_id}")
        reopened_ticket = await admin_chat_service.reopen_ticket(ticket_id)
        if not reopened_ticket:
            logger.error(f"Admin {current_admin.username} reopen call for ticket {ticket_id} returned None unexpectedly.")
            # Re-fetch to check current state
            current_ticket_state = await admin_chat_service.get_ticket(ticket_id)
            if current_ticket_state and current_ticket_state.status != TicketStatus.OPEN:
                 logger.error(f"Failed to reopen ticket {ticket_id}. Current status is still {current_ticket_state.status}")
                 raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to reopen ticket. Current status: {current_ticket_state.status}")
            elif not current_ticket_state:
                 logger.error(f"Ticket {ticket_id} disappeared during reopen attempt by admin {current_admin.username}")
                 raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket disappeared during reopen attempt")
            logger.info(f"Ticket {ticket_id} was successfully reopened despite None return from service call (Verification check passed).")
            return current_ticket_state

        logger.info(f"Admin {current_admin.username} successfully reopened ticket {ticket_id}")
        return reopened_ticket
    except ValueError: # Should be caught by validate_object_id
        logger.warning(f"Invalid ticket ID format during reopen by admin {current_admin.username}: {ticket_id}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Ticket ID format")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Admin {current_admin.username} failed to reopen ticket {ticket_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reopen ticket")