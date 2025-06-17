import React, { useState, useEffect } from 'react';
import { Task } from '../../services/api';
import { AiOutlineDelete, AiOutlineEdit, AiOutlineCalendar, AiOutlineFire, AiOutlineFlag } from 'react-icons/ai';
import { FiPlay, FiClock, FiCheckCircle } from 'react-icons/fi';

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
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsActive(detail.taskId === task._id);
    };
    const handleDone = () => setIsActive(false);
    window.addEventListener('start-task', handleStart);
    window.ipc?.on('timer-done', handleDone);
    return () => {
      window.removeEventListener('start-task', handleStart);
      window.ipc?.removeListener('timer-done', handleDone);
    };
  }, [task._id]);

  const getPriorityConfig = (priority: number = 0) => {
    switch (priority) {
      case 3:
        return {
          color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
          label: 'Khẩn cấp',
          icon: '🔥'
        };
      case 2:
        return {
          color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          label: 'Cao',
          icon: '⚡'
        };
      case 1:
        return {
          color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          label: 'Trung bình',
          icon: '📋'
        };
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-700/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          label: 'Thấp',
          icon: '📝'
        };
    }
  };

  const getStatusColor = (status: string = 'todo') => {
    switch (status) {
      case 'done':
        return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700/40 text-gray-700 dark:text-gray-300';
    }
  };

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Đã quá hạn', color: 'text-red-600 dark:text-red-400' };
    } else if (diffDays === 0) {
      return { text: 'Hết hạn hôm nay', color: 'text-orange-600 dark:text-orange-400' };
    } else if (diffDays === 1) {
      return { text: 'Hết hạn ngày mai', color: 'text-yellow-600 dark:text-yellow-400' };
    } else if (diffDays <= 7) {
      return { text: `Còn ${diffDays} ngày`, color: 'text-blue-600 dark:text-blue-400' };
    } else {
      return { text: date.toLocaleDateString(), color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const deadline = formatDeadline(task.deadline);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 ${
        isDragging ? 'shadow-xl ring-2 ring-blue-500 ring-opacity-50' : ''
      } backdrop-blur-sm bg-opacity-95 dark:bg-opacity-90`}
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
        <div className={`flex items-center space-x-1 transition-all duration-300 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
            title="Xóa công việc"
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
              className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800/50"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700/50">
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
            Tiến độ: {progress.completed}/{progress.estimated}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Math.round(progress.percentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {/* Priority */}
          <span className={`px-2 py-0.5 rounded-full border ${priorityConfig.color} shadow-sm`}>
            <span className="mr-1">{priorityConfig.icon}</span>
            {priorityConfig.label}
          </span>
          
          {/* Status */}
          <span className={`px-2 py-0.5 rounded-full ${getStatusColor(task.status)} shadow-sm`}>
            {task.status === 'todo' ? 'Cần làm' : task.status === 'in-progress' ? 'Đang làm' : 'Hoàn thành'}
          </span>
        </div>
      </div>

      {/* Deadline */}
      {deadline && (
        <div className={`flex items-center mt-2 text-xs ${deadline.color} font-medium`}>
          <AiOutlineCalendar className="w-3 h-3 mr-1" />
          {deadline.text}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {isActive ? (
          <button
            disabled
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            <span>Đang thực hiện</span>
          </button>
        ) : task.status === 'in-progress' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 text-sm font-medium shadow-sm hover:shadow-md transform hover:translate-y-[-1px]"
          >
            <FiPlay className="w-4 h-4" />
            <span>Bắt đầu tập trung</span>
          </button>
        ) : task.status === 'done' ? (
          <div className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium shadow-sm">
            <FiCheckCircle className="w-4 h-4" />
            <span>Đã hoàn thành</span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 text-sm font-medium shadow-sm hover:shadow-md transform hover:translate-y-[-1px]"
          >
            <FiClock className="w-4 h-4" />
            <span>Sẵn sàng bắt đầu</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;