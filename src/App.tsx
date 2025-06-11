import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TimerCard from './components/TimerCard';
import TasksPage from './pages/TasksPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-2xl font-semibold text-gray-800">FocusTrack</h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-4">
          <TimerCard />
          <nav className="bg-white shadow rounded p-4 mb-4 flex space-x-4">
            <Link to="/" className="text-gray-700 hover:text-blue-500">Dashboard</Link>
            <Link to="/tasks" className="text-gray-700 hover:text-blue-500">Tasks</Link>
            <Link to="/reports" className="text-gray-700 hover:text-blue-500">Reports</Link>
            <Link to="/settings" className="text-gray-700 hover:text-blue-500">Settings</Link>
          </nav>
          <main className="bg-white rounded p-4 shadow">
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