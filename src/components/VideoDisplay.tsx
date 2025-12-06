import { forwardRef } from 'react';

interface VideoDisplayProps {
  isStreaming: boolean;
  error: string | null;
}

const VideoDisplay = forwardRef<HTMLVideoElement, VideoDisplayProps>(
  ({ isStreaming, error }, ref) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">カメラ映像</h3>
        
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 dark:from-black dark:to-gray-900 rounded-lg overflow-hidden max-w-md mx-auto border border-gray-700 dark:border-gray-600" style={{ aspectRatio: '4/3' }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-300 mb-2">カメラエラー</p>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
            </div>
          ) : !isStreaming ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white p-8">
                <div className="text-6xl mb-4">📹</div>
                <p className="text-gray-300 text-lg font-medium">カメラを開始してください</p>
                <p className="text-gray-400 text-sm mt-2">上部のセッション開始ボタンをクリック</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={ref}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
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
  }
);

VideoDisplay.displayName = 'VideoDisplay';

export default VideoDisplay;