import React, { useState } from 'react';
import { createTask, Task } from '../services/api';

interface TaskFormProps {
  onSave: (task: Task) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newTask = await createTask({
      title,
      description,
      priority,
      estimatedPomodoros,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });
    onSave(newTask);
    // Thông báo cho TimerCard reload danh sách Tasks
    window.dispatchEvent(new Event('tasks-updated'));
    // Reset form
    setTitle('');
    setDescription('');
    setPriority(0);
    setDeadline('');
    setEstimatedPomodoros(1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
      <input
        type="text"
        placeholder="Tiêu đề"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
      />
      <input
        type="text"
        placeholder="Mô tả"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
      />
      <input
        type="number"
        placeholder="Ưu tiên"
        value={priority}
        onChange={e => setPriority(Number(e.target.value))}
        className="w-20 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
      />
      <input
        type="number"
        min={1}
        placeholder="Số Pomodoro"
        value={estimatedPomodoros}
        onChange={e => setEstimatedPomodoros(Number(e.target.value))}
        className="w-28 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
      />
      <input
        type="datetime-local"
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
        className="w-44 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
      />
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring"
      >Thêm</button>
    </form>
  );
};

export default TaskForm; 