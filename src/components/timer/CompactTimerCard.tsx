import React, { useState, useEffect } from 'react';
import { AiOutlineFire, AiOutlineCoffee } from 'react-icons/ai';
import { FiPlay, FiPause, FiRefreshCw, FiMaximize2 } from 'react-icons/fi';
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

  // Xử lý class dựa trên mode
  const isFocus = mode === 'focus';
  const outerBgClass = isFocus ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900';
  const iconColorClass = isFocus ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  const progressBarBgClass = isFocus ? 'bg-red-200 dark:bg-red-800' : 'bg-green-200 dark:bg-green-800';
  const progressFillClass = isFocus ? 'bg-red-500' : 'bg-green-500';
  const minutes = Math.floor(remaining / 1000 / 60).toString().padStart(2, '0');
  const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');

  // Fetch dự án khi component mount
  useEffect(() => {
    // Load projects
    const loadProjects = () => {
      getProjects()
        .then(setProjects)
        .catch(err => console.error('Failed to fetch projects', err));
    };
    loadProjects();
    // Refresh projects on timer done
    window.ipc?.on('timer-done', loadProjects);
    return () => {
      window.ipc?.removeListener('timer-done', loadProjects);
    };
  }, []);

  // Fetch tasks khi chọn project
  useEffect(() => {
    if (!selectedProjectId) { setTasks([]); return; }
    // Hàm fetch tasks theo project
    const fetchTasksByProject = () => {
      getTasks(selectedProjectId)
        .then(setTasks)
        .catch(err => console.error('Failed to fetch tasks', err));
    };
    // Gọi ban đầu
    fetchTasksByProject();
    // Lắng nghe tasks-updated khi tạo task
    window.addEventListener('tasks-updated', fetchTasksByProject);
    // Lắng nghe khi Pomodoro xong (session lưu) có thể cập nhật task status
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

  // Clear completed selected task and congratulate
  useEffect(() => {
    if (!selectedTaskId) return;
    const cur = tasks.find(t => t._id === selectedTaskId);
    if (cur && cur.status === 'done') {
      alert(`Chúc mừng bạn đã hoàn thành công việc: ${cur.title}!`);
      setSelectedTaskId('');
    }
  }, [tasks, selectedTaskId]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-600">
      {/* Chọn dự án và công việc */}
      <div className="flex flex-col space-y-2 mb-4">
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        >
          <option value="">Chọn dự án</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select
          value={selectedTaskId}
          onChange={e => setSelectedTaskId(e.target.value)}
          disabled={!selectedProjectId}
          className={`w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${!selectedProjectId ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{selectedProjectId ? 'Chọn công việc' : 'Chọn dự án trước'}</option>
          {tasks
            .filter(task => task.status !== 'done')
            .map(task => (
              <option key={task._id} value={task._id}>{task.title}</option>
            ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        {/* Mode & Task Info */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${outerBgClass}`}>
            {mode === 'focus' ? (
              <AiOutlineFire className={`w-5 h-5 ${iconColorClass}`} />
            ) : (
              <AiOutlineCoffee className={`w-5 h-5 ${iconColorClass}`} />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {isFocus ? 'Focus' : 'Break'}
            </p>
            {isFocus && selectedTaskTitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-32">
                {selectedTaskTitle}
              </p>
            )}
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">
              {minutes}:{seconds}
            </span>
            <div className={`w-full h-1 rounded-full mt-1 ${progressBarBgClass}`}>
              <div
                className={`h-1 rounded-full transition-all duration-1000 ${progressFillClass}`}
                style={{ width: '25%' }} // Example progress
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('start-task', { detail: { projectId: selectedProjectId, taskId: selectedTaskId } }))}
                disabled={!selectedProjectId || !selectedTaskId}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlay className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
              >
                <FiPause className="w-4 h-4" />
              </button>
            )}
            
            {!isRunning && remaining > 0 && (
              <button
                onClick={onResume}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                <FiRefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onExpand}
              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <FiMaximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactTimerCard;