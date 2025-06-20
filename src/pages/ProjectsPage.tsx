import React, { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject, deleteProject, getTasks, Project, getProjectProgress, ProjectProgressAnalysis } from '../services/api';
import { FiTrash2, FiEdit, FiArrowLeft, FiPlusCircle, FiCheckCircle, FiClock, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { AiOutlineCalendar, AiOutlineClockCircle, AiOutlineWarning, AiOutlineEdit } from 'react-icons/ai';
import KanbanBoard from '../components/kanban/KanbanBoard';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import useLanguage from '../hooks/useLanguage';
import ProjectProgressCard from '../components/ProjectProgressCard';
import ProjectDeadlineForm from '../components/ProjectDeadlineForm';

const ProjectsPage: React.FC = () => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => localStorage.getItem('selectedProjectId'));
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [canComplete, setCanComplete] = useState<Record<string, boolean>>({});
  const [showProgressCard, setShowProgressCard] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectProgress, setProjectProgress] = useState<ProjectProgressAnalysis | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('selectedProjectId', selectedProjectId);
    } else {
      localStorage.removeItem('selectedProjectId');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    projects.forEach(p => {
      getTasks(p._id).then(tasks => {
        const can = tasks.length > 0 && tasks.every(t => t.status === 'done');
        setCanComplete(prev => ({ ...prev, [p._id]: can }));
      }).catch(err => console.error('Failed to fetch tasks for project', err));
    });
  }, [projects]);

  const handleComplete = async (id: string) => {
    try {
      const updated = await updateProject(id, { completed: true, status: 'done' });
      setProjects(prev => prev.map(p => p._id === id ? updated : p));
    } catch (err) {
      console.error('Failed to complete project', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const project = await createProject({ name: newName.trim() });
      setProjects(prev => [project, ...prev]);
      setNewName('');
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const project = await updateProject(id, { name: editingName.trim() });
      setProjects(prev => prev.map(p => p._id === id ? project : p));
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      console.error('Failed to update project', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dự án này không?')) return;
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    try {
      const updatedProject = await updateProject(draggableId, { status: destination.droppableId as 'todo' | 'in-progress' | 'done' });
      setProjects(prev => prev.map(p => p._id === draggableId ? updatedProject : p));
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  const handleViewProgress = async (project: Project) => {
    setSelectedProject(project);
    setShowProgressCard(true);
    setIsLoadingProgress(true);
    
    try {
      const progress = await getProjectProgress(project._id);
      setProjectProgress(progress);
    } catch (error) {
      console.error('Failed to fetch project progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const handleEditDeadline = (project: Project) => {
    setSelectedProject(project);
    setShowDeadlineForm(true);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p._id === updatedProject._id ? updatedProject : p));
    setShowDeadlineForm(false);
    setSelectedProject(null);
  };

  if (selectedProjectId) {
    const project = projects.find(p => p._id === selectedProjectId);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedProjectId(null)} 
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-300 group"
          >
            <FiArrowLeft className="w-4 h-4 group-hover:transform group-hover:-translate-x-1 transition-transform duration-300" />
            <span>{t('projects.backToProjects')}</span>
          </button>
          <div className="flex items-center space-x-3">
            {project?.deadline && (
              <div className="flex items-center space-x-1 text-sm">
                <AiOutlineCalendar className="text-blue-500" />
                <span>
                  Deadline: {new Date(project.deadline).toLocaleDateString('vi-VN')}
                </span>
              </div>
            )}
            <button
              onClick={() => handleEditDeadline(project!)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Cập nhật deadline"
            >
              <AiOutlineEdit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewProgress(project!)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Xem tiến độ"
            >
              <FiTrendingUp className="w-4 h-4" />
            </button>
            {project?.completed ? (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <FiCheckCircle className="w-4 h-4 mr-1" />
                {t('projects.completed')}
              </span>
            ) : null}
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/30">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-1">
            {project?.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('projects.manageProjectTasks')}
          </p>
          <KanbanBoard
            projectId={selectedProjectId}
            onCreateTask={() => {
              window.dispatchEvent(new Event('create-task'));
              window.dispatchEvent(new Event('tasks-updated'));
            }}
            onStartTask={(taskId) => window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId, projectId: selectedProjectId } }))}
          />
        </div>

        {/* Project Progress Card */}
        {showProgressCard && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-2xl w-full">
              <ProjectProgressCard 
                projectId={selectedProject._id} 
                onClose={() => {
                  setShowProgressCard(false);
                  setSelectedProject(null);
                  setProjectProgress(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Project Deadline Form */}
        {showDeadlineForm && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-md w-full">
              <ProjectDeadlineForm 
                project={selectedProject}
                onUpdate={handleUpdateProject}
                onCancel={() => {
                  setShowDeadlineForm(false);
                  setSelectedProject(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const statuses = ['todo', 'in-progress', 'done'] as const;
  type Status = typeof statuses[number];

  const statusConfig = {
    todo: {
      title: t('kanban.todo'),
      color: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800',
      headerColor: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600'
    },
    'in-progress': {
      title: t('kanban.inProgress'),
      color: 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900',
      headerColor: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-800 dark:to-indigo-800',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-300 dark:border-blue-700'
    },
    done: {
      title: t('kanban.done'),
      color: 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900',
      headerColor: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-800 dark:to-emerald-800',
      textColor: 'text-green-700 dark:text-green-300',
      borderColor: 'border-green-300 dark:border-green-700'
    }
  };

  const projectsByStatus: Record<Status, Project[]> = {
    todo: projects.filter(p => !p.status || p.status === 'todo'),
    'in-progress': projects.filter(p => p.status === 'in-progress'),
    done: projects.filter(p => p.status === 'done' || p.completed),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">{t('projects.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('projects.manageProjects')}</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <input
            type="text"
            placeholder={t('projects.newProjectName')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all duration-300 hover:shadow-md"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className={`px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:translate-y-[-1px] flex items-center space-x-2 ${
              !newName.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FiPlusCircle className="w-4 h-4" />
            <span>{t('projects.createProject')}</span>
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400">{t('projects.noProjectsFirst')}</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {statuses.map((status) => {
                const config = statusConfig[status];
                const statusProjects = projectsByStatus[status];

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
                              {statusProjects.length}
                            </span>
                          </div>
                        </div>

                        {/* Projects */}
                        <div className="p-4 space-y-3 min-h-[200px]">
                          {statusProjects.map((project, index) => (
                            <Draggable draggableId={project._id} index={index} key={project._id}>
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
                                  <div 
                                    className={`group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
                                      editingId === project._id 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' 
                                        : ''
                                    }`}
                                  >
                                    {editingId === project._id ? (
                                      <div className="flex-1 flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={editingName}
                                          onChange={e => setEditingName(e.target.value)}
                                          className="flex-1 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-xl px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleUpdate(project._id)}
                                          disabled={!editingName.trim()}
                                          className={`px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md ${
                                            !editingName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                        >
                                          Lưu
                                        </button>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-300 shadow-sm hover:shadow-md"
                                        >
                                          Hủy
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex-1" onClick={() => setSelectedProjectId(project._id)}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                              <span className="text-gray-900 dark:text-gray-100 font-medium">{project.name}</span>
                                              {project.completed && (
                                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded-full border border-green-200 dark:border-green-800/50">
                                                  Hoàn thành
                                                </span>
                                              )}
                                              {project.priority === 3 && (
                                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full border border-red-200 dark:border-red-800/50">
                                                  Ưu tiên cao
                                                </span>
                                              )}
                                            </div>
                                            
                                            {project.deadline && (
                                              <div className="flex items-center mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                <AiOutlineCalendar className="mr-1" />
                                                <span>
                                                  {new Date(project.deadline).toLocaleDateString('vi-VN')}
                                                </span>
                                              </div>
                                            )}
                                            
                                            {project.estimatedHours > 0 && (
                                              <div className="flex items-center mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                <AiOutlineClockCircle className="mr-1" />
                                                <span>
                                                  {project.estimatedHours} giờ ước tính
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewProgress(project);
                                              }}
                                              className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                                              title="Xem tiến độ"
                                            >
                                              <FiTrendingUp className="w-4 h-4" />
                                            </button>
                                            
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditDeadline(project);
                                              }}
                                              className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                                              title="Cập nhật deadline"
                                            >
                                              <FiCalendar className="w-4 h-4" />
                                            </button>
                                            
                                            {!project.completed && canComplete[project._id] && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleComplete(project._id);
                                                }}
                                                className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 text-sm shadow-sm hover:shadow-md transform hover:translate-y-[-1px] opacity-0 group-hover:opacity-100"
                                              >
                                                Hoàn thành
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => { 
                                                e.stopPropagation();
                                                setEditingId(project._id); 
                                                setEditingName(project.name); 
                                              }}
                                              className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                                              title="Chỉnh sửa dự án"
                                            >
                                              <FiEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(project._id);
                                              }}
                                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                                              title="Xóa dự án"
                                            >
                                              <FiTrash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {statusProjects.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-pulse">
                              <p className="text-sm">Không có dự án trong {config.title.toLowerCase()}</p>
                              {status === 'todo' && (
                                <button
                                  onClick={() => {
                                    const inputElement = document.querySelector('input[placeholder="Tên dự án mới"]') as HTMLInputElement;
                                    if (inputElement) inputElement.focus();
                                  }}
                                  className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-all duration-300 hover:underline"
                                >
                                  Tạo dự án đầu tiên
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
        )}
      </div>

      {/* Project Progress Modal */}
      {showProgressCard && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full">
            <ProjectProgressCard 
              projectId={selectedProject._id} 
              onClose={() => {
                setShowProgressCard(false);
                setSelectedProject(null);
                setProjectProgress(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Project Deadline Form Modal */}
      {showDeadlineForm && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full">
            <ProjectDeadlineForm 
              project={selectedProject}
              onUpdate={handleUpdateProject}
              onCancel={() => {
                setShowDeadlineForm(false);
                setSelectedProject(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;