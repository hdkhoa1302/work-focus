import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiTarget, FiClipboard, FiStar, FiClock, FiCheckCircle } from 'react-icons/fi';
import { AiOutlineTrophy, AiOutlineRocket, AiOutlineBulb, AiOutlineFlag, AiOutlineCheckSquare } from 'react-icons/ai';
import useTaskStore from '../stores/taskStore';
import useProjectStore from '../stores/projectStore';
import useSessionStore from '../stores/sessionStore';
import useWhiteboardStore from '../stores/whiteboardStore';

const AnalysisPanel: React.FC = () => {
  const tasks = useTaskStore(state => state.tasks);
  const projects = useProjectStore(state => state.projects);
  const sessions = useSessionStore(state => state.sessions);
  const whiteboardItems = useWhiteboardStore(state => state.items);

  // Calculate statistics
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const activeProjects = projects.filter(p => !p.completed).length;
  const focusSessions = sessions.filter(s => s.type === 'focus');
  const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
  const averageSessionLength = focusSessions.length > 0 ? totalFocusTime / focusSessions.length : 0;

  // Today's stats
  const today = new Date().toDateString();
  const todayPomodoros = focusSessions.filter(s => 
    new Date(s.startTime).toDateString() === today
  ).length;
  const todayCompletedTasks = tasks.filter(t => 
    t.status === 'done' && new Date(t.updatedAt || t.createdAt).toDateString() === today
  ).length;

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          📊 Phân tích Productivity
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Cập nhật: {new Date().toLocaleString('vi-VN')}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h4 className="text-lg font-semibold mb-4">🌟 Hôm nay</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{todayPomodoros}</div>
            <div className="text-blue-100 text-sm">Pomodoro</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{todayCompletedTasks}</div>
            <div className="text-blue-100 text-sm">Tasks hoàn thành</div>
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Dự án đang thực hiện</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeProjects}</p>
            </div>
            <FiTarget className="text-2xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Tỷ lệ hoàn thành</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completionRate.toFixed(1)}%</p>
            </div>
            <FiTrendingUp className="text-2xl text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Mục whiteboard</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{whiteboardItems.length}</p>
            </div>
            <FiClipboard className="text-2xl text-purple-500" />
          </div>
        </div>
      </div>

      {/* Focus Time Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <FiClock className="mr-2" />
          Phân tích thời gian tập trung
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{focusSessions.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tổng Pomodoro</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(totalFocusTime / 60)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Phút tập trung</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(averageSessionLength / 60)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Phút/phiên TB</div>
          </div>
        </div>
      </div>

      {/* Whiteboard Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📋 Phân tích Whiteboard
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {['project', 'note', 'decision'].map(type => {
            const count = whiteboardItems.filter(item => item.type === type).length;
            const label = type === 'project' ? 'Dự án' : 
                         type === 'note' ? 'Ghi chú' : 'Quyết định';
            return (
              <div key={type} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          {whiteboardItems.filter(item => item.status === 'pending').length > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AiOutlineFlag className="text-yellow-500 mt-1" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">Cần xử lý</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Bạn có {whiteboardItems.filter(item => item.status === 'pending').length} mục đang chờ xử lý trên whiteboard.
                </p>
              </div>
            </div>
          )}

          {whiteboardItems.filter(item => item.type === 'decision' && item.status === 'pending').length > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <AiOutlineBulb className="text-purple-500 mt-1" />
              <div>
                <p className="font-medium text-purple-800 dark:text-purple-300">Quyết định cần đưa ra</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Có {whiteboardItems.filter(item => item.type === 'decision' && item.status === 'pending').length} quyết định quan trọng đang chờ bạn xem xét.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          💡 Nhận xét từ AI
        </h4>
        
        <div className="space-y-4">
          {completionRate >= 80 && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <AiOutlineTrophy className="text-green-500 mt-1" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">Xuất sắc!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Tỷ lệ hoàn thành task rất cao ({completionRate.toFixed(1)}%). Bạn đang làm việc rất hiệu quả!
                </p>
              </div>
            </div>
          )}

          {completionRate < 50 && totalTasks > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AiOutlineRocket className="text-yellow-500 mt-1" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">Cần cải thiện</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Tỷ lệ hoàn thành chỉ {completionRate.toFixed(1)}%. Hãy tập trung hoàn thành các task đã tạo để nâng cao hiệu suất!
                </p>
              </div>
            </div>
          )}

          {activeProjects > 5 && (
            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <AiOutlineBulb className="text-blue-500 mt-1" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-300">Gợi ý</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Bạn có {activeProjects} dự án đang thực hiện. Hãy ưu tiên hoàn thành một số dự án trước khi bắt đầu dự án mới.
                </p>
              </div>
            </div>
          )}

          {todayPomodoros >= 8 && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <FiStar className="text-green-500 mt-1" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">Tuyệt vời!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Bạn đã hoàn thành {todayPomodoros} Pomodoro hôm nay. Đây là một ngày làm việc rất productive!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🏆 Thành tích gần đây
        </h4>
        
        <div className="space-y-3">
          {tasks.filter(t => t.status === 'done').slice(0, 5).map((task) => (
            <div key={task._id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <FiCheckCircle className="text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {projects.find(p => p._id === task.projectId)?.name || 'Dự án không xác định'}
                </p>
              </div>
              <FiStar className="text-yellow-500" />
            </div>
          ))}
          
          {tasks.filter(t => t.status === 'done').length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AiOutlineCheckSquare className="text-4xl mx-auto mb-2" />
              <p>Chưa có task nào được hoàn thành.</p>
              <p className="text-sm">Hãy bắt đầu làm việc để tích lũy thành tích!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel; 