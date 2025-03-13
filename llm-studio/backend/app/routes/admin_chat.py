# app/api/routes/admin_chat.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.user import User
from app.models.admin_chat import TicketResponse, TicketCreate, TicketUpdate, MessageCreate, TicketStatus
from app.services.admin_chat_service import (
    get_user_tickets,
    get_admin_tickets,
    get_ticket,
    create_ticket,
    update_ticket,
    add_message,
    close_ticket,
    reopen_ticket
)
from app.core.security import get_current_user, get_admin_user

router = APIRouter()

# User routes

@router.get("/tickets", response_model=List[TicketResponse])
async def get_user_tickets_route(current_user: User = Depends(get_current_user)):
    """Get all tickets for the current user"""
    return await get_user_tickets(current_user.id)

@router.post("/tickets", response_model=TicketResponse)
async def create_ticket_route(
    ticket_data: TicketCreate, 
    initial_message: str = None,
    current_user: User = Depends(get_current_user)
):
    """Create a new ticket"""
    return await create_ticket(current_user.id, ticket_data, initial_message)

@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket_route(
    ticket_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific ticket"""
    ticket = await get_ticket(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check if the user has access to this ticket
    if ticket.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this ticket")
    
    return ticket

@router.post("/tickets/{ticket_id}/messages")
async def add_user_message(
    ticket_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Add a message to a ticket as a user"""
    ticket = await get_ticket(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check if the user has access to this ticket
    if ticket.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this ticket")
    
    # Check if the ticket is closed
    if ticket.status == TicketStatus.CLOSED:
        # If the ticket is closed and the user tries to send a message, reopen it
        await reopen_ticket(ticket_id)
    
    try:
        message = await add_message(
            ticket_id=ticket_id,
            user_id=current_user.id,
            message_data=message_data,
            is_admin=False
        )
        return {"message": "Message added successfully", "message_id": message.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin routes

@router.get("/admin/tickets", response_model=List[TicketResponse])
async def get_all_tickets(
    status: TicketStatus = None,
    current_user: User = Depends(get_admin_user)
):
    """Get all tickets (admin only)"""
    return await get_admin_tickets(status)

@router.put("/admin/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket_route(
    ticket_id: str,
    ticket_data: TicketUpdate,
    current_user: User = Depends(get_admin_user)
):
    """Update a ticket (admin only)"""
    ticket = await update_ticket(ticket_id, ticket_data)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket

@router.post("/admin/tickets/{ticket_id}/messages")
async def add_admin_message(
    ticket_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_admin_user)
):
    """Add a message to a ticket as an admin"""
    ticket = await get_ticket(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    try:
        message = await add_message(
            ticket_id=ticket_id,
            user_id=current_user.id,
            message_data=message_data,
            is_admin=True,
            admin_id=current_user.id,
            admin_name=current_user.full_name or current_user.username
        )
        return {"message": "Message added successfully", "message_id": message.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/tickets/{ticket_id}/close")
async def close_ticket_route(
    ticket_id: str,
    current_user: User = Depends(get_admin_user)
):
    """Close a ticket (admin only)"""
    ticket = await close_ticket(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket closed successfully"}

@router.post("/admin/tickets/{ticket_id}/reopen")
async def reopen_ticket_route(
    ticket_id: str,
    current_user: User = Depends(get_admin_user)
):
    """Reopen a ticket (admin only)"""
    ticket = await reopen_ticket(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket reopened successfully"}