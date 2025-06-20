import React, { useState, useEffect } from 'react';
import { Task, Project } from '../services/api';
import { AiOutlineClockCircle, AiOutlineWarning, AiOutlineClose } from 'react-icons/ai';
import { FiClock } from 'react-icons/fi';

interface DelayedTaskNotificationProps {
  tasks: Task[];
  projects: Project[];
}

const DelayedTaskNotification: React.FC<DelayedTaskNotificationProps> = ({ tasks, projects }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [acknowledgedDelays, setAcknowledgedDelays] = useState<Record<string, boolean>>({});
  const [confirmText, setConfirmText] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Load acknowledged delays from localStorage
    const savedAcknowledged = localStorage.getItem('acknowledgedDelayedTasks');
    if (savedAcknowledged) {
      setAcknowledgedDelays(JSON.parse(savedAcknowledged));
    }

    // Check if there are unacknowledged delayed tasks
    const hasUnacknowledgedTasks = tasks.some(task => !acknowledgedDelays[task._id]);
    
    if (hasUnacknowledgedTasks) {
      // Show notification after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  useEffect(() => {
    setIsValid(confirmText === 'Tôi đã hiểu');
  }, [confirmText]);

  const handleClose = () => {
    if (isValid) {
      // Mark all tasks as acknowledged
      const newAcknowledged = { ...acknowledgedDelays };
      tasks.forEach(task => {
        newAcknowledged[task._id] = true;
      });
      
      setAcknowledgedDelays(newAcknowledged);
      localStorage.setItem('acknowledgedDelayedTasks', JSON.stringify(newAcknowledged));
      
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        setConfirmText('');
        setShowError(false);
      }, 300);
    } else {
      setShowError(true);
    }
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p._id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getHoursUntilDeadline = (deadline: string): number => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  };

  if (!isVisible || tasks.length === 0) return null;

  return (
    <div className={`fixed bottom-4 left-4 max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-yellow-300 dark:border-yellow-700 overflow-hidden transition-all duration-300 transform ${isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <FiClock className="text-lg" />
            </div>
            <h3 className="font-semibold">Công việc sắp đến hạn</h3>
          </div>
          <button
            onClick={() => setShowError(true)}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <AiOutlineClose className="text-lg" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <p className="text-gray-700 dark:text-gray-300">
            Bạn có <strong>{tasks.length}</strong> công việc sắp đến hạn trong vòng 24 giờ tới:
          </p>
        </div>

        <div className="max-h-40 overflow-y-auto mb-4 space-y-2">
          {tasks.map(task => (
            <div key={task._id} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {getProjectName(task.projectId)}
                  </p>
                </div>
                <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                  {Math.floor(getHoursUntilDeadline(task.deadline!))} giờ
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Để xác nhận bạn đã hiểu, vui lòng nhập chính xác: "Tôi đã hiểu"
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              if (showError) setShowError(false);
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200 ${
              showError
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
            } text-gray-900 dark:text-gray-100`}
            placeholder="Tôi đã hiểu"
          />
          {showError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Vui lòng nhập chính xác "Tôi đã hiểu" để xác nhận
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isValid
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-300 text-gray-700 cursor-not-allowed'
            }`}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default DelayedTaskNotification;