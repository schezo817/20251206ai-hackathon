import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceAnalyzer, FaceDetectionResult, FatigueMetrics } from '@/lib/faceDetection';

interface UseFaceDetectionResult {
  isModelLoaded: boolean;
  isDetecting: boolean;
  currentMetrics: FatigueMetrics | null;
  error: string | null;
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
}

export const useFaceDetection = (): UseFaceDetectionResult => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<FatigueMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const analyzerRef = useRef<FaceAnalyzer>(new FaceAnalyzer());
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face detection models...');
        await FaceAnalyzer.loadModels();
        console.log('Models loaded successfully!');
        setIsModelLoaded(true);
      } catch (err) {
        setError('Failed to load face detection models');
        console.error('Model loading error:', err);
      }
    };

    loadModels();
  }, []);

  const runDetection = useCallback(async (video: HTMLVideoElement) => {
    if (!isModelLoaded || !video) return;

    try {
      const result = await FaceAnalyzer.detectFace(video);
      
      if (result) {
        const metrics = analyzerRef.current.analyzeFace(result);
        setCurrentMetrics(metrics);
        setError(null);
      } else {
        setError('No face detected');
      }
    } catch (err) {
      setError('Detection error occurred');
      console.error('Detection error:', err);
    }
  }, [isModelLoaded]);

  const startDetection = useCallback((video: HTMLVideoElement) => {
    if (!isModelLoaded) {
      setError('Models not loaded yet');
      return;
    }

    setIsDetecting(true);
    setError(null);

    detectionIntervalRef.current = setInterval(() => {
      runDetection(video);
    }, 1000);
  }, [isModelLoaded, runDetection]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isModelLoaded,
    isDetecting,
    currentMetrics,
    error,
    startDetection,
    stopDetection,
  };
};