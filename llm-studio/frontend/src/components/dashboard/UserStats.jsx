import React from 'react';
import { FiMessageCircle, FiClock, FiStar, FiCpu } from 'react-icons/fi';

const UserStats = ({ stats }) => {
  return (
    <div className="stats-grid">
      <div className="stats-card">
        <div className="flex items-center mb-2">
          <FiMessageCircle className="mr-2 text-indigo-400" size={20} />
        </div>
        <div className="stats-value">{stats.totalConversations}</div>
      </div>
      
      <div className="stats-card">
        <div className="flex items-center mb-2">
          <FiStar className="mr-2 text-indigo-400" size={20} />
        </div>
        <div className="stats-value">{stats.totalMessages}</div>
      </div>
      
    </div>
  );
};

export default UserStats;