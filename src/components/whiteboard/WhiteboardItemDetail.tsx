import React from 'react';
import { AiOutlineClose, AiOutlineEdit, AiOutlineDelete, AiOutlineTag, AiOutlineCalendar } from 'react-icons/ai';
import { FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { WhiteboardItem } from '../../stores/whiteboardStore';

interface WhiteboardItemDetailProps {
  item: WhiteboardItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: 'pending' | 'confirmed' | 'completed') => void;
}

const WhiteboardItemDetail: React.FC<WhiteboardItemDetailProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <FiCheckCircle className="text-blue-500 w-5 h-5" />;
      case 'note': return <AiOutlineTag className="text-green-500 w-5 h-5" />;
      case 'decision': return <FiClock className="text-purple-500 w-5 h-5" />;
      default: return <AiOutlineTag className="text-gray-500 w-5 h-5" />;
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadge = (priority?: number) => {
    if (!priority) return null;
    
    switch (priority) {
      case 3:
        return <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">High Priority</span>;
      case 2:
        return <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full">Medium Priority</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">Low Priority</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {getItemTypeIcon(item.type)}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{item.title}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-0.5 text-xs rounded-full ${getItemStatusColor(item.status)}`}>
                  {item.status}
                </span>
                {getPriorityBadge(item.priority)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{item.description}</p>
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <AiOutlineCalendar className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Created: {formatDate(item.createdAt)}</span>
            </div>
            
            {item.type === 'project' && (
              <div className="flex items-center space-x-2">
                <FiAlertTriangle className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  This project can be created in the AI chat
                </span>
              </div>
            )}
          </div>

          {/* Status Change Buttons */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Change Status</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onStatusChange('pending')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => onStatusChange('confirmed')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.status === 'confirmed'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => onStatusChange('completed')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-300 dark:border-green-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onDelete}
              className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center space-x-2"
            >
              <AiOutlineDelete className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <AiOutlineEdit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardItemDetail;