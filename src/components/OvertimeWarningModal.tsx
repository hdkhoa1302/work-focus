import React, { useState, useEffect } from 'react';
import { AiOutlineClockCircle, AiOutlineWarning, AiOutlineClose, AiOutlineFire } from 'react-icons/ai';
import { FiAlertTriangle } from 'react-icons/fi';

interface OvertimeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  overtimeHours: number;
  taskTitle?: string;
  projectName?: string;
  daysOverdue?: number;
  deadlineDate?: string;
}

const OvertimeWarningModal: React.FC<OvertimeWarningModalProps> = ({
  isOpen,
  onClose,
  overtimeHours,
  taskTitle,
  projectName,
  daysOverdue = 0,
  deadlineDate
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [showError, setShowError] = useState(false);
  const [animateShake, setAnimateShake] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    setIsValid(confirmText === 'Tôi đã hiểu');
  }, [confirmText]);

  // Countdown timer for confirmation requirement
  useEffect(() => {
    if (!isOpen) return;
    
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanClose(true);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isValid) {
      onClose();
      setConfirmText('');
      setShowError(false);
      
      // Save acknowledgment to localStorage
      const itemId = taskTitle ? `task-${taskTitle}` : projectName ? `project-${projectName}` : `ot-${Date.now()}`;
      const savedAcknowledged = localStorage.getItem('acknowledgedOvertimeItems');
      const acknowledged = savedAcknowledged ? JSON.parse(savedAcknowledged) : {};
      acknowledged[itemId] = {
        timestamp: new Date().toISOString(),
        overtimeHours,
        daysOverdue
      };
      localStorage.setItem('acknowledgedOvertimeItems', JSON.stringify(acknowledged));
      
      // Dispatch event for other components to react
      window.dispatchEvent(new CustomEvent('overtime-acknowledged', {
        detail: {
          itemId,
          overtimeHours,
          daysOverdue,
          taskTitle,
          projectName
        }
      }));
    } else {
      setShowError(true);
      setAnimateShake(true);
      setTimeout(() => setAnimateShake(false), 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden ${animateShake ? 'animate-shake' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="text-xl" />
              </div>
              <h2 className="text-lg font-bold">Cảnh báo OT</h2>
            </div>
            {canClose && (
              <button
                onClick={() => setShowError(true)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <AiOutlineClose className="text-lg" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <AiOutlineWarning className="text-red-500 text-xl mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                {taskTitle ? `Task "${taskTitle}" đang quá hạn` : projectName ? `Dự án "${projectName}" đang quá hạn` : 'Công việc đang quá hạn'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {daysOverdue > 0 ? `Đã quá hạn ${daysOverdue} ngày` : 'Đã quá hạn'}
                {deadlineDate && ` (Deadline: ${new Date(deadlineDate).toLocaleDateString('vi-VN')})`}
              </p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-3 mb-2">
              <AiOutlineClockCircle className="text-red-500" />
              <span className="font-medium text-red-700 dark:text-red-300">
                Thời gian OT cần thiết
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-600 dark:text-red-400">
                Để hoàn thành đúng tiến độ, bạn cần làm thêm:
              </div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">
                {overtimeHours.toFixed(1)} giờ
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-3">
              <AiOutlineFire className="text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-300">
                  Hậu quả nếu không hoàn thành đúng hạn:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                  <li>Ảnh hưởng đến tiến độ chung của dự án</li>
                  <li>Có thể gây chậm trễ các task phụ thuộc</li>
                  <li>Tăng áp lực và stress khi deadline đến gần</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 ${
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
                type="submit"
                disabled={!canClose}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isValid && canClose
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-700 cursor-not-allowed'
                }`}
              >
                {canClose ? 'Xác nhận' : `Vui lòng đợi (${countdown}s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OvertimeWarningModal;