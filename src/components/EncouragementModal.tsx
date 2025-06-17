import React, { useEffect, useState } from 'react';
import { getEncouragement, EncouragementResponse } from '../services/api';
import { AiOutlineClose, AiOutlineTrophy, AiOutlineHeart, AiOutlineRocket } from 'react-icons/ai';
import { FiStar } from 'react-icons/fi';

interface EncouragementModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

const EncouragementModal: React.FC<EncouragementModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle
}) => {
  const [encouragement, setEncouragement] = useState<EncouragementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchEncouragement();
    }
  }, [isOpen, taskId]);

  const fetchEncouragement = async () => {
    setIsLoading(true);
    try {
      const response = await getEncouragement(taskId);
      setEncouragement(response);
    } catch (error) {
      console.error('Failed to fetch encouragement:', error);
      setEncouragement({
        message: '🎉 Chúc mừng bạn đã hoàn thành task! Tiếp tục phát huy nhé!'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header with celebration animation */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <AiOutlineTrophy className="text-2xl animate-bounce" />
                <h2 className="text-xl font-bold">Task Completed!</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <AiOutlineClose className="text-xl" />
              </button>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">"{taskTitle}"</h3>
              <div className="flex justify-center space-x-2">
                {[...Array(5)].map((_, i) => (
                  <FiStar 
                    key={i} 
                    className="text-yellow-300 animate-pulse" 
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Đang tạo lời động viên...</p>
            </div>
          ) : encouragement ? (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AiOutlineHeart className="text-red-500 text-xl mt-1 flex-shrink-0" />
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {encouragement.message}
                  </div>
                </div>
              </div>

              {encouragement.achievement && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-3">
                    <AiOutlineRocket className="text-purple-600 dark:text-purple-400 text-xl" />
                    <div>
                      <p className="font-semibold text-purple-800 dark:text-purple-300">
                        🏆 Achievement Unlocked!
                      </p>
                      <p className="text-purple-600 dark:text-purple-400 text-sm">
                        {encouragement.achievement}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:translate-y-[-1px]"
            >
              Tiếp tục làm việc! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncouragementModal;