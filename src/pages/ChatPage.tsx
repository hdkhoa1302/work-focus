import React from 'react';
import ChatWidget from '../components/ChatWidget';

const ChatPage: React.FC = () => {
  return (
    <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
      <ChatWidget fullPage={true} />
    </div>
  );
};

export default ChatPage; 