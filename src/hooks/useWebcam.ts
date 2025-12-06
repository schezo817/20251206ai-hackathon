import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebcamResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  error: string | null;
  startStream: () => Promise<void>;
  stopStream: () => void;
}

export const useWebcam = (): UseWebcamResult => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access webcam';
      setError(errorMessage);
      console.error('Webcam error:', err);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
};