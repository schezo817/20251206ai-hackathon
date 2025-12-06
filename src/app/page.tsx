'use client';

import { useState, useEffect } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import VideoDisplay from '@/components/VideoDisplay';
import MetricsDisplay from '@/components/MetricsDisplay';
import CareMessagePanel from '@/components/CareMessagePanel';
import ThemeToggle from '@/components/ThemeToggle';

export default function FatigueCareApp() {
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  const { 
    videoRef, 
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

  const handleStartSession = async () => {
    try {
      await startStream();
      setSessionStartTime(new Date());
      setIsAppStarted(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleStopSession = () => {
    stopDetection();
    stopStream();
    setIsAppStarted(false);
    setSessionStartTime(null);
  };

  useEffect(() => {
    if (isStreaming && videoRef.current && isModelLoaded) {
      startDetection(videoRef.current);
    }
  }, [isStreaming, isModelLoaded, startDetection, videoRef]);

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
              {sessionStartTime && (
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
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="flex items-center space-x-2">
                    <span>⏹️</span>
                    <span>セッション終了</span>
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

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2">
            <VideoDisplay 
              ref={videoRef}
              isStreaming={isStreaming}
              error={webcamError}
            />
          </div>
          
          <div className="xl:col-span-3 space-y-6">
            <MetricsDisplay 
              metrics={currentMetrics}
              isDetecting={isDetecting}
            />
            
            <CareMessagePanel 
              metrics={currentMetrics}
              isDetecting={isDetecting}
            />
          </div>
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
    </div>
  );
}