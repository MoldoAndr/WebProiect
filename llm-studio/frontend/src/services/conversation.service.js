let mockConversations = [
  {
    id: 1,
    title: 'Understanding Quantum Computing',
    llm_id: 2,
    created_at: '2025-02-01T14:30:00',
    updated_at: '2025-02-01T15:45:00',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'Can you explain quantum computing in simple terms?',
        timestamp: '2025-02-01T14:30:10'
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Quantum computing uses quantum bits or "qubits" that can represent both 0 and 1 simultaneously, unlike classical bits which can only be either 0 or 1. This property, called superposition, allows quantum computers to process a vast number of possibilities at once. Another key feature is entanglement, where qubits become interconnected and the state of one instantly affects another, regardless of distance. These properties give quantum computers the potential to solve certain complex problems much faster than classical computers, particularly in areas like cryptography, optimization, and simulating quantum systems.',
        timestamp: '2025-02-01T14:30:45'
      }
    ]
  }
];

// Mock user stats
const mockUserStats = {
  totalConversations: 1,
  totalMessages: 2,
  favoriteModel: 'GPT-4',
  averageResponseTime: 0.8
};

class ConversationService {
  async getUserConversations() {
    // In a real implementation, you'd fetch from API
    return mockConversations;
  }

  async getConversation(id) {
    return mockConversations.find(conv => conv.id === id);
  }

  async createConversation(data) {
    const newConversation = {
      id: Date.now(), // Use timestamp as unique ID
      title: data.title || 'New Conversation',
      llm_id: data.llm_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: []
    };
    
    mockConversations = [newConversation, ...mockConversations];
    return newConversation;
  }

  async sendMessage(data) {
    const { conversation_id, message } = data;
    const conversation = mockConversations.find(conv => conv.id === conversation_id);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    // Simulate a delay for AI response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add AI response (mock)
    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: `This is a simulated response to: "${message}"`,
      timestamp: new Date().toISOString()
    };
    
    // Update the conversation
    conversation.messages = [...conversation.messages, userMessage, aiMessage];
    conversation.updated_at = new Date().toISOString();
    
    return conversation;
  }

  async getUserStats() {
    return mockUserStats;
  }
}

export const conversationService = new ConversationService();
export default ConversationService;