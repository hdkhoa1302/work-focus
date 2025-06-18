import React, { useEffect, useState } from 'react';
import { getEncouragement, EncouragementResponse } from '../services/api';
import { AiOutlineClose, AiOutlineTrophy, AiOutlineHeart, AiOutlineRocket, AiOutlineStar } from 'react-icons/ai';
import { FiStar, FiAward, FiTarget } from 'react-icons/fi';

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
  const [showAchievements, setShowAchievements] = useState(false);

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
      
      // Show achievements animation if there are any
      if (response.achievements && response.achievements.length > 0) {
        setTimeout(() => setShowAchievements(true), 1000);
      }
    } catch (error) {
      console.error('Failed to fetch encouragement:', error);
      setEncouragement({
        message: '🎉 Chúc mừng bạn đã hoàn thành task! Tiếp tục phát huy nhé!',
        achievements: [],
        stats: {
          completedTasks: 0,
          totalSessions: 0,
          todayTasks: 0,
          taskSessions: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header with celebration animation */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 animate-pulse"></div>
          
          {/* Floating celebration elements */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 2) * 20}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '2s'
                }}
              >
                <FiStar className="text-yellow-300 text-lg opacity-80" />
              </div>
            ))}
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center animate-pulse">
                  <AiOutlineTrophy className="text-2xl animate-bounce" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Task Completed!</h2>
                  <p className="text-green-100 text-sm">Great job on your progress!</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <AiOutlineClose className="text-xl" />
              </button>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 line-clamp-2">"{taskTitle}"</h3>
              <div className="flex justify-center space-x-1">
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
            <div className="space-y-6">
              {/* Main encouragement message */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start space-x-3">
                  <AiOutlineHeart className="text-red-500 text-xl mt-1 flex-shrink-0" />
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                    {encouragement.message}
                  </div>
                </div>
              </div>

              {/* Stats Display */}
              {encouragement.stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {encouragement.stats.completedTasks}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Total Tasks
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {encouragement.stats.todayTasks}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Today's Tasks
                    </div>
                  </div>
                </div>
              )}

              {/* Achievements */}
              {encouragement.achievements && encouragement.achievements.length > 0 && (
                <div className={`transition-all duration-1000 ${showAchievements ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <FiAward className="text-purple-600 dark:text-purple-400 text-xl" />
                      <h4 className="font-bold text-purple-800 dark:text-purple-300">
                        🏆 Achievements Unlocked!
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {encouragement.achievements.map((achievement, index) => (
                        <div 
                          key={index}
                          className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                          style={{ animationDelay: `${index * 0.2}s` }}
                        >
                          <AiOutlineStar className="text-yellow-500 flex-shrink-0" />
                          <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">
                            {achievement}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Motivational Quote */}
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                <FiTarget className="text-blue-500 text-2xl mx-auto mb-2" />
                <p className="text-sm italic text-gray-600 dark:text-gray-400">
                  "Success is the sum of small efforts repeated day in and day out."
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">- Robert Collier</p>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:translate-y-[-1px] flex items-center justify-center space-x-2"
            >
              <AiOutlineRocket className="text-lg" />
              <span>Tiếp tục làm việc!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncouragementModal;