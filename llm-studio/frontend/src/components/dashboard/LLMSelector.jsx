// src/components/dashboard/LLMSelector.jsx
import React from "react";
import { FiCpu, FiDollarSign, FiMaximize } from "react-icons/fi";

const LLMSelector = ({ llms, selectedLLM, onLLMSelect }) => {
  if (!llms || llms.length === 0) {
    return (
      <div className="no-llms-message">
        No LLM models available. Please contact your administrator.
      </div>
    );
  }

  return (
    <div className="w-full">
      <select
        className="llm-selector"
        value={selectedLLM?.id || ""}
        onChange={(e) => {
          const llmId = e.target.value;
          const llm = llms.find((l) => l.id === llmId);
          onLLMSelect(llm);
        }}
        aria-label="Select LLM model"
      >
        <option value="" disabled>
          Select an LLM model
        </option>
        {llms.map((llm) => (
          <option key={llm.id} value={llm.id}>
            {llm.id} - {llm.description ? llm.description : "AI model"}
          </option>
        ))}
      </select>

      {selectedLLM && (
        <div className="llm-info">
          <div className="llm-info-item">
            <span className="llm-info-value">
              {typeof selectedLLM.tokenLimit === "number"
                ? selectedLLM.tokenLimit.toLocaleString()
                : selectedLLM.tokenLimit || "Unknown"}{" "}
              tokens
            </span>
          </div>
          <div className="llm-info-item">
            <FiDollarSign size={18} className="mr-1 text-indigo-400" />
            <span className="llm-info-value">
              {typeof selectedLLM.costPer1kTokens === "string"
                ? selectedLLM.costPer1kTokens
                : `$${selectedLLM.costPer1kTokens || "0.001"}`}
              /1k tokens
            </span>
          </div>
          {selectedLLM.provider && (
            <div className="llm-info-item">
              <FiCpu size={18} className="mr-1 text-indigo-400" />
              <span className="llm-info-value">{selectedLLM.provider}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LLMSelector;
