import React, { useState, useEffect } from 'react';
import { Task, updateTask, deleteTask, getSessions, Session, getProjects, Project, getConfig, Config } from '../services/api';
import { 
  AiOutlineClose, 
  AiOutlineEdit, 
  AiOutlineDelete, 
  AiOutlineCalendar, 
  AiOutlineFire, 
  AiOutlineTag,
  AiOutlineProject,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineFlag,
  AiOutlineSave,
  AiOutlineHistory,
  AiOutlineWarning
} from 'react-icons/ai';
import { FiPlay, FiClock, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import TipTapEditor from './TipTapEditor';
import OvertimeWarningModal from './OvertimeWarningModal';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: () => void;
  onStart: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onStart
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [showOvertimeWarning, setShowOvertimeWarning] = useState(false);
  const [acknowledgedOT, setAcknowledgedOT] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setEditData({
        title: task.title,
        description: task.description || '',
        priority: task.priority || 0,
        deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
        estimatedPomodoros: task.estimatedPomodoros || 1,
        tags: task.tags || [],
        status: task.status || 'todo'
      });
      fetchRelatedData();
      
      // Check if task is overdue
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        if (deadline < now && task.status !== 'done') {
          // Check if we've already acknowledged this task's OT
          const savedAcknowledged = localStorage.getItem('acknowledgedTaskOT');
          if (savedAcknowledged) {
            const acknowledged = JSON.parse(savedAcknowledged);
            setAcknowledgedOT(acknowledged[task._id] || false);
          }
          
          // If not acknowledged, show warning after a short delay
          if (!acknowledgedOT) {
            const timer = setTimeout(() => {
              setShowOvertimeWarning(true);
            }, 1000);
            
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [isOpen, task, acknowledgedOT]);

  const fetchRelatedData = async () => {
    try {
      const [sessionsData, projectsData, configData] = await Promise.all([
        getSessions(),
        getProjects(),
        getConfig()
      ]);
      setSessions(sessionsData.filter(s => s.taskId === task._id));
      setProjects(projectsData);
      setConfig(configData);
    } catch (error) {
      console.error('Failed to fetch related data:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedTask = await updateTask(task._id, {
        ...editData,
        deadline: editData.deadline ? new Date(editData.deadline).toISOString() : undefined
      });
      onUpdate(updatedTask);
      setIsEditing(false);
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa task này không?')) {
      try {
        await deleteTask(task._id);
        onDelete();
        onClose();
        window.dispatchEvent(new Event('tasks-updated'));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !editData.tags?.includes(newTag.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const getPriorityConfig = (priority: number = 0) => {
    switch (priority) {
      case 3:
        return { color: 'text-red-600 bg-red-100 dark:bg-red-900/40', label: 'Khẩn cấp', icon: '🔥' };
      case 2:
        return { color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40', label: 'Cao', icon: '⚡' };
      case 1:
        return { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40', label: 'Trung bình', icon: '📋' };
      default:
        return { color: 'text-gray-600 bg-gray-100 dark:bg-gray-700/40', label: 'Thấp', icon: '📝' };
    }
  };

  const getStatusConfig = (status: string = 'todo') => {
    switch (status) {
      case 'done':
        return { color: 'text-green-600 bg-green-100 dark:bg-green-900/40', label: 'Hoàn thành', icon: '✅' };
      case 'in-progress':
        return { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40', label: 'Đang làm', icon: '🔄' };
      default:
        return { color: 'text-gray-600 bg-gray-100 dark:bg-gray-700/40', label: 'Cần làm', icon: '📝' };
    }
  };

  const isTaskOverdue = () => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    const now = new Date();
    return deadline < now;
  };

  const getDaysOverdue = () => {
    if (!task.deadline) return 0;
    const deadline = new Date(task.deadline);
    const now = new Date();
    if (deadline > now) return 0;
    return Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateOvertimeHours = () => {
    if (!task.estimatedPomodoros || !config) return 0;
    
    // Convert pomodoros to hours
    const estimatedHours = (task.estimatedPomodoros * 25) / 60;
    
    // Get completed hours
    const completedHours = sessions
      .filter(s => s.type === 'focus')
      .reduce((total, s) => total + ((s.duration || 0) / 3600), 0);
    
    // Calculate remaining hours
    const remainingHours = Math.max(0, estimatedHours - completedHours);
    
    // If task is not overdue, no overtime needed
    if (!isTaskOverdue()) return 0;
    
    // Calculate available working hours
    const workingHoursPerDay = config.workSchedule.hoursPerDay;
    
    // If remaining hours > available hours for today, we need overtime
    if (remainingHours > workingHoursPerDay) {
      return remainingHours - workingHoursPerDay;
    }
    
    return 0;
  };

  const handleOvertimeWarningClose = () => {
    setShowOvertimeWarning(false);
    setAcknowledgedOT(true);
    
    // Save acknowledgment to localStorage
    const savedAcknowledged = localStorage.getItem('acknowledgedTaskOT');
    const acknowledged = savedAcknowledged ? JSON.parse(savedAcknowledged) : {};
    acknowledged[task._id] = true;
    localStorage.setItem('acknowledgedTaskOT', JSON.stringify(acknowledged));
  };

  const focusSessions = sessions.filter(s => s.type === 'focus');
  const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
  const completedPomodoros = focusSessions.length;
  const progress = task.estimatedPomodoros ? (completedPomodoros / task.estimatedPomodoros) * 100 : 0;
  const project = projects.find(p => p._id === task.projectId);
  const overtimeHours = calculateOvertimeHours();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <AiOutlineProject className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Chỉnh sửa Task' : 'Chi tiết Task'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dự án: {project?.name || 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Chỉnh sửa"
                >
                  <AiOutlineEdit className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Xóa"
                >
                  <AiOutlineDelete className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <AiOutlineClose className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overdue Warning */}
          {isTaskOverdue() && !isEditing && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-start space-x-3">
                <FiAlertTriangle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-300">Task đã quá hạn!</h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Task này đã quá hạn <strong>{getDaysOverdue()} ngày</strong>. 
                    {overtimeHours > 0 && (
                      <span> Cần <strong>{overtimeHours.toFixed(1)} giờ OT</strong> để hoàn thành.</span>
                    )}
                  </p>
                  {acknowledgedOT && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1 italic">
                      Đã xác nhận cần OT
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Task Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tiêu đề
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {task.title}
                  </h3>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mô tả
                </label>
                {isEditing ? (
                  <TipTapEditor
                    content={editData.description || ''}
                    onChange={(value) => setEditData(prev => ({ ...prev, description: value }))}
                    placeholder="Mô tả chi tiết về task..."
                    className="focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200"
                  />
                ) : (
                  <div className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                    {task.description ? (
                      <div dangerouslySetInnerHTML={{ __html: task.description }} />
                    ) : (
                      'Không có mô tả'
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <AiOutlineTag className="inline mr-1" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(isEditing ? editData.tags : task.tags)?.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50"
                    >
                      {tag}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-purple-500 hover:text-purple-700"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Thêm tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                )}
              </div>

              {/* Progress & Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <FiTrendingUp className="mr-2" />
                  Tiến độ & Thống kê
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {completedPomodoros}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Pomodoro hoàn thành
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(totalFocusTime / 60)}m
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Thời gian tập trung
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      Tiến độ: {completedPomodoros}/{task.estimatedPomodoros || 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Metadata & Actions */}
            <div className="space-y-6">
              {/* Status & Priority */}
              <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Trạng thái</h4>
                
                {/* Status */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trạng thái
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.status || 'todo'}
                      onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">Cần làm</option>
                      <option value="in-progress">Đang làm</option>
                      <option value="done">Hoàn thành</option>
                    </select>
                  ) : (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusConfig(task.status).color}`}>
                      <span className="mr-1">{getStatusConfig(task.status).icon}</span>
                      {getStatusConfig(task.status).label}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Độ ưu tiên
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.priority || 0}
                      onChange={(e) => setEditData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Thấp</option>
                      <option value={1}>Trung bình</option>
                      <option value={2}>Cao</option>
                      <option value={3}>Khẩn cấp</option>
                    </select>
                  ) : (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getPriorityConfig(task.priority).color}`}>
                      <span className="mr-1">{getPriorityConfig(task.priority).icon}</span>
                      {getPriorityConfig(task.priority).label}
                    </div>
                  )}
                </div>

                {/* Estimated Pomodoros */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <AiOutlineFire className="inline mr-1" />
                    Pomodoro dự kiến
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={editData.estimatedPomodoros || 1}
                      onChange={(e) => setEditData(prev => ({ ...prev, estimatedPomodoros: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {task.estimatedPomodoros || 1}
                    </div>
                  )}
                </div>
              </div>

              {/* Deadline */}
              <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <AiOutlineCalendar className="mr-2" />
                  Thời hạn
                </h4>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    value={editData.deadline || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className={`text-gray-700 dark:text-gray-300 ${isTaskOverdue() ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                    {task.deadline 
                      ? new Date(task.deadline).toLocaleString('vi-VN')
                      : 'Không có thời hạn'
                    }
                    {isTaskOverdue() && (
                      <div className="mt-1 flex items-center text-red-600 dark:text-red-400">
                        <AiOutlineWarning className="mr-1" />
                        <span>Quá hạn {getDaysOverdue()} ngày</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Hành động</h4>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200"
                    >
                      <AiOutlineSave className="w-4 h-4" />
                      <span>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {task.status !== 'done' && (
                      <button
                        onClick={() => {
                          onStart();
                          onClose();
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                      >
                        <FiPlay className="w-4 h-4" />
                        <span>Bắt đầu làm việc</span>
                      </button>
                    )}
                    
                    {task.status !== 'done' && (
                      <button
                        onClick={async () => {
                          try {
                            const updatedTask = await updateTask(task._id, { status: 'done' });
                            onUpdate(updatedTask);
                            window.dispatchEvent(new CustomEvent('task-completed', {
                              detail: { taskId: task._id, taskTitle: task.title }
                            }));
                            window.dispatchEvent(new Event('tasks-updated'));
                          } catch (error) {
                            console.error('Failed to mark task as complete:', error);
                          }
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                      >
                        <AiOutlineCheckCircle className="w-4 h-4" />
                        <span>Đánh dấu hoàn thành</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Session History */}
              {sessions.length > 0 && (
                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <AiOutlineHistory className="mr-2" />
                    Lịch sử làm việc
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sessions.slice(0, 5).map((session, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <AiOutlineClockCircle className="text-blue-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {new Date(session.startTime).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          {Math.round((session.duration || 0) / 60)}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overtime Warning Modal */}
        {showOvertimeWarning && overtimeHours > 0 && (
          <OvertimeWarningModal
            isOpen={showOvertimeWarning}
            onClose={handleOvertimeWarningClose}
            overtimeHours={overtimeHours}
            taskTitle={task.title}
            projectName={project?.name}
            daysOverdue={getDaysOverdue()}
            deadlineDate={task.deadline}
          />
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;