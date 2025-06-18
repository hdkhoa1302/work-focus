import React, { useState, useEffect } from 'react';
import { getTasks, updateTask, Task, getProjects, Project } from '../services/api';
import { 
  AiOutlineCalendar, 
  AiOutlineClockCircle, 
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineEdit,
  AiOutlineSave,
  AiOutlineClose
} from 'react-icons/ai';
import { FiAlertTriangle, FiClock, FiTrendingUp } from 'react-icons/fi';

interface DeadlineManagerProps {
  onTaskUpdate?: (task: Task) => void;
}

const DeadlineManager: React.FC<DeadlineManagerProps> = ({ onTaskUpdate }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'urgent' | 'noDeadline'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksData, projectsData] = await Promise.all([
        getTasks(),
        getProjects()
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch deadline data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeTask = (task: Task) => {
    if (!task.deadline) return 'noDeadline';
    
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (deadline < now && task.status !== 'done') return 'overdue';
    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) return 'urgent';
    return 'upcoming';
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const category = categorizeTask(task);
      
      switch (filter) {
        case 'overdue':
          return category === 'overdue';
        case 'urgent':
          return category === 'urgent';
        case 'noDeadline':
          return category === 'noDeadline';
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort by deadline priority
      const categoryA = categorizeTask(a);
      const categoryB = categorizeTask(b);
      
      const priorityOrder = { overdue: 0, urgent: 1, upcoming: 2, noDeadline: 3 };
      const priorityDiff = priorityOrder[categoryA as keyof typeof priorityOrder] - priorityOrder[categoryB as keyof typeof priorityOrder];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same category, sort by deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      
      return 0;
    });
  };

  const handleUpdateDeadline = async (taskId: string) => {
    if (!newDeadline) return;
    
    try {
      const updatedTask = await updateTask(taskId, { 
        deadline: new Date(newDeadline).toISOString() 
      });
      
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      setEditingTask(null);
      setNewDeadline('');
      onTaskUpdate?.(updatedTask);
      
      // Trigger global task update
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (error) {
      console.error('Failed to update deadline:', error);
    }
  };

  const startEditing = (task: Task) => {
    setEditingTask(task._id);
    setNewDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setNewDeadline('');
  };

  const getProject = (projectId: string) => {
    return projects.find(p => p._id === projectId);
  };

  const getTaskStats = () => {
    const overdue = tasks.filter(t => categorizeTask(t) === 'overdue').length;
    const urgent = tasks.filter(t => categorizeTask(t) === 'urgent').length;
    const noDeadline = tasks.filter(t => categorizeTask(t) === 'noDeadline').length;
    const total = tasks.length;
    
    return { overdue, urgent, noDeadline, total };
  };

  const formatDeadlineStatus = (task: Task) => {
    const category = categorizeTask(task);
    
    if (!task.deadline) {
      return { text: 'Chưa có deadline', color: 'text-gray-500', icon: AiOutlineCalendar };
    }
    
    const deadline = new Date(task.deadline);
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    switch (category) {
      case 'overdue':
        const daysOverdue = Math.abs(Math.floor(hoursUntilDeadline / 24));
        return { 
          text: `Quá hạn ${daysOverdue} ngày`, 
          color: 'text-red-600 dark:text-red-400', 
          icon: FiAlertTriangle 
        };
      case 'urgent':
        const hoursLeft = Math.floor(hoursUntilDeadline);
        return { 
          text: `Còn ${hoursLeft} giờ`, 
          color: 'text-yellow-600 dark:text-yellow-400', 
          icon: FiClock 
        };
      default:
        const daysLeft = Math.floor(hoursUntilDeadline / 24);
        return { 
          text: `Còn ${daysLeft} ngày`, 
          color: 'text-blue-600 dark:text-blue-400', 
          icon: AiOutlineClockCircle 
        };
    }
  };

  const stats = getTaskStats();
  const filteredTasks = getFilteredTasks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Quản lý Deadline
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">Quá hạn</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.overdue}</p>
            </div>
            <FiAlertTriangle className="text-2xl text-red-500" />
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Khẩn cấp</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.urgent}</p>
            </div>
            <FiClock className="text-2xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Chưa có deadline</p>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.noDeadline}</p>
            </div>
            <AiOutlineCalendar className="text-2xl text-gray-500" />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Tổng cộng</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
            </div>
            <FiTrendingUp className="text-2xl text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {[
          { key: 'all', label: 'Tất cả', count: stats.total },
          { key: 'overdue', label: 'Quá hạn', count: stats.overdue },
          { key: 'urgent', label: 'Khẩn cấp', count: stats.urgent },
          { key: 'noDeadline', label: 'Chưa có deadline', count: stats.noDeadline }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filter === key
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AiOutlineCalendar className="text-4xl mx-auto mb-2" />
            <p>Không có công việc nào trong danh mục này</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const project = getProject(task.projectId);
            const deadlineStatus = formatDeadlineStatus(task);
            const category = categorizeTask(task);
            const isEditing = editingTask === task._id;

            return (
              <div
                key={task._id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  category === 'overdue' 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                    : category === 'urgent'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {task.title}
                      </h3>
                      {task.status === 'done' && (
                        <AiOutlineCheckCircle className="text-green-500 flex-shrink-0" />
                      )}
                    </div>

                    {project && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📁 {project.name}
                      </p>
                    )}

                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {task.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}

                    <div className="flex items-center space-x-4">
                      <div className={`flex items-center space-x-1 ${deadlineStatus.color}`}>
                        <deadlineStatus.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{deadlineStatus.text}</span>
                      </div>

                      {task.deadline && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(task.deadline).toLocaleDateString('vi-VN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="datetime-local"
                          value={newDeadline}
                          onChange={(e) => setNewDeadline(e.target.value)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                        <button
                          onClick={() => handleUpdateDeadline(task._id)}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="Lưu"
                        >
                          <AiOutlineSave className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          title="Hủy"
                        >
                          <AiOutlineClose className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(task)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Chỉnh sửa deadline"
                      >
                        <AiOutlineEdit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeadlineManager;