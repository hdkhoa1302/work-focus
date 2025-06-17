import React, { useState, useRef, useEffect } from 'react';
import { AiOutlineClockCircle, AiOutlineMinus, AiOutlineClose, AiOutlineDrag } from 'react-icons/ai';
import { FiPlay, FiPause, FiRefreshCw, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

interface FloatingTimerProps {
  remaining: number;
  mode: 'focus' | 'break';
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
  selectedTaskTitle?: string;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({
  remaining,
  mode,
  isRunning,
  onStart,
  onPause,
  onResume,
  onClose,
  selectedTaskTitle
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [opacity, setOpacity] = useState(0.95);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const minutes = Math.floor(remaining / 1000 / 60).toString().padStart(2, '0');
  const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // Keep within screen bounds
      const maxX = window.innerWidth - (isMinimized ? 200 : 300);
      const maxY = window.innerHeight - (isMinimized ? 60 : 200);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setIsDragging(true);
    }
  };

  const timerStyle = {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    opacity,
    zIndex: isAlwaysOnTop ? 9999 : 1000,
    transition: isDragging ? 'none' : 'all 0.2s ease-in-out'
  };

  if (isMinimized) {
    return (
      <div
        style={timerStyle}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 cursor-move select-none"
        ref={dragRef}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${mode === 'focus' ? 'bg-red-500' : 'bg-green-500'} ${isRunning ? 'animate-pulse' : ''}`} />
          <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
            {minutes}:{seconds}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <FiMaximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <AiOutlineClose className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={timerStyle}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-80 select-none"
    >
      {/* Header */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between mb-4 cursor-move"
      >
        <div className="flex items-center space-x-2">
          <AiOutlineDrag className="text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'focus' ? 'Focus Session' : 'Break Time'}
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <FiMinimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <AiOutlineClose className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Task Info */}
      {mode === 'focus' && selectedTaskTitle && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Working on:</p>
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{selectedTaskTitle}</p>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 relative">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200 dark:text-gray-600"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * 0.25}`} // Example progress
                className={mode === 'focus' ? 'text-red-500' : 'text-green-500'}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">
                {minutes}:{seconds}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-3 mb-4">
        {!isRunning ? (
          <button
            onClick={onStart}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
          >
            <FiPlay className="w-4 h-4" />
            <span>Start</span>
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
          >
            <FiPause className="w-4 h-4" />
            <span>Pause</span>
          </button>
        )}
        
        {!isRunning && remaining > 0 && (
          <button
            onClick={onResume}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Resume</span>
          </button>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Opacity</span>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-20"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Always on top</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAlwaysOnTop}
              onChange={(e) => setIsAlwaysOnTop(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FloatingTimer;