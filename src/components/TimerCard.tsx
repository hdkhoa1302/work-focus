import React, { useEffect, useState } from 'react';
import { getTasks, Task as ApiTask, getConfig as apiGetConfig, getProjects, Project, updateProject } from '../services/api';
import { AiOutlineFire, AiOutlineCoffee } from 'react-icons/ai';
import { FiPlay, FiPause, FiRefreshCw } from 'react-icons/fi';

type Mode = 'focus' | 'break';

const TimerCard: React.FC = () => {
  const [remaining, setRemaining] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('focus');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [config, setConfig] = useState<{ focus: number; break: number }>({ focus: 25, break: 5 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    // Load config
    apiGetConfig()
      .then(data => {
        if (data.pomodoro) {
          setConfig(data.pomodoro);
          setRemaining(data.pomodoro.focus * 60 * 1000);
        }
      })
      .catch(err => console.error('Failed to fetch config', err));
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

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    // Load tasks for selected project
    const fetchTasksByProject = () => {
      getTasks(selectedProjectId)
        .then(setTasks)
        .catch(err => console.error('Failed to fetch tasks', err));
    };
    fetchTasksByProject();
    // Refresh tasks on timer done or external updates
    window.addEventListener('tasks-updated', fetchTasksByProject);
    window.ipc?.on('timer-done', fetchTasksByProject);
    return () => {
      window.removeEventListener('tasks-updated', fetchTasksByProject);
      window.ipc?.removeListener('timer-done', fetchTasksByProject);
    };
  }, [selectedProjectId]);

  useEffect(() => {
    const onStartTask = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const taskId = detail.taskId as string;
      if (detail.projectId) setSelectedProjectId(detail.projectId);
      setSelectedTaskId(taskId);
      setMode('focus');
      const duration = config.focus * 60 * 1000;
      setRemaining(duration);
      setIsRunning(true);
      window.ipc.send('timer-start', { type: 'focus', duration, taskId });
    };
    window.addEventListener('start-task', onStartTask);
    return () => {
      window.removeEventListener('start-task', onStartTask);
    };
  }, [config]);

  useEffect(() => {
    const onTick = (_: any, ms: number) => setRemaining(ms);
    const onDone = (_: any, { type }: any) => {
      setIsRunning(false);
      alert(type === 'focus' ? 'Phiên tập trung kết thúc!' : 'Phiên nghỉ kết thúc!');
      const ms = (type === 'focus' ? config.break : config.focus) * 60 * 1000;
      setMode(type === 'focus' ? 'break' : 'focus');
      setRemaining(ms);
    };
    const onPaused = (_: any, ms: number) => {
      setIsRunning(false);
      setRemaining(ms);
    };

    window.ipc.on('timer-tick', onTick);
    window.ipc.on('timer-done', onDone);
    window.ipc.on('timer-paused', onPaused);

    return () => {
      window.ipc.removeListener('timer-tick', onTick);
      window.ipc.removeListener('timer-done', onDone);
      window.ipc.removeListener('timer-paused', onPaused);
    };
  }, [config]);

  const handleStart = () => {
    setIsRunning(true);
    // Chỉ gửi taskId khi ở chế độ focus
    const timerData = { 
      type: mode, 
      duration: remaining || config[mode] * 60 * 1000,
      ...(mode === 'focus' && { taskId: selectedTaskId })
    };
    window.ipc.send('timer-start', timerData);
    // Khi start task, cập nhật trạng thái project thành in-progress
    if (mode === 'focus' && selectedProjectId) {
      updateProject(selectedProjectId, { status: 'in-progress' })
        .catch(err => console.error('Failed to update project status to in-progress:', err));
    }
  };

  const handlePause = () => window.ipc.send('timer-pause');

  const handleResume = () => {
    setIsRunning(true);
    window.ipc.send('timer-resume');
  };

  const switchMode = (m: Mode) => {
    if (isRunning) return;
    setMode(m);
    setRemaining(config[m] * 60 * 1000);
  };

  const minutes = Math.floor(remaining / 1000 / 60).toString().padStart(2, '0');
  const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
  const totalDuration = config[mode] * 60 * 1000;
  const progress = totalDuration > 0 ? ((totalDuration - remaining) / totalDuration) * 100 : 0;

  const selectedTask = tasks.find(task => task._id === selectedTaskId);

  // Clear completed selected task and congratulate
  useEffect(() => {
    if (!selectedTaskId) return;
    const cur = tasks.find(t => t._id === selectedTaskId);
    if (cur && cur.status === 'done') {
      alert(`Chúc mừng bạn đã hoàn thành công việc: ${cur.title}!`);
      setSelectedTaskId('');
    }
  }, [tasks, selectedTaskId]);

  // Khi tất cả tasks của project đều done, hỏi đánh dấu project completed
  useEffect(() => {
    if (!selectedProjectId || tasks.length === 0) return;
    if (tasks.every(t => t.status === 'done')) {
      const projectName = projects.find(p => p._id === selectedProjectId)?.name || '';
      if (window.confirm(`Tất cả công việc của dự án "${projectName}" đã hoàn thành. Bạn có muốn đánh dấu dự án này là hoàn thành không?`)) {
        updateProject(selectedProjectId, { completed: true, status: 'done' })
          .catch(err => console.error('Failed to complete project:', err));
      }
    }
  }, [tasks, selectedProjectId, projects]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-8 space-y-6 lg:space-y-0">
        
        {mode === 'focus' && (
          <>
            {/* Project Selection */}
            <div className="flex-1 mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Dự án
              </label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                <option value="">Chọn dự án</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Task Selection */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Current Task
              </label>
              <select
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                disabled={!selectedProjectId}
              >
                <option value="">{selectedProjectId ? 'Chọn công việc' : 'Chọn dự án trước'}</option>
                {tasks
                  .filter(task => task.status !== 'done')
                  .map(task => (
                    <option key={task._id} value={task._id}>{task.title}</option>
                  ))}
              </select>
              {selectedTask && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {selectedTask.description || 'No description'}
                </p>
              )}
            </div>
          </>
        )}

        {/* Mode Selection */}
        <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
        <button
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              mode === 'focus' 
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          onClick={() => switchMode('focus')}
            disabled={isRunning}
          >
            <AiOutlineFire className="text-lg" />
            <span className="font-medium">Focus</span>
          </button>
        <button
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              mode === 'break' 
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          onClick={() => switchMode('break')}
            disabled={isRunning}
          >
            <AiOutlineCoffee className="text-lg" />
            <span className="font-medium">Break</span>
          </button>
        </div>

        {/* Timer Display */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-600"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className={mode === 'focus' ? 'text-red-500' : 'text-green-500'}
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">
                  {minutes}:{seconds}
                </span>
              </div>
            </div>
      </div>

          {/* Control Buttons */}
          <div className="flex space-x-3">
            {/* Start button, enabled always in break, only if selectedTaskId in focus */}
            {!isRunning && (
              <button
                onClick={handleStart}
                disabled={mode === 'focus' && !selectedTaskId}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  (mode === 'focus' ? !!selectedTaskId : true)
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FiPlay className="text-lg" />
                <span>{mode === 'focus' ? 'Bắt đầu tập trung' : 'Bắt đầu nghỉ'}</span>
              </button>
            )}
            {/* Resume chỉ cho focus */}
            {mode === 'focus' && !isRunning && remaining !== config[mode] * 60 * 1000 && (
              <button
                onClick={handleResume}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <FiRefreshCw className="text-lg" />
                <span>Tiếp tục tập trung</span>
              </button>
            )}
            {/* Skip button only in break */}
            {mode === 'break' && (
              <button
                onClick={() => {
                  // Skip break and return to focus mode
                  setMode('focus');
                  setRemaining(config.focus * 60 * 1000);
                  setIsRunning(false);
                }}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium bg-gray-400 text-white hover:bg-gray-500 transition-all duration-200"
              >
                <span>Bỏ qua nghỉ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerCard; 