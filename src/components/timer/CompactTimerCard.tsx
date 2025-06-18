import React, { useState, useEffect } from 'react';
import { AiOutlineFire, AiOutlineCoffee, AiOutlineProject, AiOutlineCheckSquare } from 'react-icons/ai';
import { FiPlay, FiPause, FiRefreshCw, FiMaximize2, FiChevronDown } from 'react-icons/fi';
import { getProjects, getTasks, Task as ApiTask, Project } from '../../services/api';

interface CompactTimerCardProps {
  remaining: number;
  mode: 'focus' | 'break';
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onExpand: () => void;
  selectedTaskTitle?: string;
}

const CompactTimerCard: React.FC<CompactTimerCardProps> = ({
  remaining,
  mode,
  isRunning,
  onStart,
  onPause,
  onResume,
  onExpand,
  selectedTaskTitle
}) => {
  // State cho project và task
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  // Xử lý class dựa trên mode
  const isFocus = mode === 'focus';
  const minutes = Math.floor(remaining / 1000 / 60).toString().padStart(2, '0');
  const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');

  // Fetch dự án khi component mount
  useEffect(() => {
    const loadProjects = () => {
      getProjects()
        .then(setProjects)
        .catch(err => console.error('Failed to fetch projects', err));
    };
    loadProjects();
    window.ipc?.on('timer-done', loadProjects);
    return () => {
      window.ipc?.removeListener('timer-done', loadProjects);
    };
  }, []);

  // Fetch tasks khi chọn project
  useEffect(() => {
    if (!selectedProjectId) { 
      setTasks([]);
      setSelectedTaskId('');
      return; 
    }
    const fetchTasksByProject = () => {
      getTasks(selectedProjectId)
        .then(setTasks)
        .catch(err => console.error('Failed to fetch tasks', err));
    };
    fetchTasksByProject();
    window.addEventListener('tasks-updated', fetchTasksByProject);
    window.ipc?.on('timer-done', fetchTasksByProject);
    return () => {
      window.removeEventListener('tasks-updated', fetchTasksByProject);
      window.ipc?.removeListener('timer-done', fetchTasksByProject);
    };
  }, [selectedProjectId]);

  // Lắng nghe event chọn project hoặc task từ ngoài
  useEffect(() => {
    const handleSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.projectId) {
        setSelectedProjectId(detail.projectId);
      }
      if (detail.taskId) {
        setSelectedTaskId(detail.taskId);
      }
    };
    window.addEventListener('start-task', handleSelect);
    return () => {
      window.removeEventListener('start-task', handleSelect);
    };
  }, []);

  const selectedProject = projects.find(p => p._id === selectedProjectId);
  const selectedTask = tasks.find(t => t._id === selectedTaskId);
  const availableTasks = tasks.filter(task => task.status !== 'done');

  const handleStartTimer = () => {
    if (isFocus && selectedProjectId && selectedTaskId) {
      window.dispatchEvent(new CustomEvent('start-task', { 
        detail: { projectId: selectedProjectId, taskId: selectedTaskId } 
      }));
    } else if (!isFocus) {
      onStart();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left Section: Mode & Timer */}
        <div className="flex items-center gap-4">
          {/* Mode Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            isFocus 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
              : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          }`}>
            {isFocus ? (
              <AiOutlineFire className="w-4 h-4" />
            ) : (
              <AiOutlineCoffee className="w-4 h-4" />
            )}
            <span className="font-medium text-sm">
              {isFocus ? 'Tập trung' : 'Nghỉ ngơi'}
            </span>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
              {minutes}:{seconds}
            </div>
            {isRunning && (
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isFocus ? 'bg-red-500' : 'bg-green-500'
              }`} />
            )}
          </div>
        </div>

        {/* Center Section: Project & Task Selection (only in focus mode) */}
        {isFocus && (
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {/* Project Selector */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AiOutlineProject className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="truncate text-gray-900 dark:text-gray-100">
                    {selectedProject?.name || 'Chọn dự án'}
                  </span>
                </div>
                <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                  showProjectDropdown ? 'rotate-180' : ''
                }`} />
              </button>
              
              {showProjectDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {projects.map(project => (
                    <button
                      key={project._id}
                      onClick={() => {
                        setSelectedProjectId(project._id);
                        setSelectedTaskId('');
                        setShowProjectDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <AiOutlineProject className="w-3 h-3 text-blue-500" />
                        <span className="truncate">{project.name}</span>
                      </div>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Chưa có dự án nào
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Task Selector */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowTaskDropdown(!showTaskDropdown)}
                disabled={!selectedProjectId}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AiOutlineCheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="truncate text-gray-900 dark:text-gray-100">
                    {selectedTask?.title || (selectedProjectId ? 'Chọn công việc' : 'Chọn dự án trước')}
                  </span>
                </div>
                <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                  showTaskDropdown ? 'rotate-180' : ''
                }`} />
              </button>
              
              {showTaskDropdown && selectedProjectId && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {availableTasks.map(task => (
                    <button
                      key={task._id}
                      onClick={() => {
                        setSelectedTaskId(task._id);
                        setShowTaskDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <AiOutlineCheckSquare className="w-3 h-3 text-green-500" />
                        <span className="truncate">{task.title}</span>
                      </div>
                      {task.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {task.description.replace(/<[^>]*>/g, '').substring(0, 50)}...
                        </div>
                      )}
                    </button>
                  ))}
                  {availableTasks.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Không có công việc nào
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Section: Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStartTimer}
              disabled={isFocus && (!selectedProjectId || !selectedTaskId)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                (isFocus ? (selectedProjectId && selectedTaskId) : true)
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiPlay className="w-4 h-4" />
              <span className="hidden sm:inline">Bắt đầu</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <FiPause className="w-4 h-4" />
              <span className="hidden sm:inline">Tạm dừng</span>
            </button>
          )}
          
          {!isRunning && remaining > 0 && remaining < (isFocus ? 25 : 5) * 60 * 1000 && (
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Tiếp tục</span>
            </button>
          )}

          <button
            onClick={onExpand}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Mở rộng timer"
          >
            <FiMaximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-1000 ${
              isFocus 
                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500'
            }`}
            style={{ 
              width: `${100 - (remaining / ((isFocus ? 25 : 5) * 60 * 1000)) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Task Info (when selected) */}
      {isFocus && selectedTask && (
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <AiOutlineCheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedTask.title}
              </div>
              {selectedTask.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedTask.description.replace(/<[^>]*>/g, '').substring(0, 80)}...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showProjectDropdown || showTaskDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowProjectDropdown(false);
            setShowTaskDropdown(false);
          }}
        />
      )}
    </div>
  );
};

export default CompactTimerCard;