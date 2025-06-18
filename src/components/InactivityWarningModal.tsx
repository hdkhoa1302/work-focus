import React, { useState, useEffect } from 'react';
import { AiOutlineClockCircle, AiOutlineWarning, AiOutlineClose, AiOutlineCoffee } from 'react-icons/ai';
import { FiAlertTriangle, FiClock, FiCoffee } from 'react-icons/fi';

interface InactivityWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  inactiveHours: number;
  pendingTasks: Array<{ id: string; title: string }>;
  lastActivityTime: Date;
}

const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  onClose,
  inactiveHours,
  pendingTasks,
  lastActivityTime
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
      // Save acknowledgment to localStorage
      const itemId = `inactivity-${Date.now()}`;
      const savedAcknowledged = localStorage.getItem('acknowledgedInactivity');
      const acknowledged = savedAcknowledged ? JSON.parse(savedAcknowledged) : {};
      acknowledged[itemId] = {
        timestamp: new Date().toISOString(),
        inactiveHours
      };
      localStorage.setItem('acknowledgedInactivity', JSON.stringify(acknowledged));
      
      // Dispatch event for other components to react
      window.dispatchEvent(new CustomEvent('inactivity-acknowledged', {
        detail: {
          itemId,
          inactiveHours,
          lastActivityTime
        }
      }));
      
      // Notify main process
      window.ipc?.send('acknowledge-notification', `inactivity-warning-${Date.now()}`);
      
      // Update last activity time
      window.ipc?.send('user-activity');
      
      onClose();
      setConfirmText('');
      setShowError(false);
    } else {
      setShowError(true);
      setAnimateShake(true);
      setTimeout(() => setAnimateShake(false), 500);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden ${animateShake ? 'animate-shake' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <FiCoffee className="text-xl" />
              </div>
              <h2 className="text-lg font-bold">Cảnh báo không hoạt động</h2>
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
            <AiOutlineWarning className="text-orange-500 text-xl mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                Bạn đã không hoạt động trong một thời gian dài!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Lần cuối hoạt động: <strong>{formatTime(lastActivityTime)}</strong> ngày <strong>{formatDate(lastActivityTime)}</strong>
              </p>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-3 mb-2">
              <AiOutlineClockCircle className="text-orange-500" />
              <span className="font-medium text-orange-700 dark:text-orange-300">
                Thời gian không hoạt động
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Bạn đã không thực hiện phiên Pomodoro nào trong:
              </div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {inactiveHours} giờ
              </div>
            </div>
          </div>

          {pendingTasks.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <FiClock className="text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    Công việc đang chờ xử lý:
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                    {pendingTasks.map((task, index) => (
                      <li key={task.id} className="truncate">
                        {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

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
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200 ${
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
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
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

export default InactivityWarningModal;