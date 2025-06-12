import React, { useEffect, useState } from 'react';
import { getTasks, Task, getSessions, Session } from '../services/api';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AiOutlineFire, AiOutlineClockCircle, AiOutlineTrophy, AiOutlineCalendar } from 'react-icons/ai';

interface ChartData {
  title: string;
  totalPomodoros: number;
  focusTime: number;
}

interface DailyData {
  date: string;
  pomodoros: number;
  focusTime: number;
}

const ReportsPage: React.FC = () => {
  const [taskData, setTaskData] = useState<ChartData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [stats, setStats] = useState({
    totalPomodoros: 0,
    totalFocusTime: 0,
    averageSessionLength: 0,
    mostProductiveDay: '',
    completionRate: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasks, sessions] = await Promise.all([getTasks(), getSessions()]);
        
        // Task-based chart data
        const chartData: ChartData[] = tasks.map((task: Task) => {
          const taskSessions = sessions.filter((s: Session) => s.taskId === task._id && s.type === 'focus');
          const totalPomodoros = taskSessions.length;
          const focusTime = taskSessions.reduce((total, s) => total + (s.duration || 0), 0);
          return { 
            title: task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title, 
            totalPomodoros,
            focusTime: Math.round(focusTime / 60) // Convert to minutes
          };
        }).filter(item => item.totalPomodoros > 0);

        // Daily data for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toDateString();
        }).reverse();

        const dailyStats: DailyData[] = last7Days.map(dateStr => {
          const daySessions = sessions.filter((s: Session) => 
            s.type === 'focus' && new Date(s.startTime).toDateString() === dateStr
          );
          return {
            date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            pomodoros: daySessions.length,
            focusTime: Math.round(daySessions.reduce((total, s) => total + (s.duration || 0), 0) / 60)
          };
        });

        // Calculate stats
        const focusSessions = sessions.filter(s => s.type === 'focus');
        const totalPomodoros = focusSessions.length;
        const totalFocusTime = Math.round(focusSessions.reduce((total, s) => total + (s.duration || 0), 0) / 60);
        const averageSessionLength = totalPomodoros > 0 ? Math.round(totalFocusTime / totalPomodoros) : 0;
        
        // Find most productive day
        const dayStats = dailyStats.reduce((max, day) => day.pomodoros > max.pomodoros ? day : max, dailyStats[0]);
        const mostProductiveDay = dayStats?.date || 'N/A';
        
        // Completion rate
        const completedTasks = tasks.filter(task => task.status === 'done').length;
        const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        setTaskData(chartData);
        setDailyData(dailyStats);
        setStats({
          totalPomodoros,
          totalFocusTime,
          averageSessionLength,
          mostProductiveDay,
          completionRate
        });
      } catch (error) {
        console.error('Failed to fetch report data:', error);
      }
    }
    fetchData();
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const pieData = taskData.map((item, index) => ({
    name: item.title,
    value: item.totalPomodoros,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your productivity and focus patterns</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <AiOutlineCalendar />
          <span>Last 7 days</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Pomodoros</p>
              <p className="text-3xl font-bold">{stats.totalPomodoros}</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <AiOutlineFire className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Focus Time</p>
              <p className="text-3xl font-bold">{stats.totalFocusTime}m</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <AiOutlineClockCircle className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Avg Session</p>
              <p className="text-3xl font-bold">{stats.averageSessionLength}m</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <AiOutlineTrophy className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">{stats.completionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <AiOutlineTrophy className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Progress Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Daily Progress</h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pomodoros" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  name="Pomodoros"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <p>No data available for the chart</p>
            </div>
          )}
        </div>

        {/* Task Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Task Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <p>No task data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Task Performance</h2>
        {taskData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pomodoros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Focus Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {taskData.map((task, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <AiOutlineFire className="text-orange-500" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {task.totalPomodoros}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <AiOutlineClockCircle className="text-blue-500" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {task.focusTime}m
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                          style={{ width: `${Math.min((task.totalPomodoros / Math.max(...taskData.map(t => t.totalPomodoros))) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AiOutlineTrophy className="text-4xl mx-auto mb-4" />
            <p>No task performance data available yet.</p>
            <p className="text-sm">Complete some Pomodoro sessions to see your progress!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;