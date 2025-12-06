import { useEffect } from 'react';

interface VideoDisplayProps {
  isStreaming: boolean;
  error: string | null;
  videoRef: (element: HTMLVideoElement | null) => void;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ isStreaming, error, videoRef }) => {
  useEffect(() => {
    console.log('VideoDisplay component mounted');
  }, []);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">カメラ映像</h3>
        
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 dark:from-black dark:to-gray-900 rounded-lg overflow-hidden max-w-md mx-auto border border-gray-700 dark:border-gray-600" style={{ aspectRatio: '4/3' }}>
          {/* ビデオ要素を常にマウント */}
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
            onLoadStart={() => console.log('VideoDisplay: Video load started')}
            onLoadedMetadata={() => console.log('VideoDisplay: Video metadata loaded')}
            onCanPlay={() => console.log('VideoDisplay: Video can play')}
            onPlay={() => console.log('VideoDisplay: Video play event')}
            onPlaying={() => console.log('VideoDisplay: Video playing event')}
            onPause={() => console.log('VideoDisplay: Video paused')}
            onError={(e) => {
              console.error('VideoDisplay: Video element error:', e);
              console.error('VideoDisplay: Video error details:', e.currentTarget.error);
            }}
            onStalled={() => console.log('VideoDisplay: Video stalled')}
            onSuspend={() => console.log('VideoDisplay: Video suspended')}
            onWaiting={() => console.log('VideoDisplay: Video waiting')}
          />
          
          {/* エラー表示 */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-300 mb-2">カメラエラー</p>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
            </div>
          )}

          {/* 待機表示 */}
          {!error && !isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white p-8">
                <div className="text-6xl mb-4">📹</div>
                <p className="text-gray-300 text-lg font-medium">カメラを開始してください</p>
                <p className="text-gray-400 text-sm mt-2">上部のセッション開始ボタンをクリック</p>
              </div>
            </div>
          )}

          {/* ライブ表示オーバーレイ */}
          {isStreaming && (
            <>
              <div className="absolute top-3 left-3">
                <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-xs font-medium">LIVE</span>
                </div>
              </div>
              <div className="absolute bottom-3 right-3">
                <div className="bg-black bg-opacity-50 rounded px-2 py-1">
                  <span className="text-white text-xs">
                    {new Date().toLocaleTimeString('ja-JP')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {isStreaming && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 rounded-full px-3 py-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">表情解析中</span>
            </div>
          </div>
        )}
      </div>
    );
};

export default VideoDisplay;