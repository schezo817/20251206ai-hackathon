import { useState, useEffect } from 'react';
import { FatigueMetrics } from '@/lib/faceDetection';
import { ClaudeCarePlanner, CareMessage, UserContext } from '@/lib/claude';
import { SessionData, SessionSummary } from '@/types/session';

interface CareMessagePanelProps {
  metrics: FatigueMetrics | null;
  isDetecting: boolean;
  session?: SessionData | null;
  sessionSummary?: SessionSummary | null;
}

export default function CareMessagePanel({ metrics, isDetecting, session, sessionSummary }: CareMessagePanelProps) {
  const [currentMessage, setCurrentMessage] = useState<CareMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [workStartTime] = useState(Date.now());
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [sessionCompletionMessage, setSessionCompletionMessage] = useState<{message: string, suggestions: string[]} | null>(null);
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);

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

  // セッション完了時のGemini APIメッセージ取得
  useEffect(() => {
    if (session?.status === 'completed' && sessionSummary && !sessionCompletionMessage) {
      setIsLoadingCompletion(true); // 即座にローディング状態を設定
      
      const generateSessionCompletionMessage = async () => {
        
        try {
          const prompt = `セッション完了レポート:
計測時間: ${sessionSummary.duration.toFixed(1)}分
平均疲労度: ${sessionSummary.stats.avgFatigueScore.toFixed(1)}%
最大疲労度: ${sessionSummary.stats.maxFatigueScore.toFixed(1)}%
疲労トレンド: ${sessionSummary.stats.fatigueProgress === 'improving' ? '改善' : 
                sessionSummary.stats.fatigueProgress === 'declining' ? '悪化' : '安定'}
注意力低下回数: ${sessionSummary.stats.attentionDropCount}回
ストレスピーク回数: ${sessionSummary.stats.stressPeakCount}回
微睡イベント: ${sessionSummary.stats.totalMicroSleepEvents}回

このセッション結果を総合的に評価し、具体的で実用的なアドバイスをください。`;

          const response = await fetch('/api/care-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
          });

          if (response.ok) {
            const data = await response.json();
            
            setSessionCompletionMessage({
              message: data.message,
              suggestions: data.suggestions || []
            });
          } else {
            throw new Error(`API Error: ${response.status}`);
          }
        } catch (error) {
          console.error('Failed to generate session completion message:', error);
          // フォールバックメッセージ
          setSessionCompletionMessage({
            message: `お疲れ様でした！平均疲労度${sessionSummary.stats.avgFatigueScore.toFixed(1)}%で1分間のセッションが完了しました。適度な休憩を心がけ、次回のセッションに備えましょう。`,
            suggestions: ['5-10分の休憩を取る', '水分補給を心がける', '軽いストレッチをする']
          });
        } finally {
          // ローディングを遅延させて、必ずメッセージが表示されるようにする
          setTimeout(() => {
            setIsLoadingCompletion(false);
          }, 500);
        }
      };

      generateSessionCompletionMessage();
    }
  }, [session?.status, sessionSummary, sessionCompletionMessage]);

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

  // セッション完了時の特別表示
  if (session?.status === 'completed' && sessionSummary) {
    return (
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 rounded-3xl shadow-xl p-8 border border-green-200/50 dark:border-green-700/30">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
            <div className="text-white text-2xl">🎉</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">セッション完了！</h3>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">1分間の計測が完了しました</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">計測時間</div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {sessionSummary.duration.toFixed(1)}分
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 backdrop-blur-sm border border-white/50 dark:border-gray-600/50 shadow-inner">
          <div className="space-y-6">
            {/* セッション結果サマリー */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl">📊</div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">計測結果</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">平均疲労度</div>
                  <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {sessionSummary.stats.avgFatigueScore.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 text-center">
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">最大疲労度</div>
                  <div className="text-lg font-bold text-red-800 dark:text-red-200">
                    {sessionSummary.stats.maxFatigueScore.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 text-center">
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">注意低下</div>
                  <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    {sessionSummary.stats.attentionDropCount}回
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3 text-center">
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">ストレスピーク</div>
                  <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
                    {sessionSummary.stats.stressPeakCount}回
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini AIからのセッション完了メッセージ */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl">🤖</div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">AIケアアシスタント</h4>
                <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                  <span className="text-xs text-white font-medium">Gemini</span>
                </div>
              </div>
              
              {isLoadingCompletion ? (
                <div className="bg-gradient-to-r from-blue-50/70 via-purple-50/50 to-blue-50/70 dark:from-blue-900/30 dark:via-purple-900/20 dark:to-blue-900/30 rounded-xl p-6 backdrop-blur-sm border border-blue-200/60 dark:border-blue-700/60 shadow-lg">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <div className="text-3xl animate-spin">🧠</div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-blue-800 dark:text-blue-200 font-bold text-lg">AIが分析中...</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">セッション結果を総合評価しています</div>
                    </div>
                  </div>
                  
                  {/* 進捗アニメーション */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">疲労度データ解析中...</div>
                    </div>
                    <div className="flex items-center space-x-2" style={{animationDelay: '0.3s'}}>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">パーソナライズメッセージ生成中...</div>
                    </div>
                    <div className="flex items-center space-x-2" style={{animationDelay: '0.6s'}}>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="text-xs text-green-700 dark:text-green-300">アドバイス策定中...</div>
                    </div>
                  </div>
                  
                  {/* 進捗バー */}
                  <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-2 rounded-full" 
                         style={{
                           width: '70%',
                           animation: 'progressBar 2s ease-in-out infinite alternate'
                         }}>
                    </div>
                  </div>
                  
                  {/* CSS アニメーション定義 */}
                  <style jsx>{`
                    @keyframes progressBar {
                      from { width: 30%; }
                      to { width: 90%; }
                    }
                  `}</style>
                  
                  <div className="mt-3 text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Powered by <span className="font-bold text-blue-600 dark:text-blue-400">Gemini AI</span>
                    </div>
                  </div>
                </div>
              ) : sessionCompletionMessage ? (
                <div className="bg-gradient-to-r from-blue-50/70 to-purple-50/70 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl p-4 backdrop-blur-sm border border-blue-200/60 dark:border-blue-700/60">
                  <div className="mb-4">
                    <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                      {sessionCompletionMessage.message}
                    </p>
                  </div>
                  {sessionCompletionMessage.suggestions && sessionCompletionMessage.suggestions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">おすすめアクション:</h5>
                      <div className="space-y-2">
                        {sessionCompletionMessage.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-white/60 dark:bg-gray-700/60 rounded-lg p-2">
                            <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50/70 dark:bg-gray-700/70 rounded-xl p-4 backdrop-blur-sm border border-gray-200/60 dark:border-gray-600/60">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">AIメッセージを生成中...</p>
                </div>
              )}
            </div>

            {/* AIからの推奨事項 */}
            {sessionSummary.recommendations.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="text-2xl">💡</div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">追加の推奨事項</h4>
                </div>
                <div className="space-y-3">
                  {sessionSummary.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 bg-white/70 dark:bg-gray-700/70 rounded-xl p-4 backdrop-blur-sm border border-white/60 dark:border-gray-600/60">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mt-2 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{recommendation}</span>
                      <div className="text-lg">✨</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 改善提案 */}
            {sessionSummary.scoreImprovementSuggestions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="text-2xl">🚀</div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">改善のヒント</h4>
                </div>
                <div className="space-y-2">
                  {sessionSummary.scoreImprovementSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-center space-x-3 bg-green-50/70 dark:bg-green-900/30 rounded-lg p-3 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-800 dark:text-green-200">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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