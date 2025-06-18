// Polyfill global object for libraries expecting Node.js global
(window as any).global = window;
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './components/auth/AuthProvider';

// Import i18n config
import './i18n';

// Đảm bảo DOM đã sẵn sàng trước khi render
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing React');
  const container = document.getElementById('root');
  if (container) {
    console.log('Root element found, rendering App');
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </React.StrictMode>
    );
  } else {
    console.error('Root element not found');
  }
}); 