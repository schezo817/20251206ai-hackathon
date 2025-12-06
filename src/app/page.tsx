'use client';

import { useState, useEffect } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import VideoDisplay from '@/components/VideoDisplay';
import MetricsDisplay from '@/components/MetricsDisplay';
import CareMessagePanel from '@/components/CareMessagePanel';
import ThemeToggle from '@/components/ThemeToggle';
import SessionHistoryModal from '@/components/SessionHistoryModal';
import { SessionStatus } from '@/types/session';

export default function FatigueCareApp() {
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [sessionAverageMetrics, setSessionAverageMetrics] = useState<{
    avgFatigueScore: number;
    avgBlinkFrequency: number;
    avgStressLevel: number;
  } | null>(null);
  
  const { 
    videoRef, 
    videoElement,
    isStreaming, 
    error: webcamError, 
    startStream, 
    stopStream 
  } = useWebcam();
  
  const { 
    isModelLoaded, 
    isDetecting, 
    currentMetrics, 
    error: detectionError, 
    startDetection, 
    stopDetection 
  } = useFaceDetection();
  
  // セッション履歴管理フック
  const { 
    addSession: addSessionToHistory, 
    history, 
    stats, 
    getFilteredHistory, 
    getTrendData 
  } = useSessionHistory();
  
  // セッション管理フック
  const {
    session,
    isSessionActive,
    sessionProgress,
    startSession: startSessionTracking,
    endSession: endSessionTracking,
    addMetricsData,
    getBaselineMetrics,
    getCurrentComparison,
    getSessionStats
  } = useSessionTracking({
    onSessionStart: (sessionId) => {
      console.log(`セッション開始: ${sessionId}`);
      setSessionAverageMetrics(null); // 新しいセッション開始時のみリセット
    },
    onBaselineComplete: (baselineMetrics) => {
      console.log('ベースライン測定完了:', baselineMetrics);
    },
    onActivePhaseStart: () => {
      console.log('アクティブ計測開始');
    },
    onSessionComplete: (summary) => {
      console.log('セッション完了:', summary);
      // セッション履歴に保存
      addSessionToHistory(summary);
      console.log('セッションを履歴に保存しました');
      
      // セッション完了時にカメラを自動で停止
      setTimeout(() => {
        console.log('セッション完了：カメラとアプリを自動終了');
        stopDetection();
        stopStream();
        setIsAppStarted(false);
        setSessionStartTime(null);
      }, 2000); // 2秒後にカメラ停止（ユーザーが結果を確認する時間を確保）
    },
    onDataUpdate: (dataPoint) => {
      // データ更新時の処理（オプション）
    },
    onStatusChange: (status) => {
      console.log(`セッション状態変更: ${status}`);
    }
  });

  const handleStartSession = async () => {
    try {
      console.log('Starting camera session...');
      await startStream();
      setSessionStartTime(new Date());
      setIsAppStarted(true);
      
      // セッション追跡開始
      await startSessionTracking({
        baselineDuration: 0,   // ベースラインなし
        activeDuration: 1,     // 1分計測
        dataCollectionInterval: 2000
      });
      
      console.log('Camera session started successfully');
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleStopSession = async () => {
    // セッション追跡終了
    if (isSessionActive) {
      await endSessionTracking();
    }
    
    stopDetection();
    stopStream();
    setIsAppStarted(false);
    setSessionStartTime(null);
  };

  useEffect(() => {
    console.log('=== MAIN COMPONENT STATE ===');
    console.log('isModelLoaded:', isModelLoaded);
    console.log('isAppStarted:', isAppStarted);
    console.log('isStreaming:', isStreaming);
    console.log('isDetecting:', isDetecting);
    console.log('videoElement:', !!videoElement);
    console.log('webcamError:', webcamError);
    console.log('detectionError:', detectionError);
    
    if (videoElement) {
      console.log('Video element details:', {
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        srcObject: !!videoElement.srcObject,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight
      });
    }
  }, [isModelLoaded, isAppStarted, isStreaming, isDetecting, webcamError, detectionError, videoElement]);

  useEffect(() => {
    if (isStreaming && videoElement && isModelLoaded) {
      console.log('Starting face detection...');
      startDetection(videoElement);
    }
  }, [isStreaming, isModelLoaded, startDetection, videoElement]);

  // メトリクスデータをセッション追跡に送信
  useEffect(() => {
    if (currentMetrics && isSessionActive) {
      addMetricsData(currentMetrics);
    }
  }, [currentMetrics, isSessionActive, addMetricsData]);

  // セッション中の平均値を定期的に更新
  useEffect(() => {
    if (session && session.metricsHistory.length > 0) {
      const history = session.metricsHistory;
      const avgFatigueScore = history.reduce((sum, h) => sum + h.metrics.fatigueScore, 0) / history.length;
      const avgBlinkFrequency = history.reduce((sum, h) => sum + h.metrics.blinkFrequency, 0) / history.length;
      const avgStressLevel = history.reduce((sum, h) => sum + h.metrics.stressLevel, 0) / history.length;
      
      setSessionAverageMetrics({
        avgFatigueScore,
        avgBlinkFrequency,
        avgStressLevel
      });
    }
    // 終了時は初期化しない - セッション完了後もデータを保持
  }, [session]);

  useEffect(() => {
    return () => {
      stopDetection();
      stopStream();
    };
  }, [stopDetection, stopStream]);

  const formatDuration = (startTime: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
  };

  // セッション状態表示用のテキスト取得
  const getSessionStatusText = (): { text: string; color: string; icon: string } => {
    if (!session) {
      return { text: '未開始', color: 'text-gray-600', icon: '⭕' };
    }
    
    switch (session.status) {
      case 'idle':
        return { text: '待機中', color: 'text-gray-600', icon: '⏸️' };
      case 'initializing':
        return { text: '初期化中', color: 'text-blue-600', icon: '🔄' };
      case 'active':
        return { text: '計測中', color: 'text-green-600', icon: '📊' };
      case 'completing':
        return { text: '分析中', color: 'text-orange-600', icon: '🧠' };
      case 'completed':
        return { text: '完了', color: 'text-purple-600', icon: '✅' };
      default:
        return { text: '不明', color: 'text-gray-600', icon: '❓' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">😊</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FatigueCare</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">表情認識メンタルケアシステム</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 履歴ボタン */}
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="relative bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all duration-200"
                title="セッション履歴を表示"
              >
                <span className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>履歴 ({history.length})</span>
                </span>
                {/* 新しいセッションがある場合の通知ドット */}
                {history.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </button>
              
              {/* セッション状態表示 */}
              {session && (
                <div className="bg-white dark:bg-gray-700 rounded-lg px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    {/* セッション状態 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSessionStatusText().icon}</span>
                      <div>
                        <div className={`text-sm font-medium ${getSessionStatusText().color}`}>
                          {getSessionStatusText().text}
                        </div>
                        {sessionStartTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDuration(sessionStartTime)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* セッション進捗バー（アクティブ時のみ） */}
                    {session.status === 'active' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${sessionProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem]">
                          {sessionProgress.toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    {/* 分析中表示（完了処理時のみ） */}
                    {session.status === 'completing' && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse text-orange-500">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          AIが分析中...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* レガシー表示（セッション未開始時） */}
              {sessionStartTime && !session && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    セッション時間: {formatDuration(sessionStartTime)}
                  </div>
                </div>
              )}
              
              <ThemeToggle />
              
              {!isAppStarted ? (
                <button
                  onClick={handleStartSession}
                  disabled={!isModelLoaded}
                  className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:shadow-md transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    {isModelLoaded ? (
                      <>
                        <span>🎥</span>
                        <span>セッション開始</span>
                      </>
                    ) : (
                      <>
                        <span className="animate-spin">⚡</span>
                        <span>モデル読み込み中...</span>
                      </>
                    )}
                  </span>
                  {isModelLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform translate-x-full hover:translate-x-0 transition-transform duration-500"></div>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStopSession}
                  disabled={session?.status === 'completed'}
                  className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 transform ${
                    session?.status === 'completed'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    {session?.status === 'completed' ? (
                      <>
                        <span>✅</span>
                        <span>自動終了中...</span>
                      </>
                    ) : (
                      <>
                        <span>⏹️</span>
                        <span>セッション終了</span>
                      </>
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isModelLoaded && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 dark:border-yellow-400"></div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                AIモデルを読み込んでいます...しばらくお待ちください
              </p>
            </div>
          </div>
        )}

        {(webcamError || detectionError) && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="text-red-500 dark:text-red-400">⚠️</div>
              <p className="text-red-800 dark:text-red-200 font-medium">
                {webcamError || detectionError}
              </p>
            </div>
          </div>
        )}


        {/* モダンダッシュボードレイアウト */}
        <div className="space-y-8">
          {/* 上段：疲労度レベルとコンパクトカメラの横並び */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-8 space-y-6 lg:space-y-0">
              {/* 左側：疲労度メーター */}
              <div className="w-full lg:w-1/2">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">疲労度レベル</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {session?.status === 'active' ? '1分間計測中' :
                     session?.status === 'completing' ? 'セッション分析中...' :
                     session?.status === 'completed' ? 'セッション完了 - まもなく終了' :
                     'リアルタイム分析'}
                  </p>
                </div>
                
                {/* 大型円形プログレス */}
                <div className="relative flex items-center justify-center">
                  <svg className="w-48 h-48" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="fatigueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={
                          !currentMetrics ? "#10B981" :
                          currentMetrics.fatigueScore < 25 ? "#10B981" :
                          currentMetrics.fatigueScore < 50 ? "#F59E0B" :
                          currentMetrics.fatigueScore < 75 ? "#F97316" :
                          "#EF4444"
                        } />
                        <stop offset="100%" stopColor={
                          !currentMetrics ? "#059669" :
                          currentMetrics.fatigueScore < 25 ? "#059669" :
                          currentMetrics.fatigueScore < 50 ? "#D97706" :
                          currentMetrics.fatigueScore < 75 ? "#EA580C" :
                          "#DC2626"
                        } />
                      </linearGradient>
                    </defs>
                    
                    {/* 背景円 */}
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                      transform="rotate(-90 100 100)"
                    />
                    
                    {/* 進捗円 */}
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      stroke="url(#fatigueGradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={534}
                      strokeDashoffset={534 - (534 * (currentMetrics?.fatigueScore || 0)) / 100}
                      className="transition-all duration-1000 ease-in-out"
                      transform="rotate(-90 100 100)"
                    />
                    
                    {/* %表示テキスト - SVG内で正確な中央配置 */}
                    <text 
                      x="100" 
                      y="100" 
                      textAnchor="middle" 
                      dominantBaseline="central" 
                      className={`text-4xl font-bold fill-current ${
                        !currentMetrics ? "text-green-500" :
                        currentMetrics.fatigueScore < 25 ? "text-green-500" :
                        currentMetrics.fatigueScore < 50 ? "text-yellow-500" :
                        currentMetrics.fatigueScore < 75 ? "text-orange-500" :
                        "text-red-500"
                      }`}
                      style={{ fontSize: '32px', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                    >
                      {currentMetrics ? currentMetrics.fatigueScore.toFixed(1) : "0"}%
                    </text>
                  </svg>
                  
                  {/* トレンド表示 - 円の下部 */}
                  <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {currentMetrics?.trend && (
                        <span className="flex items-center space-x-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm">
                          <span>{
                            currentMetrics.trend === 'improving' ? '📈' :
                            currentMetrics.trend === 'declining' ? '📉' :
                            '➡️'
                          }</span>
                          <span>{
                            currentMetrics.trend === 'improving' ? '改善中' :
                            currentMetrics.trend === 'declining' ? '悪化傾向' :
                            '安定'
                          }</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 信頼度表示 */}
                {currentMetrics && (
                  <div className="mt-6 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">測定信頼度</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentMetrics.confidenceLevel}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{currentMetrics.confidenceLevel.toFixed(0)}%</div>
                  </div>
                )}
              </div>
              
              {/* 右側：小型カメラ */}
              <div className="w-full lg:w-1/2">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ライブカメラ</h2>
                  <p className="text-gray-600 dark:text-gray-400">表情解析用映像</p>
                </div>
                
                <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 dark:from-black dark:to-gray-900 rounded-lg overflow-hidden shadow-inner" style={{ aspectRatio: '4/3' }}>
                  {/* ビデオ要素 */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay={true}
                    muted={true}
                    playsInline={true}
                    controls={false}
                    style={{ 
                      display: isStreaming ? 'block' : 'none',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  
                  {/* エラー表示 */}
                  {webcamError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-lg mb-1">⚠️</div>
                        <p className="text-red-300 text-xs font-medium">エラー</p>
                      </div>
                    </div>
                  )}

                  {/* 待機表示 */}
                  {!webcamError && !isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white p-2">
                        <div className="text-xl mb-2 animate-pulse">📹</div>
                        <p className="text-gray-300 text-xs font-medium">準備中</p>
                      </div>
                    </div>
                  )}

                  {/* ライブ表示UI */}
                  {isStreaming && (
                    <>
                      {/* ライブインジケーター */}
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center space-x-2 bg-black bg-opacity-70 rounded-full px-3 py-1">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-white text-sm font-medium">LIVE</span>
                        </div>
                      </div>
                      
                      {/* 顔検出状態 */}
                      <div className="absolute top-2 left-2">
                        <div className="flex items-center space-x-2 bg-black bg-opacity-70 rounded-full px-3 py-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${currentMetrics ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                          <span className="text-white text-sm font-medium">
                            {currentMetrics ? '検出中' : '待機中'}
                          </span>
                        </div>
                      </div>
                      
                      {/* 顔検出フレーム */}
                      {currentMetrics && (
                        <div className="absolute inset-4 border-2 border-green-400 rounded-lg opacity-60 animate-pulse"></div>
                      )}
                    </>
                  )}
                </div>
                
                {/* ステータス表示 */}
                <div className="mt-2 text-center">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    !isStreaming ? 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                    currentMetrics ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                    'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      !isStreaming ? 'bg-gray-400' :
                      currentMetrics ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span>
                      {!isStreaming ? 'オフ' :
                       currentMetrics ? '解析中' : '待機中'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 中段：重要メトリクス3つのカード */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 疲労レベル平均 */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">😴</div>
                <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                  !sessionAverageMetrics ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                  sessionAverageMetrics.avgFatigueScore < 25 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  sessionAverageMetrics.avgFatigueScore < 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  sessionAverageMetrics.avgFatigueScore < 75 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {!sessionAverageMetrics ? 'データ待機' :
                   sessionAverageMetrics.avgFatigueScore < 25 ? '良好' :
                   sessionAverageMetrics.avgFatigueScore < 50 ? '普通' :
                   sessionAverageMetrics.avgFatigueScore < 75 ? '疲労' : '高疲労'}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">疲労レベル平均</h3>
              <div className="text-3xl font-bold text-red-900 dark:text-red-100 mb-3">
                {sessionAverageMetrics ? sessionAverageMetrics.avgFatigueScore.toFixed(1) : "0"}%
              </div>
              <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${sessionAverageMetrics?.avgFatigueScore || 0}%` }}
                ></div>
              </div>
            </div>

            {/* 瞬き回数平均 */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">👁️</div>
                <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                  !sessionAverageMetrics ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                  sessionAverageMetrics.avgBlinkFrequency >= 12 && sessionAverageMetrics.avgBlinkFrequency <= 18 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {!sessionAverageMetrics ? 'データ待機' :
                   sessionAverageMetrics.avgBlinkFrequency >= 12 && sessionAverageMetrics.avgBlinkFrequency <= 18 ? '正常' : '異常'}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-2">瞬き回数平均</h3>
              <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-3">
                {sessionAverageMetrics ? sessionAverageMetrics.avgBlinkFrequency.toFixed(0) : "0"}/分
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (sessionAverageMetrics?.avgBlinkFrequency || 0) / 20 * 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-300 mt-2">
                正常範囲: 12-18/分
              </div>
            </div>

            {/* ストレス平均 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">💭</div>
                <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                  !sessionAverageMetrics ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                  sessionAverageMetrics.avgStressLevel < 30 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  sessionAverageMetrics.avgStressLevel < 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {!sessionAverageMetrics ? 'データ待機' :
                   sessionAverageMetrics.avgStressLevel < 30 ? '低い' :
                   sessionAverageMetrics.avgStressLevel < 60 ? '普通' : '高い'}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">ストレス平均</h3>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-3">
                {sessionAverageMetrics ? sessionAverageMetrics.avgStressLevel.toFixed(1) : "0"}%
              </div>
              <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${sessionAverageMetrics?.avgStressLevel || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 下段：ケアメッセージパネル */}
          <div>
            <CareMessagePanel 
              metrics={currentMetrics}
              isDetecting={isDetecting}
              session={session}
              sessionSummary={session?.summary}
            />
          </div>

          {/* 詳細メトリクス（折りたたみ） */}
          {currentMetrics && (
            <details className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <summary className="cursor-pointer text-lg font-semibold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                📊 詳細分析データ
              </summary>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    目の開き具合 (EAR)
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentMetrics.eyeAspectRatio.toFixed(3)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    口角の位置
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentMetrics.mouthCurveRatio.toFixed(3)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    眉の位置
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentMetrics.eyebrowPosition.toFixed(1)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    頭部姿勢
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <div>ヨー: {currentMetrics.headPose?.yaw?.toFixed(1) || "0"}°</div>
                    <div>ピッチ: {currentMetrics.headPose?.pitch?.toFixed(1) || "0"}°</div>
                  </div>
                </div>
              </div>
            </details>
          )}
        </div>

        {isAppStarted && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">使い方</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start space-x-2">
                <div className="text-blue-500 dark:text-blue-400 font-bold">1.</div>
                <div>
                  カメラに顔全体が映るように調整してください
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-blue-500 dark:text-blue-400 font-bold">2.</div>
                <div>
                  AIが自動的に表情から疲労度を分析します
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-blue-500 dark:text-blue-400 font-bold">3.</div>
                <div>
                  疲労が検出されると適切なケアメッセージが表示されます
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* セッション履歴モーダル */}
      <SessionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        stats={stats}
        getFilteredHistory={getFilteredHistory}
        getTrendData={getTrendData}
      />
    </div>
  );
}