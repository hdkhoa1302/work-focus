import React, { useEffect, useState } from 'react';
import { getTasks, deleteTask, updateTask, Task, getSessions, Session } from '../services/api';
import TaskForm from '../components/TaskForm';
import { 
  AiOutlinePlay, 
  AiOutlineDelete, 
  AiOutlineEdit,
  AiOutlineCalendar,
  AiOutlineFire,
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlineFlag
} from 'react-icons/ai';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'deadline'>('created');

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksData, sessionsData] = await Promise.all([getTasks(), getSessions()]);
        setTasks(tasksData);
        setSessions(sessionsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
        setTasks(prev => prev.filter(t => t._id !== id));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    try {
      const updatedTask = await updateTask(id, { status });
      setTasks(prev => prev.map(t => t._id === id ? updatedTask : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return (b.priority || 0) - (a.priority || 0);
      case 'deadline':
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    }
  });

  const getTaskProgress = (taskId: string) => {
    const completed = sessions.filter(s => s.taskId === taskId && s.type === 'focus').length;
    const task = tasks.find(t => t._id === taskId);
    const estimated = task?.estimatedPomodoros || 1;
    return { completed, estimated, percentage: (completed / estimated) * 100 };
  };

  const getPriorityColor = (priority: number = 0) => {
    switch (priority) {
      case 3: return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
      case 2: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
      case 1: return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: number = 0) => {
    switch (priority) {
      case 3: return 'Urgent';
      case 2: return 'High';
      case 1: return 'Medium';
      default: return 'Low';
    }
  };

  const getStatusColor = (status: string = 'todo') => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'in-progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your tasks and track progress</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tasks</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Completed</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created">Sort by Created</option>
            <option value="priority">Sort by Priority</option>
            <option value="deadline">Sort by Deadline</option>
          </select>
        </div>
      </div>

      {/* Task Form */}
      <TaskForm onSave={task => setTasks(prev => [task, ...prev])} />

      {/* Tasks Grid */}
      {sortedTasks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedTasks.map(task => {
            const progress = getTaskProgress(task._id);
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
            
            return (
              <div key={task._id} className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md ${
                isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
              }`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {task.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status?.replace('-', ' ') || 'todo'}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress: {progress.completed}/{progress.estimated} Pomodoros
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(progress.percentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <AiOutlineFire className="text-orange-500" />
                    <span>{task.estimatedPomodoros || 1} Pomodoros</span>
                  </div>
                  {task.deadline && (
                    <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-500' : ''}`}>
                      <AiOutlineCalendar />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId: task._id } }))}
                      disabled={task.status === 'done'}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        task.status === 'done'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      <AiOutlinePlay className="text-sm" />
                      <span>Start</span>
                    </button>

                    {task.status !== 'done' && (
                      <button
                        onClick={() => handleStatusChange(task._id, 'done')}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200"
                      >
                        <AiOutlineCheckCircle className="text-sm" />
                        <span>Complete</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(task._id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-all duration-200"
                  >
                    <AiOutlineDelete className="text-lg" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <AiOutlineClockCircle className="text-6xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {filter === 'all' ? 'No tasks yet' : `No ${filter.replace('-', ' ')} tasks`}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'all' 
              ? 'Create your first task to get started with the Pomodoro technique!'
              : `You don't have any ${filter.replace('-', ' ')} tasks at the moment.`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default TasksPage;