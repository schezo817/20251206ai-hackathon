import { FatigueMetrics, FATIGUE_THRESHOLDS } from '@/lib/faceDetection';

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

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score < FATIGUE_THRESHOLDS.FATIGUE_SCORE.LOW) return 'text-green-600';
    if (score < FATIGUE_THRESHOLDS.FATIGUE_SCORE.HIGH) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score: number) => {
    if (score < FATIGUE_THRESHOLDS.FATIGUE_SCORE.LOW) return 'bg-green-100 dark:bg-green-900/30';
    if (score < FATIGUE_THRESHOLDS.FATIGUE_SCORE.HIGH) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getAttentionColor = (level: number) => {
    if (level >= FATIGUE_THRESHOLDS.ATTENTION.HIGH) return 'text-green-600';
    if (level >= FATIGUE_THRESHOLDS.ATTENTION.MEDIUM) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStressColor = (level: number) => {
    if (level < FATIGUE_THRESHOLDS.STRESS.LOW) return 'text-green-600';
    if (level < FATIGUE_THRESHOLDS.STRESS.MEDIUM) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">疲労度メトリクス</h3>
      
      {/* メイン疲労スコア */}
      <div className={`rounded-lg p-4 mb-4 ${getScoreBackgroundColor(metrics.fatigueScore)} dark:bg-opacity-20`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">疲労スコア</span>
            <span className={`text-xs ${getTrendColor(metrics.trend)}`}>
              {getTrendIcon(metrics.trend)}
            </span>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${getScoreColor(metrics.fatigueScore || 0)}`}>
              {(metrics.fatigueScore || 0).toFixed(1)}
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              信頼度: {(metrics.confidenceLevel || 0).toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                (metrics.fatigueScore || 0) < FATIGUE_THRESHOLDS.FATIGUE_SCORE.LOW ? 'bg-green-500' : 
                (metrics.fatigueScore || 0) < FATIGUE_THRESHOLDS.FATIGUE_SCORE.HIGH ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.fatigueScore || 0))}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 新しいメトリクス：注意レベルとストレスレベル */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            注意レベル
          </div>
          <div className={`text-lg font-semibold mt-1 ${getAttentionColor(metrics.attentionLevel || 0)}`}>
            {(metrics.attentionLevel || 0).toFixed(1)}%
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1 mt-1">
            <div 
              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${metrics.attentionLevel || 0}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
          <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
            ストレスレベル
          </div>
          <div className={`text-lg font-semibold mt-1 ${getStressColor(metrics.stressLevel || 0)}`}>
            {(metrics.stressLevel || 0).toFixed(1)}%
          </div>
          <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-1 mt-1">
            <div 
              className="h-1 bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${metrics.stressLevel || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 微睡とヘッドポーズ */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3">
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            微睡イベント
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">
              {metrics.microSleepEvents || 0}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">回</span>
            {(metrics.microSleepEvents || 0) > 0 && <span className="text-red-500">⚠️</span>}
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
            頭部姿勢
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
            <div>ヨー: {(metrics.headPose?.yaw || 0).toFixed(1)}°</div>
            <div>ピッチ: {(metrics.headPose?.pitch || 0).toFixed(1)}°</div>
          </div>
        </div>
      </div>

      {/* 詳細メトリクス */}
      <details className="mb-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          詳細メトリクス表示
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              目の開き具合 (EAR)
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {(metrics.eyeAspectRatio || 0).toFixed(3)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              まばたき頻度
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {metrics.blinkFrequency || 0}/分
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              口角の位置
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {(metrics.mouthCurveRatio || 0).toFixed(3)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              眉の位置
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {(metrics.eyebrowPosition || 0).toFixed(1)}
            </div>
          </div>
        </div>
        
        {/* 表情分析 */}
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            表情分析
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2">
              <div className="text-yellow-600 dark:text-yellow-400">😊 幸福</div>
              <div className="text-yellow-800 dark:text-yellow-200 font-semibold">
                {((metrics.expressionScores?.happy || 0) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
              <div className="text-blue-600 dark:text-blue-400">😐 中立</div>
              <div className="text-blue-800 dark:text-blue-200 font-semibold">
                {((metrics.expressionScores?.neutral || 0) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
              <div className="text-gray-600 dark:text-gray-400">😢 悲哀</div>
              <div className="text-gray-800 dark:text-gray-200 font-semibold">
                {((metrics.expressionScores?.sad || 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </details>
      
      {/* アラート表示 */}
      {((metrics.fatigueScore || 0) > FATIGUE_THRESHOLDS.FATIGUE_SCORE.HIGH || (metrics.microSleepEvents || 0) > 2) && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <span className="text-red-700 dark:text-red-300 font-medium text-sm">
              {(metrics.fatigueScore || 0) > FATIGUE_THRESHOLDS.FATIGUE_SCORE.CRITICAL ? 
                '重度の疲労が検出されました。直ちに休憩してください。' :
                '高い疲労レベルが検出されました。休憩を推奨します。'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}