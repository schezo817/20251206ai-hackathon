import { useState, useEffect } from 'react';
import { FatigueMetrics } from '@/lib/faceDetection';
import { ClaudeCarePlanner, CareMessage, UserContext } from '@/lib/claude';

interface CareMessagePanelProps {
  metrics: FatigueMetrics | null;
  isDetecting: boolean;
}

export default function CareMessagePanel({ metrics, isDetecting }: CareMessagePanelProps) {
  const [currentMessage, setCurrentMessage] = useState<CareMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [workStartTime] = useState(Date.now());
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!metrics || !isDetecting) return;

    const updateMessage = async () => {
      setScoreHistory(prev => [...prev.slice(-9), metrics.fatigueScore]);

      if (metrics.fatigueScore > 25) {
        setIsLoading(true);
        
        const context: UserContext = {
          currentTime: new Date().toLocaleTimeString('ja-JP'),
          workDuration: Math.floor((Date.now() - workStartTime) / (1000 * 60)),
          scoreHistory: scoreHistory,
          previousMessages: []
        };

        try {
          const message = await ClaudeCarePlanner.generateCareMessage(metrics, context);
          setCurrentMessage(message);
        } catch (error) {
          console.error('Failed to generate care message:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (metrics.fatigueScore < 20) {
        setCurrentMessage({
          message: '調子良さそうですね！このペースで頑張ってください 😊',
          severity: 'low',
          suggestions: ['水分補給を忘れずに', '良いペースを維持しましょう']
        });
      }
    };

    const debounceTimer = setTimeout(updateMessage, 2000);
    return () => clearTimeout(debounceTimer);
  }, [metrics, isDetecting, scoreHistory, workStartTime]);

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return '😊';
      case 'medium':
        return '😐';
      case 'high':
        return '😴';
    }
  };

  if (!isDetecting) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">AIケアアシスタント</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-gray-500 dark:text-gray-400">
            カメラを開始すると、あなたの表情から疲労度を判断し、<br />
            適切なケアメッセージをお届けします
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">AIケアアシスタント</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">ケアメッセージを生成中...</p>
        </div>
      </div>
    );
  }

  if (!currentMessage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">AIケアアシスタント</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">👀</div>
          <p className="text-gray-500 dark:text-gray-400">あなたの表情を分析中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">AIケアアシスタント</h3>
      
      <div className={`rounded-lg border-2 p-4 mb-4 ${getSeverityColor(currentMessage.severity)}`}>
        <div className="flex items-start space-x-3">
          <div className="text-2xl">
            {getSeverityIcon(currentMessage.severity)}
          </div>
          <div className="flex-1">
            <p className="font-medium mb-2 text-gray-800 dark:text-gray-200">{currentMessage.message}</p>
            {currentMessage.suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">おすすめの行動:</p>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  {currentMessage.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
        最終更新: {new Date().toLocaleTimeString('ja-JP')}
      </div>
    </div>
  );
}