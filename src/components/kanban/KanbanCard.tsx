import React, { useState } from 'react';
import { Task } from '../../services/api';
import { AiOutlineDelete, AiOutlineEdit, AiOutlineCalendar, AiOutlineFire, AiOutlineFlag } from 'react-icons/ai';
import { FiPlay, FiClock } from 'react-icons/fi';

interface KanbanCardProps {
  task: Task;
  progress: {
    completed: number;
    estimated: number;
    percentage: number;
  };
  onDelete: () => void;
  onStart: () => void;
  isDragging?: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  progress,
  onDelete,
  onStart,
  isDragging = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getPriorityConfig = (priority: number = 0) => {
    switch (priority) {
      case 3:
        return {
          color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
          label: 'Urgent',
          icon: '🔥'
        };
      case 2:
        return {
          color: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          label: 'High',
          icon: '⚡'
        };
      case 1:
        return {
          color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          label: 'Medium',
          icon: '📋'
        };
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          label: 'Low',
          icon: '📝'
        };
    }
  };

  const getStatusColor = (status: string = 'todo') => {
    switch (status) {
      case 'done':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Overdue', color: 'text-red-600 dark:text-red-400' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-orange-600 dark:text-orange-400' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-600 dark:text-yellow-400' };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: 'text-blue-600 dark:text-blue-400' };
    } else {
      return { text: date.toLocaleDateString(), color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const deadline = formatDeadline(task.deadline);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 ${
        isDragging ? 'shadow-xl ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className={`flex items-center space-x-1 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors duration-200"
          >
            <AiOutlineDelete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400 flex items-center">
            <AiOutlineFire className="w-4 h-4 mr-1 text-orange-500" />
            Progress: {progress.completed}/{progress.estimated}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Math.round(progress.percentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {/* Priority */}
          <span className={`px-2 py-1 rounded-full border ${priorityConfig.color}`}>
            <span className="mr-1">{priorityConfig.icon}</span>
            {priorityConfig.label}
          </span>
          
          {/* Status */}
          <span className={`px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
            {task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : 'Done'}
          </span>
        </div>
      </div>

      {/* Deadline */}
      {deadline && (
        <div className={`flex items-center mt-2 text-xs ${deadline.color}`}>
          <AiOutlineCalendar className="w-3 h-3 mr-1" />
          {deadline.text}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {task.status === 'in-progress' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-sm font-medium"
          >
            <FiPlay className="w-4 h-4" />
            <span>Start Focus</span>
          </button>
        ) : task.status === 'done' ? (
          <div className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
            <span>✅ Completed</span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 text-sm font-medium"
          >
            <FiClock className="w-4 h-4" />
            <span>Ready to Start</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;