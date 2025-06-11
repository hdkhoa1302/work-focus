// Polyfill global object for libraries expecting Node.js global
(window as any).global = window;
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Đảm bảo DOM đã sẵn sàng trước khi render
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing React');
  const container = document.getElementById('root');
  if (container) {
    console.log('Root element found, rendering App');
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.error('Root element not found');
  }
}); 