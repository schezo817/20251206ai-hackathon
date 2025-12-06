import { FatigueMetrics } from '@/lib/faceDetection';

interface MetricsDisplayProps {
  metrics: FatigueMetrics | null;
  isDetecting: boolean;
}

export default function MetricsDisplay({ metrics, isDetecting }: MetricsDisplayProps) {
  if (!isDetecting) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">疲労度メトリクス</h3>
        <p className="text-gray-500 dark:text-gray-400">カメラを開始してください</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">疲労度メトリクス</h3>
        <p className="text-gray-500 dark:text-gray-400">顔を検出中...</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score: number) => {
    if (score < 30) return 'bg-green-100';
    if (score < 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">疲労度メトリクス</h3>
      
      <div className={`rounded-lg p-4 mb-4 ${getScoreBackgroundColor(metrics.fatigueScore)}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">疲労スコア</span>
          <span className={`text-2xl font-bold ${getScoreColor(metrics.fatigueScore)}`}>
            {metrics.fatigueScore.toFixed(1)}
          </span>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                metrics.fatigueScore < 30 ? 'bg-green-500' : 
                metrics.fatigueScore < 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, metrics.fatigueScore)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            目の開き具合 (EAR)
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {metrics.eyeAspectRatio.toFixed(3)}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            まばたき頻度
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {metrics.blinkFrequency}/分
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            口角の位置
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {metrics.mouthCurveRatio.toFixed(3)}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            眉の位置
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {metrics.eyebrowPosition.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}