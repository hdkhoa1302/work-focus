import React, { useEffect, useState } from 'react';
import { getTasks, deleteTask, Task, getSessions, Session } from '../services/api';
import TaskForm from '../components/TaskForm';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getTasks();
      setTasks(data);
      const sess = await getSessions();
      setSessions(sess);
    }
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t._id !== id));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <TaskForm onSave={task => setTasks(prev => [...prev, task])} />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiêu đề</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ưu tiên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoàn thành</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiến độ</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map(task => {
              const completed = sessions.filter(s => s.taskId === task._id && s.type === 'focus').length;
              const estimated = task.estimatedPomodoros || 1;
              return (
                <tr key={task._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.deadline ? new Date(task.deadline).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{completed}/{estimated}</td>
                  <td className="px-6 py-4 whitespace-nowrap w-40">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(completed / estimated) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId: task._id } }))}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >Start</button>
                    <button
                      onClick={() => handleDelete(task._id)}
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                    >Xóa</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TasksPage; 