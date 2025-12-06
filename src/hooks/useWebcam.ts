import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebcamResult {
  videoRef: (element: HTMLVideoElement | null) => void;
  videoElement: HTMLVideoElement | null;
  isStreaming: boolean;
  error: string | null;
  startStream: () => Promise<void>;
  stopStream: () => void;
}

export const useWebcam = (): UseWebcamResult => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStreamRef = useRef<boolean>(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // refコールバック関数
  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    console.log('=== VIDEO REF CALLBACK ===');
    console.log('Element:', element);
    if (element) {
      console.log('Video element mounted:', {
        tagName: element.tagName,
        autoplay: element.autoplay,
        muted: element.muted,
        playsInline: element.playsInline,
        controls: element.controls,
        width: element.width,
        height: element.height,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        isConnected: element.isConnected,
        parentElement: !!element.parentElement
      });
    } else {
      console.log('Video element unmounted');
    }
    setVideoElement(element);
  }, []);

  // ビデオ要素が利用可能になった時にストリームを設定する
  const setupVideoStream = useCallback(async (videoElement: HTMLVideoElement, stream: MediaStream) => {
    console.log('=== SETTING UP VIDEO STREAM ===');
    console.log('Video element:', videoElement);
    console.log('Video element properties:', {
      tagName: videoElement.tagName,
      readyState: videoElement.readyState,
      paused: videoElement.paused,
      currentSrc: videoElement.currentSrc,
      srcObject: videoElement.srcObject,
      autoplay: videoElement.autoplay,
      muted: videoElement.muted,
      playsInline: videoElement.playsInline
    });
    console.log('Stream:', stream);
    console.log('Stream tracks:', stream.getTracks());
    
    try {
      // 既存のsrcObjectをクリア
      if (videoElement.srcObject) {
        console.log('Clearing existing srcObject...');
        videoElement.srcObject = null;
      }

      // 新しいストリームを設定
      console.log('Setting new stream to video element...');
      videoElement.srcObject = stream;
      
      console.log('Stream set successfully. Video element state:', {
        readyState: videoElement.readyState,
        srcObject: !!videoElement.srcObject,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight
      });
      
      // 再生可能になったら再生開始
      const handleCanPlayThrough = () => {
        console.log('Video can play through - starting playback...');
        videoElement.play()
          .then(() => {
            console.log('Video playback started successfully');
            console.log('Final video state:', {
              readyState: videoElement.readyState,
              paused: videoElement.paused,
              currentTime: videoElement.currentTime,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight
            });
            setIsStreaming(true);
          })
          .catch((playError) => {
            console.error('Video play error:', playError);
            setError(`再生エラー: ${playError.message}`);
          });
      };

      const handleLoadedData = () => {
        console.log('Video data loaded');
        setIsStreaming(true);
      };

      const handlePlaying = () => {
        console.log('Video is now playing!');
        setIsStreaming(true);
      };

      const handleError = (event: Event) => {
        console.error('Video error event:', event);
        console.error('Video error details:', {
          error: videoElement.error,
          networkState: videoElement.networkState,
          readyState: videoElement.readyState
        });
      };

      // イベントリスナーを設定
      videoElement.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
      videoElement.addEventListener('loadeddata', handleLoadedData, { once: true });
      videoElement.addEventListener('playing', handlePlaying, { once: true });
      videoElement.addEventListener('error', handleError);
      
      // 明示的にload()を呼んでメタデータの読み込みを開始
      console.log('Loading video...');
      videoElement.load();
      
      // 複数のフォールバック戦略
      setTimeout(() => {
        console.log('Timeout 1: Checking video state...');
        console.log('Video state after 500ms:', {
          readyState: videoElement.readyState,
          paused: videoElement.paused,
          srcObject: !!videoElement.srcObject
        });
        
        if (videoElement.readyState >= 2 && videoElement.paused) { 
          console.log('Fallback 1: Trying to play...');
          videoElement.play()
            .then(() => {
              console.log('Fallback 1 play successful');
              setIsStreaming(true);
            })
            .catch(console.error);
        }
      }, 500);

      setTimeout(() => {
        console.log('Timeout 2: Force play attempt...');
        if (videoElement.paused && videoElement.srcObject) {
          console.log('Fallback 2: Force playing...');
          videoElement.play()
            .then(() => {
              console.log('Fallback 2 play successful');
              setIsStreaming(true);
            })
            .catch(console.error);
        }
      }, 1500);

      // 最終フォールバック: ストリームを再設定
      setTimeout(() => {
        console.log('Final fallback: Re-setting stream if needed...');
        if (!videoElement.srcObject || videoElement.paused) {
          console.log('Re-setting stream...');
          videoElement.srcObject = stream;
          videoElement.play()
            .then(() => {
              console.log('Final fallback successful');
              setIsStreaming(true);
            })
            .catch(console.error);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error setting up video stream:', error);
      setError('ビデオストリームの設定に失敗しました');
    }
  }, []);

  // ストリームを取得してビデオ要素が利用可能な場合は即座に設定
  const startStream = useCallback(async () => {
    try {
      setError(null);
      pendingStreamRef.current = true;
      console.log('=== STARTING CAMERA STREAM ===');
      console.log('Current videoElement state:', !!videoElement);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      console.log('Camera stream obtained successfully:', stream);
      console.log('Stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          label: track.label
        }))
      });
      
      streamRef.current = stream;
      
      // ビデオ要素が既に利用可能な場合は即座に設定
      if (videoElement) {
        console.log('Video element already available, setting up stream...');
        console.log('Video element details before setup:', {
          isConnected: videoElement.isConnected,
          parentElement: !!videoElement.parentElement,
          offsetWidth: videoElement.offsetWidth,
          offsetHeight: videoElement.offsetHeight
        });
        await setupVideoStream(videoElement, stream);
        pendingStreamRef.current = false;
      } else {
        console.log('Video element not yet available, will setup when ready...');
        console.log('Pending stream setup - waiting for video element mount...');
      }
      
    } catch (err) {
      console.error('Webcam error:', err);
      pendingStreamRef.current = false;
      
      let errorMessage = 'カメラアクセスに失敗しました';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'カメラの使用が許可されていません。ブラウザの設定でカメラアクセスを許可してください。';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'カメラが見つかりません。カメラが接続されているか確認してください。';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'カメラが他のアプリケーションで使用中です。';
        } else {
          errorMessage = `カメラエラー: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    }
  }, [setupVideoStream, videoElement]);

  // ビデオ要素が利用可能になったときに待機中のストリームを設定
  useEffect(() => {
    console.log('=== VIDEO ELEMENT STATE CHANGED ===');
    console.log('videoElement:', !!videoElement);
    console.log('streamRef.current:', !!streamRef.current);
    console.log('pendingStreamRef.current:', pendingStreamRef.current);
    
    if (videoElement && streamRef.current && pendingStreamRef.current) {
      console.log('All conditions met - setting up pending stream...');
      console.log('Video element details:', {
        tagName: videoElement.tagName,
        isConnected: videoElement.isConnected,
        parentElement: !!videoElement.parentElement,
        offsetWidth: videoElement.offsetWidth,
        offsetHeight: videoElement.offsetHeight,
        readyState: videoElement.readyState
      });
      setupVideoStream(videoElement, streamRef.current);
      pendingStreamRef.current = false;
    } else {
      console.log('Conditions not met for stream setup:', {
        hasVideoElement: !!videoElement,
        hasStream: !!streamRef.current,
        isPending: pendingStreamRef.current
      });
    }
  }, [videoElement, setupVideoStream]);

  const stopStream = useCallback(() => {
    console.log('Stopping stream...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.pause();
      console.log('Video element cleared');
    }
    
    pendingStreamRef.current = false;
    setIsStreaming(false);
    console.log('Stream stopped');
  }, [videoElement]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    videoElement,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
};