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
  headPose: { pitch: number; yaw: number; roll: number };
  expressionScores: { happy: number; sad: number; neutral: number; surprised: number; angry: number; fearful: number; disgusted: number };
  microSleepEvents: number;
  attentionLevel: number;
  stressLevel: number;
  fatigueScore: number;
  confidenceLevel: number;
  trend: 'improving' | 'stable' | 'declining';
}

// 疲労度判定の閾値設定（0-100%スケール）
export const FATIGUE_THRESHOLDS = {
  EAR: {
    NORMAL: 0.25,
    SLEEPY: 0.20,
    MICROSLEEP: 0.15
  },
  BLINK_FREQUENCY: {
    NORMAL_MIN: 10,
    NORMAL_MAX: 20,
    EXCESSIVE: 25
  },
  FATIGUE_SCORE: {
    LOW: 25,     // 軽度疲労
    MEDIUM: 50,  // 中度疲労
    HIGH: 75,    // 高度疲労
    CRITICAL: 90 // 重度疲労
  },
  ATTENTION: {
    HIGH: 80,
    MEDIUM: 60,
    LOW: 40
  },
  STRESS: {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80
  }
};

export class FaceAnalyzer {
  private blinkHistory: number[] = [];
  private baselineMetrics: Partial<FatigueMetrics> | null = null;
  private metricsHistory: FatigueMetrics[] = [];
  private microSleepEvents: number[] = [];
  private attentionHistory: number[] = [];
  private lastEARValues: number[] = [];
  private stressHistory: number[] = [];
  private expressionHistory: Array<{ expressions: any; timestamp: number }> = [];
  private sessionStartTime: number = Date.now();
  
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

  calculateHeadPose(landmarks: faceapi.FaceLandmarks68): { pitch: number; yaw: number; roll: number } {
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const mouth = landmarks.getMouth();

    // 簡易的なヨー角計算（左右の傾き）
    const eyeCenter = {
      x: (leftEye[0].x + rightEye[3].x) / 2,
      y: (leftEye[0].y + rightEye[3].y) / 2
    };
    const noseCenter = nose[3];
    const yaw = Math.atan2(noseCenter.x - eyeCenter.x, noseCenter.y - eyeCenter.y) * (180 / Math.PI);

    // 簡易的なピッチ角計算（上下の傾き）
    const mouthCenter = mouth[3];
    const pitch = Math.atan2(mouthCenter.y - eyeCenter.y, Math.abs(mouthCenter.x - eyeCenter.x)) * (180 / Math.PI);

    // 簡易的なロール角計算（回転）
    const roll = Math.atan2(rightEye[0].y - leftEye[3].y, rightEye[0].x - leftEye[3].x) * (180 / Math.PI);

    return { pitch, yaw, roll };
  }

  detectMicroSleepEvent(ear: number): void {
    const now = Date.now();

    this.lastEARValues.push(ear);
    if (this.lastEARValues.length > 10) {
      this.lastEARValues.shift(); // 最新10個を保持
    }

    // 連続して低いEAR値が続いているかチェック
    const recentLowCount = this.lastEARValues.filter(val => val < FATIGUE_THRESHOLDS.EAR.MICROSLEEP).length;
    if (recentLowCount >= 8) { // 10個中8個以上が閾値以下
      this.microSleepEvents.push(now);
    }

    // 過去5分間のイベントのみ保持
    this.microSleepEvents = this.microSleepEvents.filter(time => now - time < 300000);
  }

  calculateAttentionLevel(landmarks: faceapi.FaceLandmarks68, expressions: faceapi.FaceExpressions): number {
    const headPose = this.calculateHeadPose(landmarks);
    const now = Date.now();
    
    // 頭部姿勢による注意度評価
    const poseScore = Math.max(0, 100 - Math.abs(headPose.yaw) * 2 - Math.abs(headPose.pitch) * 1.5);
    
    // 表情による注意度評価（中立・集中状態を高く評価）
    const expressionScore = (expressions.neutral + expressions.surprised * 0.5) * 100;
    
    // 目の動きによる注意度（安定した目の開き具合）
    const ear = this.calculateEAR(landmarks);
    const eyeStabilityScore = ear > 0.25 && ear < 0.35 ? 100 : Math.max(0, 100 - Math.abs(ear - 0.3) * 300);
    
    const attentionScore = (poseScore * 0.4 + expressionScore * 0.3 + eyeStabilityScore * 0.3);
    
    this.attentionHistory.push(attentionScore);
    if (this.attentionHistory.length > 30) {
      this.attentionHistory.shift(); // 最新30個を保持
    }
    
    return Math.min(100, Math.max(0, attentionScore));
  }

  calculateStressLevel(expressions: faceapi.FaceExpressions, metrics: Partial<FatigueMetrics>): number {
    const now = Date.now();
    
    // 表情履歴を追加
    this.expressionHistory.push({ expressions, timestamp: now });
    if (this.expressionHistory.length > 20) {
      this.expressionHistory.shift(); // 最新20個を保持
    }
    
    // ベースストレス（動的に調整）
    let stressScore = 25; // より低い基本レベル
    
    // 1. 即時表情分析（より敏感に）
    const negativeEmotions = expressions.angry + expressions.fearful + expressions.disgusted + expressions.sad;
    const positiveEmotions = expressions.happy + expressions.surprised * 0.3;
    
    // ネガティブ表情の直接影響（大幅に増強）
    stressScore += negativeEmotions * 150;
    
    // ポジティブ表情不足による影響
    if (positiveEmotions < 0.1) {
      stressScore += 20;
    }
    
    // 2. 表情の変化率分析（短期間での表情変動）
    if (this.expressionHistory.length >= 5) {
      const recent5 = this.expressionHistory.slice(-5);
      let emotionVariance = 0;
      
      for (let i = 1; i < recent5.length; i++) {
        const prev = recent5[i - 1].expressions;
        const curr = recent5[i].expressions;
        
        // 各表情の変化量を計算
        emotionVariance += Math.abs(curr.happy - prev.happy);
        emotionVariance += Math.abs(curr.sad - prev.sad);
        emotionVariance += Math.abs(curr.angry - prev.angry);
        emotionVariance += Math.abs(curr.neutral - prev.neutral);
      }
      
      // 感情の変動が激しいとストレス
      stressScore += emotionVariance * 60;
    }
    
    // 3. 生理的指標
    // まばたき頻度の異常
    const blinkFreq = metrics.blinkFrequency || 15;
    if (blinkFreq > 25 || blinkFreq < 8) {
      stressScore += Math.abs(blinkFreq - 15) * 2;
    }
    
    // EARの異常値
    const ear = metrics.eyeAspectRatio || 0.25;
    if (ear < 0.15 || ear > 0.4) {
      stressScore += Math.abs(ear - 0.275) * 80;
    }
    
    // 4. 頭部動作の不安定性
    if (metrics.headPose) {
      const headMovement = Math.abs(metrics.headPose.yaw) + Math.abs(metrics.headPose.pitch) + Math.abs(metrics.headPose.roll);
      if (headMovement > 10) {
        stressScore += (headMovement - 10) * 1.2;
      }
    }
    
    // 5. 無表情の継続（感情抑制の兆候）
    if (expressions.neutral > 0.8) {
      stressScore += (expressions.neutral - 0.8) * 50;
    }
    
    // 6. 時系列トレンド分析
    this.stressHistory.push(stressScore);
    if (this.stressHistory.length > 10) {
      this.stressHistory.shift();
    }
    
    // 急激な変化でストレス値を増幅
    if (this.stressHistory.length >= 3) {
      const recent = this.stressHistory.slice(-3);
      const isRisingTrend = recent[2] > recent[1] && recent[1] > recent[0];
      if (isRisingTrend) {
        stressScore *= 1.2; // 上昇トレンドで増幅
      }
    }
    
    return Math.min(100, Math.max(5, stressScore));
  }

  updateBlinkHistory(ear: number): number {
    const isBlinking = ear < FATIGUE_THRESHOLDS.EAR.NORMAL;
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

    // 既存のメトリクス評価
    const earChange = this.baselineMetrics.eyeAspectRatio! - metrics.eyeAspectRatio;
    const mouthChange = Math.abs((this.baselineMetrics.mouthCurveRatio! - metrics.mouthCurveRatio));
    const eyebrowChange = Math.abs((this.baselineMetrics.eyebrowPosition! - metrics.eyebrowPosition));
    const blinkChange = Math.max(0, metrics.blinkFrequency - 15);

    // 新しいメトリクス評価
    const microSleepScore = this.microSleepEvents.length * 10; // 微睡イベント数
    const attentionScore = Math.max(0, 100 - metrics.attentionLevel); // 注意レベルが低いほど疲労
    const headPoseScore = (Math.abs(metrics.headPose.pitch) + Math.abs(metrics.headPose.yaw)) / 2; // 頭部の不安定さ
    
    // 表情による疲労評価（悲しい、中立が多いと疲労とみなす）
    const expressionFatigue = (metrics.expressionScores.sad + 
                              metrics.expressionScores.neutral * 0.5 + 
                              (1 - metrics.expressionScores.happy) * 0.3) * 50;

    // 時系列トレンド評価
    const trendMultiplier = metrics.trend === 'declining' ? 1.3 : 
                           metrics.trend === 'improving' ? 0.7 : 1.0;

    // 重み付き合計
    let score = 0;
    score += Math.max(0, earChange * 80);           // 20% weight
    score += mouthChange * 40;                      // 10% weight  
    score += eyebrowChange * 25;                    // 8% weight
    score += blinkChange * 1.5;                     // 7% weight
    score += microSleepScore;                       // 15% weight
    score += attentionScore * 0.3;                  // 20% weight
    score += headPoseScore * 0.8;                   // 10% weight
    score += expressionFatigue * 0.2;               // 10% weight

    score *= trendMultiplier;

    // 信頼度による調整
    score *= (metrics.confidenceLevel / 100);

    return Math.min(100, Math.max(0, score));
  }

  calculateTrend(): 'improving' | 'stable' | 'declining' {
    if (this.metricsHistory.length < 10) return 'stable';
    
    const recent = this.metricsHistory.slice(-5).map(m => m.fatigueScore);
    const earlier = this.metricsHistory.slice(-10, -5).map(m => m.fatigueScore);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    const change = recentAvg - earlierAvg;
    
    if (change > 5) return 'declining';
    if (change < -5) return 'improving';
    return 'stable';
  }

  calculateConfidenceLevel(result: FaceDetectionResult): number {
    const detection = result.detection;
    const landmarks = result.landmarks;
    
    // 検出信頼度
    const detectionConfidence = detection.score * 100;
    
    // ランドマークの品質評価（顔の向きが正面に近いほど高い）
    const headPose = this.calculateHeadPose(landmarks);
    const poseQuality = Math.max(0, 100 - Math.abs(headPose.yaw) - Math.abs(headPose.pitch) * 0.5);
    
    // 目の領域の明瞭さ（EARが妥当な範囲内かどうか）
    const ear = this.calculateEAR(landmarks);
    const earQuality = ear > 0.1 && ear < 0.5 ? 100 : 50;
    
    return (detectionConfidence * 0.5 + poseQuality * 0.3 + earQuality * 0.2);
  }

  analyzeFace(result: FaceDetectionResult): FatigueMetrics {
    const ear = this.calculateEAR(result.landmarks);
    const mouthCurve = this.calculateMouthCurve(result.landmarks);
    const eyebrowPos = this.calculateEyebrowPosition(result.landmarks);
    const blinkFreq = this.updateBlinkHistory(ear);
    const headPose = this.calculateHeadPose(result.landmarks);
    const attentionLevel = this.calculateAttentionLevel(result.landmarks, result.expressions);
    const confidenceLevel = this.calculateConfidenceLevel(result);

    // 微睡検出
    this.detectMicroSleepEvent(ear);

    // 表情スコアの正規化
    const expressions = result.expressions;
    const expressionScores = {
      happy: expressions.happy,
      sad: expressions.sad,
      neutral: expressions.neutral,
      surprised: expressions.surprised,
      angry: expressions.angry,
      fearful: expressions.fearful,
      disgusted: expressions.disgusted,
    };

    // 仮メトリクス作成（疲労スコア計算のため）
    const partialMetrics: Partial<FatigueMetrics> = {
      eyeAspectRatio: ear,
      mouthCurveRatio: mouthCurve,
      eyebrowPosition: eyebrowPos,
      blinkFrequency: blinkFreq,
      headPose,
      expressionScores,
      microSleepEvents: this.microSleepEvents.length,
      attentionLevel,
      confidenceLevel,
    };

    const stressLevel = this.calculateStressLevel(expressions, partialMetrics);
    const trend = this.calculateTrend();

    const metrics: FatigueMetrics = {
      eyeAspectRatio: ear || 0,
      mouthCurveRatio: mouthCurve || 0,
      eyebrowPosition: eyebrowPos || 0,
      blinkFrequency: blinkFreq || 0,
      headPose: headPose || { pitch: 0, yaw: 0, roll: 0 },
      expressionScores: expressionScores || {
        happy: 0, sad: 0, neutral: 0, surprised: 0, 
        angry: 0, fearful: 0, disgusted: 0
      },
      microSleepEvents: this.microSleepEvents.length || 0,
      attentionLevel: attentionLevel || 0,
      stressLevel: stressLevel || 0,
      fatigueScore: 0, // 初期値は0%
      confidenceLevel: confidenceLevel || 0,
      trend: trend || 'stable',
    };

    metrics.fatigueScore = this.calculateFatigueScore(metrics);

    // メトリクス履歴に追加
    this.metricsHistory.push({ ...metrics });
    if (this.metricsHistory.length > 50) {
      this.metricsHistory.shift(); // 最新50個を保持
    }

    return metrics;
  }
}