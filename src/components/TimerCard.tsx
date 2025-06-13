import React, { useEffect, useState } from 'react';
import { getTasks, Task as ApiTask } from '../services/api';
import { AiOutlineFire, AiOutlineCoffee } from 'react-icons/ai';
import { FiPlay, FiPause, FiRefreshCw } from 'react-icons/fi';

type Mode = 'focus' | 'break';

const TimerCard: React.FC = () => {
  const [remaining, setRemaining] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('focus');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [config, setConfig] = useState<{ focus: number; break: number }>({ focus: 25, break: 5 });
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:3000/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.pomodoro) {
          setConfig(data.pomodoro);
          setRemaining(data.pomodoro.focus * 60 * 1000);
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchTasks = () => {
      getTasks()
        .then(setTasks)
        .catch(err => console.error('Failed to fetch tasks', err));
    };
    fetchTasks();
    window.addEventListener('tasks-updated', fetchTasks);
    return () => {
      window.removeEventListener('tasks-updated', fetchTasks);
    };
  }, []);

  useEffect(() => {
    const onStartTask = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const taskId = detail.taskId as string;
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
    window.ipc.send('timer-start', { type: mode, duration: remaining || config[mode] * 60 * 1000, taskId: selectedTaskId });
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

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-8 space-y-6 lg:space-y-0">
        
        {/* Task Selection */}
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Current Task
          </label>
        <select
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          value={selectedTaskId}
          onChange={e => setSelectedTaskId(e.target.value)}
        >
            <option value="">Select a task to focus on</option>
          {tasks.map(task => (
            <option key={task._id} value={task._id}>{task.title}</option>
          ))}
        </select>
          {selectedTask && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {selectedTask.description || 'No description'}
            </p>
          )}
      </div>

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
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedTaskId}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedTaskId
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FiPlay className="text-lg" />
                <span>Start</span>
              </button>
        ) : (
              <button
                onClick={handlePause}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <FiPause className="text-lg" />
                <span>Pause</span>
              </button>
        )}
            
        {!isRunning && remaining !== config[mode] * 60 * 1000 && (
              <button
                onClick={handleResume}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <FiRefreshCw className="text-lg" />
                <span>Resume</span>
              </button>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerCard; 