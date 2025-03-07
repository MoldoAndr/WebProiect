// src/components/dashboard/UserStats.jsx
import React from 'react';
import { FiMessageCircle, FiClock, FiStar, FiCpu } from 'react-icons/fi';

const UserStats = ({ stats }) => {
  return (
    <div className="stats-grid">
      <div className="stats-card">
        <div className="flex items-center mb-2">
          <FiMessageCircle className="mr-2 text-indigo-400" size={16} />
          <div className="stats-label">Conversations</div>
        </div>
        <div className="stats-value">{stats.totalConversations}</div>
      </div>
      
      <div className="stats-card">
        <div className="flex items-center mb-2">
          <FiStar className="mr-2 text-indigo-400" size={16} />
          <div className="stats-label">Messages</div>
        </div>
        <div className="stats-value">{stats.totalMessages}</div>
      </div>
      
      <div className="stats-card">
        <div className="flex items-center mb-2">
          <FiCpu className="mr-2 text-indigo-400" size={16} />
          <div className="stats-label">Favorite Model</div>
        </div>
        <div className="stats-value text-sm">{stats.favoriteModel}</div>
      </div>
      
      <div className="stats-card">
        <div className="flex items-center mb-2">
          <FiClock className="mr-2 text-indigo-400" size={16} />
          <div className="stats-label">Avg. Response</div>
        </div>
        <div className="stats-value">{stats.averageResponseTime}s</div>
      </div>
    </div>
  );
};

export default UserStats;