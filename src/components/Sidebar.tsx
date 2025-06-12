import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  AiOutlineDashboard, 
  AiOutlineUnorderedList, 
  AiOutlineBarChart, 
  AiOutlineSetting,
  AiOutlineClockCircle,
  AiOutlineFire
} from 'react-icons/ai';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <AiOutlineDashboard />, color: 'text-blue-500' },
  { to: '/tasks', label: 'Tasks', icon: <AiOutlineUnorderedList />, color: 'text-green-500' },
  { to: '/reports', label: 'Reports', icon: <AiOutlineBarChart />, color: 'text-purple-500' },
  { to: '/settings', label: 'Settings', icon: <AiOutlineSetting />, color: 'text-gray-500' },
];

const Sidebar: React.FC = () => (
  <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-200">
    {/* Logo Section */}
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <AiOutlineFire className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">FocusTrack</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Stay Productive</p>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-4 py-6 space-y-2">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group ${
              isActive ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`text-xl mr-4 transition-colors duration-200 ${isActive ? item.color : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Quick Timer Access */}
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center space-x-3">
          <AiOutlineClockCircle className="text-2xl" />
          <div>
            <p className="font-semibold">Quick Timer</p>
            <p className="text-xs opacity-90">Start focusing now</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
);

export default Sidebar;