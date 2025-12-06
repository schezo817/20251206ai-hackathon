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

  const getSeverityStyle = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-gradient-to-br from-green-50 via-green-100 to-emerald-50 dark:from-green-900/20 dark:via-green-800/10 dark:to-emerald-900/20',
          border: 'border border-green-200/50 dark:border-green-700/30',
          text: 'text-green-800 dark:text-green-200',
          icon: '🌟',
          title: 'とても良い調子です！',
          glow: 'shadow-green-200/50 dark:shadow-green-500/20'
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-50 dark:from-yellow-900/20 dark:via-yellow-800/10 dark:to-amber-900/20',
          border: 'border border-yellow-200/50 dark:border-yellow-700/30',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: '⚡',
          title: '少し注意が必要です',
          glow: 'shadow-yellow-200/50 dark:shadow-yellow-500/20'
        };
      case 'high':
        return {
          bg: 'bg-gradient-to-br from-red-50 via-red-100 to-rose-50 dark:from-red-900/20 dark:via-red-800/10 dark:to-rose-900/20',
          border: 'border border-red-200/50 dark:border-red-700/30',
          text: 'text-red-800 dark:text-red-200',
          icon: '🚨',
          title: '休憩をお勧めします',
          glow: 'shadow-red-200/50 dark:shadow-red-500/20'
        };
    }
  };

  if (!isDetecting) {
    return (
      <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
            <div className="text-white text-2xl">🤖</div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">AIケアアシスタント</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Claude Powered</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="relative inline-block mb-6">
            <div className="text-6xl animate-pulse">🌟</div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full blur-xl opacity-20 animate-ping"></div>
          </div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">準備完了</h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
            カメラを開始すると、あなたの表情をリアルタイム分析し、<br />
            パーソナライズされたケアメッセージをお届けします
          </p>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>AI待機中</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800 rounded-3xl shadow-xl p-8 border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl animate-pulse">
            <div className="text-white text-2xl">🤖</div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">AIケアアシスタント</h3>
            <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">分析中...</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="relative inline-block mb-6">
            <div className="text-5xl animate-spin">🧠</div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
          </div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">AIが思考中</h4>
          <p className="text-gray-600 dark:text-gray-400">あなたの表情データを分析し、最適なケアメッセージを生成しています...</p>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentMessage) {
    return (
      <div className="bg-gradient-to-br from-white via-indigo-50 to-white dark:from-gray-800 dark:via-indigo-900/20 dark:to-gray-800 rounded-3xl shadow-xl p-8 border border-indigo-100 dark:border-indigo-800/30">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
            <div className="text-white text-2xl">🤖</div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">AIケアアシスタント</h3>
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">観察中</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="relative inline-block mb-6">
            <div className="text-5xl animate-pulse">👁️</div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-600 rounded-full blur-xl opacity-25 animate-ping"></div>
          </div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">表情分析中</h4>
          <p className="text-gray-600 dark:text-gray-400">リアルタイムで疲労度をモニタリングしています...</p>
          <div className="mt-6">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">スキャンニング</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const style = getSeverityStyle(currentMessage.severity);
  
  return (
    <div className={`${style.bg} rounded-3xl shadow-xl p-8 ${style.border} ${style.glow} transform transition-all duration-500 hover:scale-[1.02]`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-4 bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-700/80 dark:to-gray-600/40 rounded-2xl backdrop-blur-sm shadow-lg">
          <div className="text-3xl animate-bounce">{style.icon}</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">AIケアアシスタント</h3>
              <p className={`text-sm font-semibold ${style.text}`}>{style.title}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">最終更新</div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-gray-600/10 rounded-2xl"></div>
        <div className="relative bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 backdrop-blur-sm border border-white/50 dark:border-gray-600/50 shadow-inner">
          <div className="flex items-start space-x-4">
            <div className="text-4xl transform transition-transform hover:scale-110 cursor-pointer">
              💬
            </div>
            <div className="flex-1">
              <div className={`text-lg font-medium mb-4 leading-relaxed ${style.text}`}>
                {currentMessage.message}
              </div>
              
              {currentMessage.suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">💡</div>
                    <p className={`text-sm font-semibold ${style.text}`}>おすすめアクション</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentMessage.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center space-x-3 bg-white/70 dark:bg-gray-700/70 rounded-xl p-3 backdrop-blur-sm border border-white/60 dark:border-gray-600/60 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{suggestion}</span>
                        <div className="text-xs">✨</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 脈動効果 */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent dark:via-gray-400/5 animate-pulse pointer-events-none"></div>
    </div>
  );
}