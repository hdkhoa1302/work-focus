import React, { useState, useEffect } from 'react';
import { Task, Project, getDailyTasks, DailyTasksResponse } from '../services/api';
import { 
  AiOutlineCalendar, 
  AiOutlineClockCircle, 
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineFire,
  AiOutlineProject,
  AiOutlineRight,
  AiOutlineLeft,
  AiOutlineReload
} from 'react-icons/ai';
import { FiClock, FiTarget, FiCheckCircle, FiPlay } from 'react-icons/fi';

interface DailyTaskListProps {
  onTaskSelect?: (task: Task) => void;
  onStartTask?: (taskId: string) => void;
}

const DailyTaskList: React.FC<DailyTaskListProps> = ({ onTaskSelect, onStartTask }) => {
  const [dailyData, setDailyData] = useState<DailyTasksResponse | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyTasks(currentDate);
  }, [currentDate]);

  const fetchDailyTasks = async (date: Date) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getDailyTasks(date);
      setDailyData(data);
    } catch (err) {
      console.error('Failed to fetch daily tasks:', err);
      setError('Không thể tải dữ liệu công việc hàng ngày');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dailyData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center text-red-600 dark:text-red-400">
          <AiOutlineWarning className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'Không thể tải dữ liệu'}</p>
          <button
            onClick={() => fetchDailyTasks(currentDate)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Công việc trong ngày
          </h3>
          <p className={`text-sm ${isToday(currentDate) ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
            {formatDate(currentDate)} {isToday(currentDate) && '(Hôm nay)'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <AiOutlineCalendar className="w-4 h-4 inline mr-1" />
            Hôm nay
          </button>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button
            onClick={() => fetchDailyTasks(currentDate)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Làm mới"
          >
            <AiOutlineReload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400">Deadline hôm nay</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{dailyData.stats.tasksWithDeadline}</p>
            </div>
            <AiOutlineCalendar className="text-xl text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400">Đang thực hiện</p>
              <p className="text-xl font-bold text-green-800 dark:text-green-200">{dailyData.stats.tasksInProgress}</p>
            </div>
            <FiTarget className="text-xl text-green-500" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Đã hoàn thành</p>
              <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{dailyData.stats.completedToday}</p>
            </div>
            <FiCheckCircle className="text-xl text-purple-500" />
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400">Pomodoro</p>
              <p className="text-xl font-bold text-orange-800 dark:text-orange-200">{dailyData.stats.focusSessions}</p>
            </div>
            <AiOutlineFire className="text-xl text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tasks with deadline today */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <AiOutlineCalendar className="mr-2 text-blue-500" />
          Deadline hôm nay
        </h4>
        
        {dailyData.tasksWithDeadline.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p>Không có công việc nào đến hạn hôm nay</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dailyData.tasksWithDeadline.map(task => (
              <TaskItem 
                key={task._id} 
                task={task} 
                onSelect={onTaskSelect}
                onStart={onStartTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tasks in progress */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <FiTarget className="mr-2 text-green-500" />
          Đang thực hiện
        </h4>
        
        {dailyData.tasksInProgress.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p>Không có công việc nào đang thực hiện</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dailyData.tasksInProgress.map(task => (
              <TaskItem 
                key={task._id} 
                task={task} 
                onSelect={onTaskSelect}
                onStart={onStartTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Projects with upcoming deadlines */}
      {dailyData.projects.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
            <AiOutlineProject className="mr-2 text-purple-500" />
            Dự án sắp đến hạn
          </h4>
          
          <div className="space-y-2">
            {dailyData.projects.map(project => (
              <div 
                key={project._id}
                className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">{project.name}</h5>
                    <div className="flex items-center text-sm text-purple-600 dark:text-purple-400">
                      <AiOutlineCalendar className="mr-1" />
                      <span>
                        {new Date(project.deadline!).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {project.priority === 3 && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full">
                        Ưu tiên cao
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Focus time summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Thời gian tập trung hôm nay</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {dailyData.stats.focusSessions} phiên Pomodoro ({dailyData.stats.totalFocusTime} phút)
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {Math.round(dailyData.stats.totalFocusTime / 60 * 10) / 10}h
          </div>
        </div>
      </div>
    </div>
  );
};

// Task Item Component
interface TaskItemProps {
  task: Task;
  onSelect?: (task: Task) => void;
  onStart?: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onSelect, onStart }) => {
  const getPriorityColor = (priority: number = 0) => {
    switch (priority) {
      case 3: return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
      case 2: return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300';
      case 1: return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onSelect?.(task)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</h5>
          
          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
            {task.deadline && (
              <div className="flex items-center">
                <AiOutlineClockCircle className="mr-1" />
                <span>{formatTime(task.deadline)}</span>
              </div>
            )}
            
            {task.estimatedPomodoros && (
              <div className="flex items-center">
                <AiOutlineFire className="mr-1" />
                <span>{task.estimatedPomodoros} pomodoro</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {task.priority !== undefined && (
            <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
              {task.priority === 3 ? 'Cao' : task.priority === 2 ? 'TB' : 'Thấp'}
            </span>
          )}
          
          {onStart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart(task._id);
              }}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              title="Bắt đầu"
            >
              <FiPlay className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyTaskList;