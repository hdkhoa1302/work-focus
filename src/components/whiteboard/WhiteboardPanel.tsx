import React, { useState } from 'react';
import { AiOutlineBulb, AiOutlineEdit, AiOutlineDelete, AiOutlineCheck, AiOutlineClose, AiOutlineFilter, AiOutlineSearch } from 'react-icons/ai';
import { FiFilter, FiPlus, FiCheckCircle, FiClock, FiAlertTriangle, FiEdit3 } from 'react-icons/fi';
import useWhiteboardStore, { WhiteboardItem } from '../../stores/whiteboardStore';
import WhiteboardItemForm from './WhiteboardItemForm';
import WhiteboardItemDetail from './WhiteboardItemDetail';

const WhiteboardPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'project' | 'note' | 'decision'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WhiteboardItem | null>(null);
  const [editingItem, setEditingItem] = useState<WhiteboardItem | null>(null);
  
  // Use the whiteboard store
  const items = useWhiteboardStore(state => state.items);
  const updateItem = useWhiteboardStore(state => state.updateItem);
  const deleteItem = useWhiteboardStore(state => state.deleteItem);

  const filteredItems = items.filter(item => {
    // Apply type filter
    if (filter !== 'all' && item.type !== filter) return false;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    
    return true;
  });

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <FiCheckCircle className="text-blue-500" />;
      case 'note': return <AiOutlineBulb className="text-green-500" />;
      case 'decision': return <FiClock className="text-purple-500" />;
      default: return <AiOutlineBulb className="text-gray-500" />;
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    }
  };

  const handleStatusChange = (item: WhiteboardItem, newStatus: 'pending' | 'confirmed' | 'completed') => {
    updateItem(item.id, { status: newStatus });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Whiteboard</h2>
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('project')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                filter === 'project'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setFilter('note')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                filter === 'note'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setFilter('decision')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                filter === 'decision'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Decisions
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <AiOutlineSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search whiteboard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Whiteboard Items Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <AiOutlineBulb className="text-5xl mb-4" />
            <p className="text-lg font-medium">No items found</p>
            <p className="text-sm">Start by adding a note, decision, or project to your whiteboard</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getItemTypeIcon(item.type)}
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getItemStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                  {item.description}
                </p>
                
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatDate(item.createdAt)}</span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                      }}
                      className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <FiEdit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this item?')) {
                          deleteItem(item.id);
                        }
                      }}
                      className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <AiOutlineDelete className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Form Modal */}
      {showAddForm && (
        <WhiteboardItemForm
          onClose={() => setShowAddForm(false)}
          onSave={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Item Form Modal */}
      {editingItem && (
        <WhiteboardItemForm
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={() => setEditingItem(null)}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <WhiteboardItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={() => {
            setEditingItem(selectedItem);
            setSelectedItem(null);
          }}
          onDelete={() => {
            if (window.confirm('Are you sure you want to delete this item?')) {
              deleteItem(selectedItem.id);
              setSelectedItem(null);
            }
          }}
          onStatusChange={(newStatus) => {
            handleStatusChange(selectedItem, newStatus);
          }}
        />
      )}
    </div>
  );
};

export default WhiteboardPanel;