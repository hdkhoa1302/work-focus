import React, { useEffect, useState } from 'react';
import { getTasks, getSessions, Task, Session } from '../services/api';
import { 
  AiOutlineCheckCircle, 
  AiOutlineClockCircle, 
  AiOutlineFire, 
  AiOutlineCalendar,
  AiOutlineTrophy
} from 'react-icons/ai';
import { FiTarget } from 'react-icons/fi';

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    todayPomodoros: 0,
    totalPomodoros: 0,
    focusTime: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksData, sessionsData] = await Promise.all([getTasks(), getSessions()]);
        setTasks(tasksData);
        setSessions(sessionsData);

        // Calculate stats
        const completedTasks = tasksData.filter(task => task.status === 'done').length;
        const totalPomodoros = sessionsData.filter(s => s.type === 'focus').length;
        
        // Today's pomodoros
        const today = new Date().toDateString();
        const todayPomodoros = sessionsData.filter(s => 
          s.type === 'focus' && new Date(s.startTime).toDateString() === today
        ).length;

        // Total focus time in minutes
        const focusTime = sessionsData
          .filter(s => s.type === 'focus')
          .reduce((total, s) => total + (s.duration || 0), 0);

        setStats({
          totalTasks: tasksData.length,
          completedTasks,
          todayPomodoros,
          totalPomodoros,
          focusTime: Math.round(focusTime / 60) // Convert to minutes
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    }
    fetchData();
  }, []);

  const recentTasks = tasks
    .filter(task => task.status !== 'done')
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 5);

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-blue-100 text-lg">Ready to boost your productivity today?</p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <AiOutlineFire className="text-4xl text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTasks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <FiTarget className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.completedTasks}</p>
              <p className="text-sm text-green-600 dark:text-green-400">{completionRate.toFixed(1)}% completion rate</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <AiOutlineCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Pomodoros</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.todayPomodoros}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AiOutlineFire className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Focus Time</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.focusTime}m</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <AiOutlineClockCircle className="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Tasks</h2>
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              View All
            </button>
          </div>
          
          {recentTasks.length > 0 ? (
            <div className="space-y-4">
              {recentTasks.map(task => (
                <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      task.status === 'done' ? 'bg-green-500' :
                      task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{task.description || 'No description'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId: task._id } }))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FiTarget className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No tasks yet. Create your first task to get started!</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Quick Actions</h2>
          
          <div className="space-y-4">
            <button className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200">
              <FiTarget className="text-xl" />
              <span className="font-medium">Create New Task</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200">
              <AiOutlineFire className="text-xl" />
              <span className="font-medium">Start Focus Session</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200">
              <AiOutlineTrophy className="text-xl" />
              <span className="font-medium">View Reports</span>
            </button>
          </div>

          {/* Achievement Badge */}
          {stats.todayPomodoros >= 4 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-white">
              <div className="flex items-center space-x-3">
                <AiOutlineTrophy className="text-2xl" />
                <div>
                  <p className="font-bold">Achievement Unlocked!</p>
                  <p className="text-sm opacity-90">Productive Day - 4+ Pomodoros</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;