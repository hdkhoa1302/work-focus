import React from 'react';
import { AiOutlineFire, AiOutlineCoffee } from 'react-icons/ai';
import { FiPlay, FiPause, FiRefreshCw, FiMaximize2 } from 'react-icons/fi';

interface CompactTimerCardProps {
  remaining: number;
  mode: 'focus' | 'break';
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onExpand: () => void;
  selectedTaskTitle?: string;
}

const CompactTimerCard: React.FC<CompactTimerCardProps> = ({
  remaining,
  mode,
  isRunning,
  onStart,
  onPause,
  onResume,
  onExpand,
  selectedTaskTitle
}) => {
  const minutes = Math.floor(remaining / 1000 / 60).toString().padStart(2, '0');
  const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between">
        {/* Mode & Task Info */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${mode === 'focus' ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
            {mode === 'focus' ? (
              <AiOutlineFire className={`w-5 h-5 ${mode === 'focus' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
            ) : (
              <AiOutlineCoffee className={`w-5 h-5 ${mode === 'focus' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'focus' ? 'Focus' : 'Break'}
            </p>
            {selectedTaskTitle && mode === 'focus' && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-32">
                {selectedTaskTitle}
              </p>
            )}
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">
              {minutes}:{seconds}
            </span>
            <div className={`w-full h-1 rounded-full mt-1 ${mode === 'focus' ? 'bg-red-200 dark:bg-red-800' : 'bg-green-200 dark:bg-green-800'}`}>
              <div 
                className={`h-1 rounded-full transition-all duration-1000 ${mode === 'focus' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: '25%' }} // Example progress
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                onClick={onStart}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
              >
                <FiPlay className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200"
              >
                <FiPause className="w-4 h-4" />
              </button>
            )}
            
            {!isRunning && remaining > 0 && (
              <button
                onClick={onResume}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                <FiRefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onExpand}
              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <FiMaximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactTimerCard;