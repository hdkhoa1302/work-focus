import React, { useState, useEffect } from 'react';
import { AiOutlineClockCircle, AiOutlineWarning, AiOutlineClose } from 'react-icons/ai';
import { FiAlertTriangle } from 'react-icons/fi';

interface TaskOverdueNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  daysOverdue: number;
  overtimeHours: number;
  type: 'task' | 'project';
  projectName?: string;
}

const TaskOverdueNotification: React.FC<TaskOverdueNotificationProps> = ({
  isOpen,
  onClose,
  title,
  daysOverdue,
  overtimeHours,
  type,
  projectName
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-red-300 dark:border-red-700 overflow-hidden transition-all duration-300 transform ${isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiAlertTriangle className="text-lg" />
            <h3 className="font-semibold">Cảnh báo OT</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <AiOutlineClose className="text-lg" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <AiOutlineWarning className="text-red-500 text-xl mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {type === 'task' ? 'Task' : 'Dự án'} "{title}" đang quá hạn
            </h4>
            {projectName && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dự án: {projectName}
              </p>
            )}
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Đã quá hạn {daysOverdue} ngày
            </p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AiOutlineClockCircle className="text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                OT cần thiết:
              </span>
            </div>
            <span className="font-bold text-red-700 dark:text-red-300">
              {overtimeHours.toFixed(1)} giờ
            </span>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskOverdueNotification;