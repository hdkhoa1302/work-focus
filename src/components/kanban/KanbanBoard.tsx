import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { getTasks, updateTask, deleteTask, Task, getSessions, Session } from '../../services/api';
import KanbanCard from './KanbanCard';
import { AiOutlinePlus, AiOutlineFilter, AiOutlineSearch } from 'react-icons/ai';
import { FiGrid, FiList } from 'react-icons/fi';
import useLanguage from '../../hooks/useLanguage';

interface KanbanBoardProps {
  onCreateTask: () => void;
  onStartTask: (taskId: string) => void;
  projectId?: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onCreateTask, onStartTask, projectId }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isLoading, setIsLoading] = useState(true);

  const statuses = ['todo', 'in-progress', 'done'] as const;
  type Status = typeof statuses[number];

  const statusConfig = {
    todo: {
      title: 'To Do',
      color: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800',
      headerColor: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600'
    },
    'in-progress': {
      title: 'In Progress',
      color: 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900',
      headerColor: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-800 dark:to-indigo-800',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-300 dark:border-blue-700'
    },
    done: {
      title: 'Done',
      color: 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900',
      headerColor: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-800 dark:to-emerald-800',
      textColor: 'text-green-700 dark:text-green-300',
      borderColor: 'border-green-300 dark:border-green-700'
    }
  };

  useEffect(() => {
    fetchData();
    const handleTasksUpdated = () => fetchData();
    window.addEventListener('tasks-updated', handleTasksUpdated);
    window.ipc?.on('timer-done', handleTasksUpdated);
    return () => {
      window.removeEventListener('tasks-updated', handleTasksUpdated);
      window.ipc?.removeListener('timer-done', handleTasksUpdated);
    };
  }, [projectId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksData, sessionsData] = await Promise.all([getTasks(projectId), getSessions()]);
      setTasks(tasksData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
        setTasks(prev => prev.filter(t => t._id !== id));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    try {
      const updatedTask = await updateTask(draggableId, { status: destination.droppableId as Status });
      setTasks(prev => prev.map(t => t._id === draggableId ? updatedTask : t));
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getTaskProgress = (taskId: string) => {
    const completed = sessions.filter(s => s.taskId === taskId && s.type === 'focus').length;
    const task = tasks.find(t => t._id === taskId);
    const estimated = task?.estimatedPomodoros || 1;
    return { completed, estimated, percentage: Math.min((completed / estimated) * 100, 100) };
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === null || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const tasksByStatus: Record<Status, Task[]> = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">{t('tasks.title')}</h1>
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md transition-all duration-300 ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md transform scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md transform scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <AiOutlineSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('tasks.searchTasks')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300 hover:shadow-md"
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={filterPriority || ''}
              onChange={(e) => setFilterPriority(e.target.value ? Number(e.target.value) : null)}
              className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <option value="">{t('tasks.priority.allPriorities')}</option>
              <option value="3">{t('tasks.priority.urgent')}</option>
              <option value="2">{t('tasks.priority.high')}</option>
              <option value="1">{t('tasks.priority.medium')}</option>
              <option value="0">{t('tasks.priority.low')}</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AiOutlineFilter className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Create Task Button */}
          <button
            onClick={onCreateTask}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:translate-y-[-2px]"
          >
            <AiOutlinePlus className="w-4 h-4" />
            <span>{t('tasks.createNewTask')}</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {statuses.map((status) => {
            const config = statusConfig[status];
            const statusTasks = tasksByStatus[status];

            return (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-lg ${
                      snapshot.isDraggingOver
                        ? `border-blue-300 dark:border-blue-600 ${config.color} bg-opacity-70`
                        : `${config.borderColor} ${config.color}`
                    }`}
                  >
                    {/* Column Header */}
                    <div className={`${config.headerColor} px-4 py-3 rounded-t-xl border-b ${config.borderColor}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${config.textColor}`}>
                          {config.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-700 shadow-inner ${config.textColor}`}>
                          {statusTasks.length}
                        </span>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="p-4 space-y-3 min-h-[200px]">
                      {statusTasks.map((task, index) => (
                        <Draggable draggableId={task._id} index={index} key={task._id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-all duration-300 ${
                                snapshot.isDragging
                                  ? 'rotate-2 scale-105 shadow-xl z-10'
                                  : 'hover:shadow-md hover:translate-y-[-2px]'
                              }`}
                            >
                              <KanbanCard
                                task={task}
                                progress={getTaskProgress(task._id)}
                                onDelete={() => handleDelete(task._id)}
                                onStart={() => onStartTask(task._id)}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {statusTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-pulse">
                          <p className="text-sm">{t('tasks.noTasks')} {config.title.toLowerCase()}</p>
                          {status === 'todo' && (
                            <button
                              onClick={onCreateTask}
                              className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-all duration-300 hover:underline"
                            >
                              {t('tasks.createFirstTask')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;