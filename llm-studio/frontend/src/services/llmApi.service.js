// src/services/llmApi.service.js
import axios from 'axios';
import { API_URL } from '../config';

class LLMApiService {
  constructor() {
    this.baseUrl = `${API_URL}/llm-manager`;
  }

  // Get all available LLM models
  async getAllLLMs() {
    try {
      console.log('Requesting LLMs from:', `${this.baseUrl}/models`);
      const response = await axios.get(`${this.baseUrl}/models`);
      console.log('LLM response received:', response.data);
      
      // Check if the response data has the expected structure
      if (!response.data || typeof response.data !== 'object') {
        console.error('Unexpected response format:', response.data);
        return []; // Return empty array instead of throwing error
      }
      
      const llmsData = Object.entries(response.data).map(([id, details]) => ({
        id,
        name: details.id || id,
        description: details.type ? `${details.type} model (${(details.size_mb / 1024).toFixed(1)}GB)` : 'Local model',
        tokenLimit: details.context_window || 2048,
        costPer1kTokens: "$0.00",
        status: details.status || "active",
        provider: details.type || "Local"
      }));
      
      return llmsData;
    } catch (error) {
      console.error('Error fetching LLMs:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      throw new Error('Failed to fetch LLMs');
    }
  }

  async createConversation(modelId, conversationId = null) {
    try {
      const response = await axios.post(`${this.baseUrl}/conversation`, null, {
        params: {
          model_id: modelId,
          conversation_id: conversationId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }
  

  // Get conversation history
  async getConversationHistory(conversationId) {
    try {
      const response = await axios.get(`${this.baseUrl}/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversation history:`, error);
      throw new Error(`Failed to fetch conversation history`);
    }
  }

  // Reset a conversation
  async resetConversation(conversationId) {
    try {
      const response = await axios.post(`${this.baseUrl}/conversation/${conversationId}/reset`);
      return response.data;
    } catch (error) {
      console.error(`Error resetting conversation:`, error);
      throw new Error(`Failed to reset conversation`);
    }
  }

  // Send a message to a conversation
  async sendMessage(conversationId, message) {
    try {
      const response = await axios.post(`${this.baseUrl}/chat`, {
        conversation_id: conversationId,
        message: message
      });
      return response.data;
    } catch (error) {
      console.error(`Error sending message:`, error);
      throw new Error(`Failed to send message`);
    }
  }

  // Add a new LLM model (technician/admin only)
  async addModel(modelData) {
    try {
      const response = await axios.post(`${this.baseUrl}/models`, modelData);
      return response.data;
    } catch (error) {
      console.error(`Error adding model:`, error);
      throw new Error(`Failed to add model`);
    }
  }

  // Delete an LLM model (technician/admin only)
  async deleteModel(modelId) {
    try {
      const response = await axios.delete(`${this.baseUrl}/models/${modelId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting model:`, error);
      throw new Error(`Failed to delete model`);
    }
  }

  // Health check for the LLM Manager service
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error(`LLM Manager health check failed:`, error);
      throw new Error(`LLM Manager service is not healthy`);
    }
  }
}

export const llmApiService = new LLMApiService();
export default LLMApiService;