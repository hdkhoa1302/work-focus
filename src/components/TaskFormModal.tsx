import React, { useState, useEffect } from 'react';
import { createTask, Task, getProjects, Project } from '../services/api';
import { AiOutlinePlus, AiOutlineCalendar, AiOutlineFire, AiOutlineClose, AiOutlineTag } from 'react-icons/ai';
import useLanguage from '../hooks/useLanguage';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 0,
    deadline: '',
    estimatedPomodoros: 1,
    tags: [] as string[]
  });
  const [projects, setProjects] = useState<Project[]>([]);
  // State lưu projectId, sẽ cập nhật khi modal mở
  const [projectId, setProjectId] = useState<string>('');
  // Kiểm tra có context dự án hay không
  const isProjectFixed = Boolean(localStorage.getItem('selectedProjectId'));
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load projects khi modal mở
  useEffect(() => {
    if (!isOpen) return;
    // Cập nhật projectId từ localStorage khi modal mở
    const fixedId = localStorage.getItem('selectedProjectId');
    setProjectId(fixedId || '');
    const loadProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };
    loadProjects();
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = t('tasks.titleRequired');
    }
    
    if (formData.estimatedPomodoros < 1 || formData.estimatedPomodoros > 20) {
      newErrors.estimatedPomodoros = t('tasks.pomodoroRange');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!projectId) {
      setErrors(prev => ({ ...prev, project: t('tasks.projectRequired') }));
      return;
    }
    setIsSubmitting(true);
    try {
      const newTask = await createTask({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        estimatedPomodoros: formData.estimatedPomodoros,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        tags: formData.tags,
        projectId,
      });
      
      onSave(newTask);
      window.dispatchEvent(new Event('tasks-updated'));
      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 0,
      deadline: '',
      estimatedPomodoros: 1,
      tags: []
    });
    setNewTag('');
    setErrors({});
    setProjectId('');
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const priorityOptions = [
    { value: 0, label: t('tasks.priority.low'), color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 1, label: t('tasks.priority.medium'), color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 2, label: t('tasks.priority.high'), color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 3, label: t('tasks.priority.urgent'), color: 'bg-red-100 text-red-700 border-red-300' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('tasks.createNewTask')}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('tasks.selectProject')} *</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              required
              disabled={isProjectFixed}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${isProjectFixed ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : ''}`}
            >
              <option value="">{t('tasks.selectProject')}</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            {errors.project && <p className="mt-1 text-sm text-red-600">{errors.project}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.taskTitle')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                errors.title
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
              } text-gray-900 dark:text-gray-100`}
              placeholder="What do you want to accomplish?"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              placeholder="Add more details about this task..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tasks.priority.title')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      formData.priority === option.value
                        ? option.color
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Pomodoros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <AiOutlineFire className="inline mr-1" />
                {t('tasks.estimatedPomodoros')}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.estimatedPomodoros}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedPomodoros: Number(e.target.value) }))}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.estimatedPomodoros
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                } text-gray-900 dark:text-gray-100`}
              />
              {errors.estimatedPomodoros && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.estimatedPomodoros}</p>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <AiOutlineCalendar className="inline mr-1" />
              {t('tasks.deadline')}
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <AiOutlineTag className="inline mr-1" />
              {t('tasks.tags')}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-purple-500 hover:text-purple-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('tasks.addTag')}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
              >
                {t('tasks.add')}
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <AiOutlinePlus className="w-4 h-4" />
              <span>{isSubmitting ? t('tasks.creating') : t('common.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;