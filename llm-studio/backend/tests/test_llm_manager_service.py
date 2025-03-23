# tests/test_llm_manager_service.py
import pytest
import asyncio
from unittest.mock import patch, MagicMock

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.services.llm_manager_service import LLMManagerService

@pytest.fixture
def llm_service():
    service = LLMManagerService()
    service.base_url = "http://test-llm-api:5000"
    return service

@pytest.mark.asyncio
async def test_get_models(llm_service):
    # Mock response
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "phi2": {"id": "phi2", "type": "phi2", "size_mb": 2400},
        "tinyllama": {"id": "tinyllama", "type": "llama", "size_mb": 1100}
    }
    
    # Patch the httpx client
    with patch("httpx.AsyncClient.get", return_value=mock_response):
        result = await llm_service.get_models()
        
        # Verify results
        assert len(result) == 2
        assert "phi2" in result
        assert "tinyllama" in result
        assert result["phi2"]["size_mb"] == 2400

@pytest.mark.asyncio
async def test_create_conversation(llm_service):
    # Mock response
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"conversation_id": "test-conv-123"}
    
    # Patch the httpx client
    with patch("httpx.AsyncClient.post", return_value=mock_response):
        result = await llm_service.create_conversation("phi2")
        
        # Verify results
        assert result["conversation_id"] == "test-conv-123"

@pytest.mark.asyncio
async def test_send_message(llm_service):
    # Mock response
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "conversation_id": "test-conv-123",
        "response": "This is a test response"
    }
    
    # Patch the httpx client
    with patch("httpx.AsyncClient.post", return_value=mock_response):
        result = await llm_service.send_message("test-conv-123", "Hello")
        
        # Verify results
        assert result["conversation_id"] == "test-conv-123"
        assert result["response"] == "This is a test response"
