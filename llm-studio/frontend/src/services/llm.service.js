// Mock LLM service for development
const mockLLMs = [
  {
    id: 1,
    name: 'GPT-3.5 Turbo',
    description: 'A versatile and fast model for general-purpose use',
    tokenLimit: 4096,
    costPer1kTokens: '$0.001',
    status: 'active'
  },
  {
    id: 2,
    name: 'GPT-4',
    description: 'Advanced reasoning capabilities and broader knowledge',
    tokenLimit: 8192,
    costPer1kTokens: '$0.03',
    status: 'active'
  },
  {
    id: 3,
    name: 'Claude 3',
    description: 'Well-balanced between intelligence and speed',
    tokenLimit: 100000,
    costPer1kTokens: '$0.01',
    status: 'active'
  }
];

class LLMService {
  async getAllLLMs() {
    // In a real implementation, you'd fetch from API
    return mockLLMs;
  }

  async getLLMById(id) {
    return mockLLMs.find(llm => llm.id === id);
  }
}

export const llmService = new LLMService();
export default LLMService;