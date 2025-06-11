import React, { useEffect, useState } from 'react';
import { getTasks, Task as ApiTask } from '../services/api';

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
    // Fetch Task ban đầu và lắng nghe sự kiện task vừa được tạo
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
    // Lắng nghe sự kiện start-task để tự động start Pomodoro cho task đã chọn
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
      const ms = (type === 'focus' ? config.focus : config.break) * 60 * 1000;
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

  return (
    <div className="bg-white rounded shadow p-4 mb-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Công việc</label>
        <select
          className="block w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          value={selectedTaskId}
          onChange={e => setSelectedTaskId(e.target.value)}
        >
          <option value="">Chọn công việc</option>
          {tasks.map(task => (
            <option key={task._id} value={task._id}>{task.title}</option>
          ))}
        </select>
      </div>
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${mode === 'focus' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => switchMode('focus')}
        >Focus</button>
        <button
          className={`px-4 py-2 rounded ${mode === 'break' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => switchMode('break')}
        >Break</button>
      </div>
      <div className="text-center text-5xl font-mono">{minutes}:{seconds}</div>
      <div className="flex justify-center space-x-4 mt-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedTaskId}
            className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ${!selectedTaskId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >Start</button>
        ) : (
          <button onClick={handlePause} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Pause</button>
        )}
        {!isRunning && remaining !== config[mode] * 60 * 1000 && (
          <button onClick={handleResume} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Resume</button>
        )}
      </div>
    </div>
  );
};

export default TimerCard; 