import React from 'react';
import { FiMessageSquare, FiClock } from 'react-icons/fi';

const ConversationHistory = ({ conversations, selectedConversationId, onConversationSelect }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show date with year
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No conversations yet. Start a new one!
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map(conversation => (
        <div 
          key={conversation.id}
          className={`conversation-item ${selectedConversationId === conversation.id ? 'active' : ''}`}
          onClick={() => onConversationSelect(conversation.id)}
        >
          <div className="conversation-item-icon">
            <FiMessageSquare size={16} />
          </div>
          <div className="conversation-item-text">
            {conversation.title}
          </div>
          <div className="text-xs text-gray-500 flex items-center">
            <FiClock size={12} className="mr-1" />
            {formatDate(conversation.updated_at)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationHistory;