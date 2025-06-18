import React, { useEffect, useState } from 'react';
import { getTasks, deleteTask, updateTask, Task, getSessions, Session } from '../services/api';
import TaskForm from '../components/TaskForm';
import TaskDetailModal from '../components/TaskDetailModal';
import { AiOutlineDelete, AiOutlineEye, AiOutlineEdit } from 'react-icons/ai';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import useLanguage from '../hooks/useLanguage';

const TasksPage: React.FC = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'deadline'>('created');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksData, sessionsData] = await Promise.all([getTasks(), getSessions()]);
        setTasks(tasksData);
        setSessions(sessionsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    fetchData();
    window.addEventListener('tasks-updated', fetchData);
    window.ipc?.on('timer-done', fetchData);
    return () => {
      window.removeEventListener('tasks-updated', fetchData);
      window.ipc?.removeListener('timer-done', fetchData);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('tasks.deleteTaskConfirm'))) {
      try {
        await deleteTask(id);
        setTasks(prev => prev.filter(t => t._id !== id));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    try {
      const updatedTask = await updateTask(id, { status });
      setTasks(prev => prev.map(t => t._id === id ? updatedTask : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    setSelectedTask(updatedTask);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return (b.priority || 0) - (a.priority || 0);
      case 'deadline':
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    }
  });

  const getTaskProgress = (taskId: string) => {
    const completed = sessions.filter(s => s.taskId === taskId && s.type === 'focus').length;
    const task = tasks.find(t => t._id === taskId);
    const estimated = task?.estimatedPomodoros || 1;
    return { completed, estimated, percentage: (completed / estimated) * 100 };
  };

  const getPriorityColor = (priority: number = 0) => {
    switch (priority) {
      case 3: return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
      case 2: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
      case 1: return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: number = 0) => {
    switch (priority) {
      case 3: return 'Urgent';
      case 2: return 'High';
      case 1: return 'Medium';
      default: return 'Low';
    }
  };

  const getStatusColor = (status: string = 'todo') => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'in-progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    handleStatusChange(draggableId, destination.droppableId as Task['status']);
  };

  // Group tasks by explicit statuses
  const statuses = ['todo', 'in-progress', 'done'] as const;
  type Status = typeof statuses[number];
  const tasksByStatus: Record<Status, Task[]> = {
    todo: tasks.filter(t => t.status === 'todo'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('tasks.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('tasks.manageTasks')}</p>
        </div>
        {/* Toolbar: TaskForm only */}
        <div><TaskForm onSave={task => setTasks(prev => [task, ...prev])} /></div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statuses.map((status: Status) => (
          <Droppable droppableId={status} key={status}>
            {(provided: DroppableProvided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                   className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  {t(`kanban.${status === 'in-progress' ? 'inProgress' : status}`)}
                </h2>
                {tasksByStatus[status].map((task: Task, index: number) => {
                  const { completed, estimated, percentage } = getTaskProgress(task._id);
                  return (
                    <Draggable draggableId={task._id} index={index} key={task._id}>
                      {(provided: DraggableProvided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                             className="mb-3 p-4 rounded-lg border shadow-sm bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer group">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 flex-1 mr-2">{task.title}</h3>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(task);
                                }}
                                className="p-1 text-blue-500 hover:text-blue-700 rounded"
                                title="Xem chi tiết"
                              >
                                <AiOutlineEye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(task._id);
                                }}
                                className="p-1 text-red-500 hover:text-red-700 rounded"
                                title="Xóa"
                              >
                                <AiOutlineDelete className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          
                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
                                  {tag}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                  +{task.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Progress: {completed}/{estimated}</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-3">
                            <div className="bg-green-500 h-1 rounded-full transition-all duration-300"
                                 style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>

                          {/* Priority & Status */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status === 'todo' ? 'Cần làm' : task.status === 'in-progress' ? 'Đang làm' : 'Hoàn thành'}
                            </span>
                          </div>

                          {status === 'in-progress' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId: task._id, projectId: task.projectId } }));
                              }}
                              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-center text-sm font-medium transition-colors"
                            >
                              Start
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(task);
                              }}
                              className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-center text-sm font-medium transition-colors"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={showTaskDetail}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onUpdate={handleUpdateTask}
          onDelete={() => {
            setTasks(prev => prev.filter(t => t._id !== selectedTask._id));
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onStart={() => window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId: selectedTask._id, projectId: selectedTask.projectId } }))}
        />
      )}
    </div>
    </DragDropContext>
  );
};

export default TasksPage;