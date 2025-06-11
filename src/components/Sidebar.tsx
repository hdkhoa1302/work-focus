import React from 'react';
import { NavLink } from 'react-router-dom';
import { AiOutlineDashboard, AiOutlineUnorderedList, AiOutlineClockCircle, AiOutlineBarChart, AiOutlineSetting } from 'react-icons/ai';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <AiOutlineDashboard /> },
  { to: '/tasks', label: 'Tasks', icon: <AiOutlineUnorderedList /> },
  { to: '/reports', label: 'Reports', icon: <AiOutlineBarChart /> },
  { to: '/settings', label: 'Settings', icon: <AiOutlineSetting /> },
];

const Sidebar: React.FC = () => (
  <aside className="w-64 bg-white border-r dark:bg-gray-800 h-screen flex flex-col flex-shrink-0">
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">FocusTrack</h2>
    </div>
    <nav className="mt-6 flex-1 overflow-auto">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isActive ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`
          }
        >
          <span className="text-lg mr-3">{item.icon}</span>
          <span className="text-sm font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
    <div className="mt-auto p-6">
      <NavLink to="/timer" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
        <span className="text-lg mr-3"><AiOutlineClockCircle /></span>
        <span className="text-sm font-medium">Timer</span>
      </NavLink>
    </div>
  </aside>
);

export default Sidebar; 