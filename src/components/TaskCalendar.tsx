import React, { useState, useEffect } from 'react';
import { getTasks, Task, getProjects, Project } from '../services/api';
import { 
  AiOutlineCalendar, 
  AiOutlineClockCircle, 
  AiOutlineFlag, 
  AiOutlineLeft, 
  AiOutlineRight,
  AiOutlineHome,
  AiOutlineFilter,
  AiOutlineWarning
} from 'react-icons/ai';
import { FiClock, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface TaskCalendarProps {
  onTaskSelect?: (task: Task) => void;
  onStartTask?: (taskId: string) => void;
}

type ViewMode = 'day' | 'week' | 'month';
type FilterMode = 'all' | 'pending' | 'overdue' | 'today' | 'thisWeek';

const TaskCalendar: React.FC<TaskCalendarProps> = ({ onTaskSelect, onStartTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
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
      setTasks(tasksData.filter(task => task.deadline)); // Only tasks with deadlines
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return tasks.filter(task => {
      if (!task.deadline) return false;
      return new Date(task.deadline).toDateString() === dateStr;
    });
  };

  const getTasksForPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      
      switch (filterMode) {
        case 'overdue':
          return taskDateOnly < today && task.status !== 'done';
        case 'today':
          return taskDateOnly.getTime() === today.getTime();
        case 'thisWeek':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return taskDateOnly >= weekStart && taskDateOnly <= weekEnd;
        case 'pending':
          return task.status !== 'done';
        default:
          return true;
      }
    });
  };

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getPriorityColor = (priority: number = 0) => {
    switch (priority) {
      case 3: return 'bg-red-500 text-white';
      case 2: return 'bg-orange-500 text-white';
      case 1: return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (task: Task) => {
    if (task.status === 'done') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    
    const now = new Date();
    const deadline = new Date(task.deadline!);
    const isOverdue = deadline < now;
    
    if (isOverdue) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDeadline <= 24) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  };

  const getProject = (projectId: string) => {
    return projects.find(p => p._id === projectId);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderDayView = () => {
    const dayTasks = getTasksForDate(currentDate);
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
        </div>
        
        <div className="space-y-3">
          {dayTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AiOutlineCalendar className="text-4xl mx-auto mb-2" />
              <p>Không có công việc nào trong ngày này</p>
            </div>
          ) : (
            dayTasks
              .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
              .map(task => (
                <TaskCard 
                  key={task._id} 
                  task={task} 
                  project={getProject(task.projectId)}
                  onSelect={onTaskSelect}
                  onStart={onStartTask}
                  showDate={false}
                />
              ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Tuần {weekDays[0].toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </h3>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayTasks = getTasksForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className={`p-3 rounded-lg border ${
                isToday 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}>
                <div className="text-center mb-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task._id}
                      onClick={() => onTaskSelect?.(task)}
                      className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(task)}`}
                    >
                      <div className="font-medium truncate">{task.title}</div>
                      <div className="text-xs opacity-75">{formatTime(task.deadline!)}</div>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{dayTasks.length - 3} khác
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays(currentDate);
    const weeks = [];
    
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        
        {/* Week headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIndex) => {
                const dayTasks = getTasksForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div
                    key={dayIndex}
                    className={`p-2 rounded-lg border min-h-[80px] ${
                      isToday 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                        : isCurrentMonth
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : isCurrentMonth
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task._id}
                          onClick={() => onTaskSelect?.(task)}
                          className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(task)}`}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayTasks.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaskList = () => {
    const filteredTasks = getTasksForPeriod()
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

    return (
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AiOutlineCalendar className="text-4xl mx-auto mb-2" />
            <p>Không có công việc nào phù hợp với bộ lọc</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard 
              key={task._id} 
              task={task} 
              project={getProject(task.projectId)}
              onSelect={onTaskSelect}
              onStart={onStartTask}
              showDate={true}
            />
          ))
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lịch công việc</h2>
          
          {/* View Mode Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {mode === 'day' ? 'Ngày' : mode === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Selector */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chưa hoàn thành</option>
            <option value="overdue">Quá hạn</option>
            <option value="today">Hôm nay</option>
            <option value="thisWeek">Tuần này</option>
          </select>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <AiOutlineLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
                              <AiOutlineHome className="w-4 h-4 inline mr-1" />
              Hôm nay
            </button>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <AiOutlineRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* Task List for filtered view */}
      {filterMode !== 'all' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Danh sách công việc - {
              filterMode === 'pending' ? 'Chưa hoàn thành' :
              filterMode === 'overdue' ? 'Quá hạn' :
              filterMode === 'today' ? 'Hôm nay' :
              filterMode === 'thisWeek' ? 'Tuần này' : 'Tất cả'
            }
          </h3>
          {renderTaskList()}
        </div>
      )}
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: Task;
  project?: Project;
  onSelect?: (task: Task) => void;
  onStart?: (taskId: string) => void;
  showDate: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onSelect, onStart, showDate }) => {
  const now = new Date();
  const deadline = new Date(task.deadline!);
  const isOverdue = deadline < now && task.status !== 'done';
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isUrgent = hoursUntilDeadline <= 24 && hoursUntilDeadline > 0;

  const getPriorityIcon = (priority: number = 0) => {
    switch (priority) {
      case 3: return <AiOutlineFlag className="text-red-500" />;
      case 2: return <AiOutlineFlag className="text-orange-500" />;
      case 1: return <AiOutlineFlag className="text-blue-500" />;
      default: return <AiOutlineFlag className="text-gray-500" />;
    }
  };

  return (
    <div 
      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
        isOverdue 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
          : isUrgent
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
      onClick={() => onSelect?.(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {getPriorityIcon(task.priority)}
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {task.title}
            </h4>
            {isOverdue && <FiAlertTriangle className="text-red-500 flex-shrink-0" />}
            {isUrgent && <FiClock className="text-yellow-500 flex-shrink-0" />}
            {task.status === 'done' && <FiCheckCircle className="text-green-500 flex-shrink-0" />}
          </div>
          
          {project && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              📁 {project.name}
            </div>
          )}
          
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {task.description.replace(/<[^>]*>/g, '')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <AiOutlineClockCircle className="text-gray-500" />
            <span className={`${
              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' :
              isUrgent ? 'text-yellow-600 dark:text-yellow-400 font-medium' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {showDate ? deadline.toLocaleDateString('vi-VN') : ''} {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {isOverdue && (
            <span className="text-red-600 dark:text-red-400 font-medium text-xs">
              Quá hạn {Math.abs(Math.floor(hoursUntilDeadline / 24))} ngày
            </span>
          )}
          
          {isUrgent && (
            <span className="text-yellow-600 dark:text-yellow-400 font-medium text-xs">
              Còn {Math.floor(hoursUntilDeadline)} giờ
            </span>
          )}
        </div>

        {task.status !== 'done' && onStart && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart(task._id);
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Bắt đầu
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCalendar;