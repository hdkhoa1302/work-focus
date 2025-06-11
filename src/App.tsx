import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Dashboard, TasksPage, ReportsPage, SettingsPage } from './pages';
import TimerCard from './components/TimerCard';
import { AiOutlineMoon, AiOutlineSun } from 'react-icons/ai';

function App() {
  // Dark mode state
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  return (
    <Router>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
          <header className="bg-white shadow px-6 py-4 flex items-center justify-between dark:bg-gray-800">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">FocusTrack</h1>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {isDark ? <AiOutlineSun className="text-xl text-yellow-400" /> : <AiOutlineMoon className="text-xl text-gray-600" />}
            </button>
          </header>
          <div className="p-6 bg-gray-50 dark:bg-gray-800">
            <TimerCard />
          </div>
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App; 