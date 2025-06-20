import React, { useState, useEffect } from 'react';
import { getTasks, Task, getProjects, Project } from '../services/api';
import TaskCalendar from '../components/TaskCalendar';
import DeadlineManager from '../components/DeadlineManager';
import TaskDetailModal from '../components/TaskDetailModal';
import { 
  AiOutlineCalendar, 
  AiOutlineClockCircle, 
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineFire
} from 'react-icons/ai';
import { FiCalendar, FiClock, FiList, FiTrendingUp } from 'react-icons/fi';

const SchedulePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'deadlines'>('calendar');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Listen for task updates
    const handleTasksUpdated = () => fetchData();
    window.addEventListener('tasks-updated', handleTasksUpdated);
    
    return () => {
      window.removeEventListener('tasks-updated', handleTasksUpdated);
    };
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
      console.error('Failed to fetch schedule data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleStartTask = (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      window.dispatchEvent(new CustomEvent('start-task', { 
        detail: { taskId, projectId: task.projectId } 
      }));
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    setSelectedTask(updatedTask);
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const getScheduleStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const tasksWithDeadlines = tasks.filter(task => task.deadline);
    
    const todayTasks = tasksWithDeadlines.filter(task => {
      const deadline = new Date(task.deadline!);
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      return deadlineDate.getTime() === today.getTime();
    });

    const tomorrowTasks = tasksWithDeadlines.filter(task => {
      const deadline = new Date(task.deadline!);
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      return deadlineDate.getTime() === tomorrow.getTime();
    });

    const thisWeekTasks = tasksWithDeadlines.filter(task => {
      const deadline = new Date(task.deadline!);
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      return deadlineDate >= today && deadlineDate <= nextWeek;
    });

    const overdueTasks = tasksWithDeadlines.filter(task => {
      const deadline = new Date(task.deadline!);
      return deadline < now && task.status !== 'done';
    });

    return {
      today: todayTasks.length,
      tomorrow: tomorrowTasks.length,
      thisWeek: thisWeekTasks.length,
      overdue: overdueTasks.length,
      total: tasksWithDeadlines.length
    };
  };

  const stats = getScheduleStats();

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Lịch trình công việc
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý và theo dõi deadline của các công việc
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
              <AiOutlineWarning className="w-4 h-4" />
              <span className="font-medium">{stats.overdue} quá hạn</span>
            </div>
            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
              <AiOutlineCalendar className="w-4 h-4" />
              <span className="font-medium">{stats.today} hôm nay</span>
            </div>
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <AiOutlineClockCircle className="w-4 h-4" />
              <span className="font-medium">{stats.thisWeek} tuần này</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Hôm nay</p>
              <p className="text-2xl font-bold">{stats.today}</p>
            </div>
            <AiOutlineCalendar className="text-2xl opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Ngày mai</p>
              <p className="text-2xl font-bold">{stats.tomorrow}</p>
            </div>
            <FiCalendar className="text-2xl opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Tuần này</p>
              <p className="text-2xl font-bold">{stats.thisWeek}</p>
            </div>
            <FiTrendingUp className="text-2xl opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Quá hạn</p>
              <p className="text-2xl font-bold">{stats.overdue}</p>
            </div>
            <AiOutlineWarning className="text-2xl opacity-80" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
            activeTab === 'calendar'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiCalendar className="w-4 h-4" />
          <span>Lịch</span>
        </button>
        
        <button
          onClick={() => setActiveTab('deadlines')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
            activeTab === 'deadlines'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiClock className="w-4 h-4" />
          <span>Quản lý Deadline</span>
          {stats.overdue > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {stats.overdue}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'calendar' && (
          <TaskCalendar
            onTaskSelect={handleTaskSelect}
            onStartTask={handleStartTask}
          />
        )}
        
        {activeTab === 'deadlines' && (
          <DeadlineManager
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={showTaskDetail}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onUpdate={handleTaskUpdate}
          onDelete={() => {
            setTasks(prev => prev.filter(t => t._id !== selectedTask._id));
            setShowTaskDetail(false);
            setSelectedTask(null);
            window.dispatchEvent(new Event('tasks-updated'));
          }}
          onStart={() => handleStartTask(selectedTask._id)}
        />
      )}
    </div>
  );
};

export default SchedulePage;