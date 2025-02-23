import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Settings,
  Database,
  BookOpen,
  LayoutDashboard,
  Axe,
} from "lucide-react";
import styles from "./Dashboard.module.css";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

interface Message {
  type: 'text' | 'iframe';
  content: string;
}

const LLM_OPTIONS = ["GPT-4", "Claude-3", "Mistral-7B", "Llama-3"];

const LLMStudioDashboard: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { type: 'text', content: "Hello there!"},
    { type: 'iframe', content: "/Vortex.html" }
  ]);
  const [selectedLLM, setSelectedLLM] = useState(LLM_OPTIONS[0]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const navItems: NavItem[] = [
    { icon: <LayoutDashboard size={30} />, label: "", isActive: true },
    { icon: <Axe size={30} />, label: "" },
    { icon: <BookOpen size={30} />, label: "" },
    { icon: <Settings size={30} />, label: "" },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebarContent}>
        <nav className={styles.navigation}>
          {navItems.map((item, index) => (
            <div
              key={index}
              className={`${styles.navItem} ${
                item.isActive ? styles.active : ""
              }`}
            >
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h2>Dashboard</h2>
          <div className={styles.llmContainer}>
            <label><strong>Select LLM:</strong></label>
            <select
              className={styles.llmSelector}
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
            >
              {LLM_OPTIONS.map((llm) => (
                <option key={llm} value={llm}>
                  {llm}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className={styles.chatContainer}>
          <div className={styles.messageList}>
            {messages.map((message, index) => (
              <div key={index} className={styles.message}>
                {message.type === 'text' ? (
                  <p>{message.content}</p>
                ) : (
                  <iframe
                    src={message.content} 
                    style={{ width: "100%", height: "80vh", border: "none", margin:"none"}}
                    background-color:transparent
                    className={isInputFocused ? styles.fadeOut : ''}
                  />
                )}
              </div>
            ))}
          </div>
          <div className={styles.inputContainer}>
            <input
              type="text"
              placeholder="Type your message here..."
              className={styles.input}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
            <button className={styles.sendButton}>Send</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LLMStudioDashboard;