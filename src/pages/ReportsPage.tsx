import React, { useEffect, useState } from 'react';
import { getTasks, Task, getSessions, Session } from '../services/api';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface ChartData {
  title: string;
  totalPomodoros: number;
}

const ReportsPage: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [tasks, sessions] = await Promise.all([getTasks(), getSessions()]);
      const chartData: ChartData[] = tasks.map((task: Task) => {
        const totalPomodoros = sessions.filter((s: Session) => s.taskId === task._id && s.type === 'focus').length;
        return { title: task.title, totalPomodoros };
      });
      setData(chartData);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-gray-800">Báo cáo Pomodoro theo công việc</h1>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="title" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalPomodoros" name="Số Pomodoro" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600">Chưa có dữ liệu để hiển thị báo cáo.</p>
      )}
    </div>
  );
};

export default ReportsPage; 