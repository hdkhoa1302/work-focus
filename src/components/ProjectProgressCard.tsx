import React, { useState, useEffect } from 'react';
import { getProjectProgress, ProjectProgressAnalysis } from '../services/api';
import { 
  AiOutlineClockCircle, 
  AiOutlineWarning, 
  AiOutlineCheckCircle,
  AiOutlineFire,
  AiOutlineCalendar,
  AiOutlineArrowUp,
  AiOutlineArrowDown
} from 'react-icons/ai';
import { FiAlertTriangle, FiClock, FiTarget, FiTrendingUp } from 'react-icons/fi';

interface ProjectProgressCardProps {
  projectId: string;
  onClose?: () => void;
}

const ProjectProgressCard: React.FC<ProjectProgressCardProps> = ({ projectId, onClose }) => {
  const [analysis, setAnalysis] = useState<ProjectProgressAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [projectId]);

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProjectProgress(projectId);
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to fetch project analysis:', err);
      setError('Không thể tải phân tích dự án');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300';
      default: return 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <FiAlertTriangle className="w-5 h-5" />;
      case 'high': return <AiOutlineWarning className="w-5 h-5" />;
      case 'medium': return <FiClock className="w-5 h-5" />;
      default: return <AiOutlineCheckCircle className="w-5 h-5" />;
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'Nguy cơ cao';
      case 'high': return 'Rủi ro cao';
      case 'medium': return 'Cần chú ý';
      default: return 'Ổn định';
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} phút`;
    }
    return `${hours.toFixed(1)} giờ`;
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Quá hạn ${Math.abs(diffDays)} ngày`, color: 'text-red-600 dark:text-red-400' };
    } else if (diffDays === 0) {
      return { text: 'Hết hạn hôm nay', color: 'text-orange-600 dark:text-orange-400' };
    } else if (diffDays === 1) {
      return { text: 'Hết hạn ngày mai', color: 'text-yellow-600 dark:text-yellow-400' };
    } else if (diffDays <= 7) {
      return { text: `Còn ${diffDays} ngày`, color: 'text-blue-600 dark:text-blue-400' };
    } else {
      return { text: `Còn ${diffDays} ngày`, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center text-red-600 dark:text-red-400">
          <AiOutlineWarning className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'Không thể tải dữ liệu'}</p>
          <button
            onClick={fetchAnalysis}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const { project, analysis: projectAnalysis } = analysis;
  const deadline = project.deadline ? formatDeadline(project.deadline) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Phân tích tiến độ dự án
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {project.name}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineClockCircle className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Risk Status */}
      <div className={`flex items-center space-x-3 p-4 rounded-xl ${getRiskColor(projectAnalysis.riskLevel)}`}>
        {getRiskIcon(projectAnalysis.riskLevel)}
        <div>
          <p className="font-semibold">{getRiskLabel(projectAnalysis.riskLevel)}</p>
          <p className="text-sm opacity-90">
            {projectAnalysis.isOnTrack ? 'Dự án đang tiến triển đúng kế hoạch' : 'Dự án có nguy cơ trễ deadline'}
          </p>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FiTarget className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiến độ</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {projectAnalysis.completionPercentage.toFixed(1)}%
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${projectAnalysis.completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AiOutlineClockCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Thời gian</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatHours(projectAnalysis.totalActualHours)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            / {formatHours(projectAnalysis.totalEstimatedHours)} ước tính
          </div>
        </div>
      </div>

      {/* Deadline Info */}
      {deadline && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AiOutlineCalendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</span>
            </div>
            <span className={`text-sm font-medium ${deadline.color}`}>
              {deadline.text}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {new Date(project.deadline!).toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      )}

      {/* Work Requirements */}
      {projectAnalysis.daysRemaining > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FiClock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Cần làm/ngày</span>
            </div>
            <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
              {formatHours(projectAnalysis.requiredDailyHours)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {projectAnalysis.requiredDailyHours > analysis.workSchedule.hoursPerDay ? (
                <span className="flex items-center">
                  <AiOutlineArrowUp className="w-3 h-3 mr-1 text-red-500" />
                  Vượt {formatHours(projectAnalysis.requiredDailyHours - analysis.workSchedule.hoursPerDay)}/ngày
                </span>
              ) : (
                <span className="flex items-center">
                  <AiOutlineArrowDown className="w-3 h-3 mr-1 text-green-500" />
                  Dưới mức bình thường
                </span>
              )}
            </div>
          </div>

          <div className={`${
            projectAnalysis.overtimeRequired > 0 
              ? 'bg-red-50 dark:bg-red-900/20' 
              : 'bg-green-50 dark:bg-green-900/20'
          } rounded-lg p-4`}>
            <div className="flex items-center space-x-2 mb-2">
              <AiOutlineFire className="w-4 h-4 text-red-500" />
              <span className={`text-sm font-medium ${
                projectAnalysis.overtimeRequired > 0 
                  ? 'text-red-700 dark:text-red-300' 
                  : 'text-green-700 dark:text-green-300'
              }`}>
                OT cần thiết
              </span>
            </div>
            <div className={`text-xl font-bold ${
              projectAnalysis.overtimeRequired > 0 
                ? 'text-red-800 dark:text-red-200' 
                : 'text-green-800 dark:text-green-200'
            }`}>
              {projectAnalysis.overtimeRequired > 0 
                ? formatHours(projectAnalysis.overtimeRequired)
                : 'Không cần OT'}
            </div>
            {projectAnalysis.overtimeRequired > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                Cần làm thêm giờ để kịp deadline
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">Khuyến nghị:</h4>
        {projectAnalysis.recommendations.map((rec, index) => (
          <div key={index} className="flex items-start space-x-2">
            <div className="mt-1 text-blue-500">•</div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectProgressCard;