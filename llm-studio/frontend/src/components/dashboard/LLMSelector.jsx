import React from 'react';
import { FiCpu, FiDollarSign, FiMaximize } from 'react-icons/fi';

const LLMSelector = ({ llms, selectedLLM, onLLMSelect }) => {
  return (
    <div className="w-full">
      <select
        className="llm-selector"
        value={selectedLLM?.id || ''}
        onChange={(e) => {
          const llmId = parseInt(e.target.value);
          const llm = llms.find(l => l.id === llmId);
          onLLMSelect(llm);
        }}
        aria-label="Select LLM model"
      >
        <option value="" disabled>Select an LLM model</option>
        {llms.map(llm => (
          <option key={llm.id} value={llm.id}>
            {llm.name} - {llm.description}
          </option>
        ))}
      </select>
      
      {selectedLLM && (
        <div className="llm-info">
          <div className="llm-info-item">
            <FiMaximize size={14} className="mr-1 text-indigo-400" />
            <span className="llm-info-label">Token Limit:</span>
            <span className="llm-info-value">{selectedLLM.tokenLimit.toLocaleString()}</span>
          </div>
          <div className="llm-info-item">
            <FiDollarSign size={14} className="mr-1 text-indigo-400" />
            <span className="llm-info-label" size={10} >Cost:</span>
            <span className="llm-info-value" size={10} >{selectedLLM.costPer1kTokens}/1k tokens</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMSelector;