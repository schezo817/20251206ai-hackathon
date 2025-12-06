import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
  expressions: faceapi.FaceExpressions;
}

export interface FatigueMetrics {
  eyeAspectRatio: number;
  mouthCurveRatio: number;
  eyebrowPosition: number;
  blinkFrequency: number;
  fatigueScore: number;
}

export class FaceAnalyzer {
  private blinkHistory: number[] = [];
  private baselineMetrics: Partial<FatigueMetrics> | null = null;
  
  static async loadModels(): Promise<void> {
    const MODEL_URL = process.env.NODE_ENV === 'production' 
      ? '/models' 
      : 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
    } catch (error) {
      console.error('Failed to load models from:', MODEL_URL);
      // フォールバック: ローカルファイルを試行
      if (MODEL_URL.includes('github')) {
        console.log('Trying local models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);
      } else {
        throw error;
      }
    }
  }

  static async detectFace(input: HTMLVideoElement | HTMLCanvasElement): Promise<FaceDetectionResult | null> {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!detection) return null;

    return {
      detection: detection.detection,
      landmarks: detection.landmarks,
      expressions: detection.expressions,
    };
  }

  calculateEAR(landmarks: faceapi.FaceLandmarks68): number {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEAR = this.calculateSingleEyeEAR(leftEye);
    const rightEAR = this.calculateSingleEyeEAR(rightEye);
    
    return (leftEAR + rightEAR) / 2;
  }

  private calculateSingleEyeEAR(eyePoints: faceapi.Point[]): number {
    if (eyePoints.length !== 6) return 0;
    
    const p1 = eyePoints[1];
    const p2 = eyePoints[5];
    const p3 = eyePoints[2];
    const p4 = eyePoints[4];
    const p5 = eyePoints[0];
    const p6 = eyePoints[3];

    const vertical1 = Math.sqrt((p2.x - p6.x) ** 2 + (p2.y - p6.y) ** 2);
    const vertical2 = Math.sqrt((p3.x - p5.x) ** 2 + (p3.y - p5.y) ** 2);
    const horizontal = Math.sqrt((p1.x - p4.x) ** 2 + (p1.y - p4.y) ** 2);

    return (vertical1 + vertical2) / (2 * horizontal);
  }

  calculateMouthCurve(landmarks: faceapi.FaceLandmarks68): number {
    const mouth = landmarks.getMouth();
    const leftCorner = mouth[0];
    const rightCorner = mouth[6];
    const topCenter = mouth[3];
    const bottomCenter = mouth[9];

    const mouthWidth = Math.sqrt((rightCorner.x - leftCorner.x) ** 2 + (rightCorner.y - leftCorner.y) ** 2);
    const mouthHeight = Math.sqrt((bottomCenter.x - topCenter.x) ** 2 + (bottomCenter.y - topCenter.y) ** 2);

    return mouthHeight / mouthWidth;
  }

  calculateEyebrowPosition(landmarks: faceapi.FaceLandmarks68): number {
    const leftEyebrow = landmarks.getLeftEyeBrow();
    const rightEyebrow = landmarks.getRightEyeBrow();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftDistance = leftEyebrow[2].y - leftEye[1].y;
    const rightDistance = rightEyebrow[2].y - rightEye[1].y;

    return (leftDistance + rightDistance) / 2;
  }

  updateBlinkHistory(ear: number): number {
    const isBlinking = ear < 0.25;
    const now = Date.now();
    
    if (isBlinking) {
      this.blinkHistory.push(now);
    }

    this.blinkHistory = this.blinkHistory.filter(time => now - time < 60000);
    
    return this.blinkHistory.length;
  }

  setBaseline(metrics: FatigueMetrics): void {
    this.baselineMetrics = { ...metrics };
  }

  calculateFatigueScore(metrics: FatigueMetrics): number {
    if (!this.baselineMetrics) {
      this.setBaseline(metrics);
      return 0;
    }

    const earChange = this.baselineMetrics.eyeAspectRatio! - metrics.eyeAspectRatio;
    const mouthChange = Math.abs((this.baselineMetrics.mouthCurveRatio! - metrics.mouthCurveRatio));
    const eyebrowChange = Math.abs((this.baselineMetrics.eyebrowPosition! - metrics.eyebrowPosition));
    const blinkChange = Math.max(0, metrics.blinkFrequency - 15);

    let score = 0;
    score += Math.max(0, earChange * 100);
    score += mouthChange * 50;
    score += eyebrowChange * 30;
    score += blinkChange * 2;

    return Math.min(100, Math.max(0, score));
  }

  analyzeFace(result: FaceDetectionResult): FatigueMetrics {
    const ear = this.calculateEAR(result.landmarks);
    const mouthCurve = this.calculateMouthCurve(result.landmarks);
    const eyebrowPos = this.calculateEyebrowPosition(result.landmarks);
    const blinkFreq = this.updateBlinkHistory(ear);

    const metrics: FatigueMetrics = {
      eyeAspectRatio: ear,
      mouthCurveRatio: mouthCurve,
      eyebrowPosition: eyebrowPos,
      blinkFrequency: blinkFreq,
      fatigueScore: 0,
    };

    metrics.fatigueScore = this.calculateFatigueScore(metrics);

    return metrics;
  }
}