import React from 'react';
import { NavLink } from 'react-router-dom';
import { AiOutlineHome, AiOutlineSetting, AiOutlineProject, AiOutlineCheckSquare, AiOutlineBarChart } from 'react-icons/ai';
import useLanguage from '../hooks/useLanguage';

const Sidebar: React.FC = () => {
  const { t } = useLanguage();

  const menuItems = [
    { 
      path: '/', 
      icon: <AiOutlineHome className="w-6 h-6" />, 
      label: t('navigation.dashboard')
    },
    { 
      path: '/projects', 
      icon: <AiOutlineProject className="w-6 h-6" />, 
      label: t('navigation.projects')
    },
    { 
      path: '/reports', 
      icon: <AiOutlineBarChart className="w-6 h-6" />, 
      label: t('navigation.reports')
    },
    { 
      path: '/settings', 
      icon: <AiOutlineSetting className="w-6 h-6" />, 
      label: t('navigation.settings')
    }
  ];

  return (
    <div className="w-16 md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-200">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center md:justify-start px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        <span className="hidden md:block text-lg font-bold text-gray-900 dark:text-gray-100 ml-3">FocusTrack</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <div>{item.icon}</div>
            <span className="hidden md:block font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="hidden md:block text-xs text-gray-500 dark:text-gray-400 text-center">
          &copy; {new Date().getFullYear()} FocusTrack
        </div>
      </div>
    </div>
  );
};

export default Sidebar;