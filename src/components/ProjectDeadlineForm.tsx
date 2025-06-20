import React, { useState } from 'react';
import { Project, updateProject } from '../services/api';
import { AiOutlineCalendar, AiOutlineSave, AiOutlineClose, AiOutlineClockCircle } from 'react-icons/ai';

interface ProjectDeadlineFormProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
  onCancel: () => void;
}

const ProjectDeadlineForm: React.FC<ProjectDeadlineFormProps> = ({ project, onUpdate, onCancel }) => {
  const [deadline, setDeadline] = useState<string>(
    project.deadline ? new Date(project.deadline).toISOString().slice(0, 16) : ''
  );
  const [estimatedHours, setEstimatedHours] = useState<number>(project.estimatedHours || 0);
  const [actualHours, setActualHours] = useState<number>(project.actualHours || 0);
  const [priority, setPriority] = useState<number>(project.priority || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      setIsSubmitting(true);
      
      const updatedProject = await updateProject(project._id, {
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        estimatedHours: estimatedHours || 0,
        actualHours: actualHours || 0,
        priority
      });
      
      onUpdate(updatedProject);
    } catch (err) {
      console.error('Failed to update project deadline:', err);
      setError('Không thể cập nhật deadline. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Cập nhật deadline dự án
        </h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <AiOutlineClose className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <AiOutlineCalendar className="inline mr-1" />
            Deadline
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <AiOutlineClockCircle className="inline mr-1" />
            Thời gian ước tính (giờ)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <AiOutlineClockCircle className="inline mr-1" />
            Thời gian đã làm (giờ)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={actualHours}
            onChange={(e) => setActualHours(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Độ ưu tiên
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Thấp</option>
            <option value={2}>Trung bình</option>
            <option value={3}>Cao</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <AiOutlineSave className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectDeadlineForm;