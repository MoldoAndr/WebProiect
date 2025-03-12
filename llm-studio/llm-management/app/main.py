"""
Main entry point for the LLM Management API service.
This service manages LLM Docker containers.
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.models.llm import LLM, LLMCreate, LLMUpdate
from app.models.prompt import PromptRequest, PromptResponse
from app.services.docker_service import docker_service
from typing import List, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="LLM Management API",
    description="API for managing LLM Docker containers",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost",
    "https://localhost",
    "http://localhost:80",
    "http://localhost:443",
    "http://localhost:3000",
    "http://frontend:3000",
    "http://nginx",
    "https://nginx",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("Starting LLM Management service")
    await connect_to_mongo()
    await docker_service.init_docker_client()

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Shutting down LLM Management service")
    await close_mongo_connection()
    await docker_service.close_docker_client()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/llms", response_model=List[LLM])
async def get_llms():
    """Get all available LLMs"""
    logger.info("Getting all LLMs")
    return await docker_service.get_all_llms()

@app.get("/llms/{llm_id}", response_model=LLM)
async def get_llm(llm_id: str):
    """Get a specific LLM by ID"""
    logger.info(f"Getting LLM with ID: {llm_id}")
    llm = await docker_service.get_llm_by_id(llm_id)
    if not llm:
        raise HTTPException(status_code=404, detail="LLM not found")
    return llm

@app.post("/llms", response_model=LLM)
async def create_llm(llm_in: LLMCreate):
    """Create a new LLM container"""
    logger.info(f"Creating new LLM: {llm_in.name}")
    try:
        return await docker_service.create_llm(llm_in)
    except Exception as e:
        logger.error(f"Error creating LLM: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/llms/{llm_id}", response_model=LLM)
async def update_llm(llm_id: str, llm_in: LLMUpdate):
    """Update an existing LLM container"""
    logger.info(f"Updating LLM with ID: {llm_id}")
    llm = await docker_service.update_llm(llm_id, llm_in)
    if not llm:
        raise HTTPException(status_code=404, detail="LLM not found")
    return llm

@app.delete("/llms/{llm_id}")
async def delete_llm(llm_id: str):
    """Delete an LLM container"""
    logger.info(f"Deleting LLM with ID: {llm_id}")
    success = await docker_service.delete_llm(llm_id)
    if not success:
        raise HTTPException(status_code=404, detail="LLM not found")
    return {"detail": "LLM deleted successfully"}

@app.post("/llms/{llm_id}/prompt", response_model=PromptResponse)
async def send_prompt(llm_id: str, prompt_req: PromptRequest):
    """Send a prompt to an LLM"""
    logger.info(f"Sending prompt to LLM with ID: {llm_id}")
    llm = await docker_service.get_llm_by_id(llm_id)
    if not llm:
        raise HTTPException(status_code=404, detail="LLM not found")
        
    try:
        response = await docker_service.send_prompt_to_llm(
            llm_id, 
            prompt_req.prompt, 
            prompt_req.conversation_id,
            prompt_req.system_prompt,
            prompt_req.parameters
        )
        return response
    except Exception as e:
        logger.error(f"Error sending prompt to LLM: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
