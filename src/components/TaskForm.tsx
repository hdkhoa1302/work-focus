import React, { useState, useEffect } from 'react';
import { createTask, Task, getProjects, Project } from '../services/api';
import { AiOutlinePlus, AiOutlineCalendar, AiOutlineFire } from 'react-icons/ai';
import TipTapEditor from './TipTapEditor';
import useLanguage from '../hooks/useLanguage';

interface TaskFormProps {
  onSave: (task: Task) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSave }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };
    loadProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      alert(t('tasks.projectRequired'));
      return;
    }
    if (!title.trim()) return;
    
    try {
      const newTask = await createTask({
        projectId,
        title,
        description,
        priority,
        estimatedPomodoros,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      onSave(newTask);
      window.dispatchEvent(new Event('tasks-updated'));
      
      // Reset form
      setTitle('');
      setProjectId('');
      setDescription('');
      setPriority(0);
      setDeadline('');
      setEstimatedPomodoros(1);
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const priorityColors = {
    0: 'bg-gray-100 text-gray-700 border-gray-300',
    1: 'bg-blue-100 text-blue-700 border-blue-300',
    2: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    3: 'bg-red-100 text-red-700 border-red-300'
  };

  const priorityLabels = {
    0: 'Low',
    1: 'Medium', 
    2: 'High',
    3: 'Urgent'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('tasks.createNewTask')}</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {isExpanded ? t('common.simple') : t('common.advanced')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Selection */}
        <div>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            required
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">{t('tasks.selectProject')}</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Title - Always visible */}
        <div>
          <input
            type="text"
            placeholder={t('tasks.taskTitle')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Expanded fields */}
        {isExpanded && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tasks.description')}
              </label>
              <TipTapEditor
                content={description}
                onChange={setDescription}
                placeholder={t('tasks.description')}
                className="focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tasks.priority.title')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriority(Number(value))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                        priority === Number(value)
                          ? priorityColors[Number(value) as keyof typeof priorityColors]
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`tasks.priority.${['low','medium','high','urgent'][Number(value)]}`)}
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
                  value={estimatedPomodoros}
                  onChange={e => setEstimatedPomodoros(Number(e.target.value))}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <AiOutlineCalendar className="inline mr-1" />
                  {t('tasks.deadline')}
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full md:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <AiOutlinePlus className="text-lg" />
          <span>{t('tasks.createTask')}</span>
        </button>
      </form>
    </div>
  );
};

export default TaskForm;