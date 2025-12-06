import { useState, useRef, useCallback, useEffect } from 'react';
import { FatigueMetrics } from '@/lib/faceDetection';
import {
  SessionData,
  SessionStatus,
  SessionSettings,
  SessionCallbacks,
  SessionSummary,
  MetricsDataPoint,
  createSession,
  DEFAULT_SESSION_SETTINGS,
  calculateSessionProgress
} from '@/types/session';

interface UseSessionTrackingReturn {
  // セッション状態
  session: SessionData | null;
  isSessionActive: boolean;
  sessionProgress: number;
  
  // セッション制御
  startSession: (settings?: Partial<SessionSettings>) => Promise<void>;
  endSession: () => Promise<SessionSummary | null>;
  addMetricsData: (metrics: FatigueMetrics) => void;
  
  // 状態取得
  getBaselineMetrics: () => FatigueMetrics | null;
  getCurrentComparison: () => { current: FatigueMetrics; baseline: FatigueMetrics; delta: Partial<FatigueMetrics> } | null;
  getSessionStats: () => any;
}

export function useSessionTracking(callbacks?: SessionCallbacks): UseSessionTrackingReturn {
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionProgress, setSessionProgress] = useState<number>(0);
  
  const timersRef = useRef<{
    autoEnd?: NodeJS.Timeout;
    dataCollection?: NodeJS.Timeout;
    progressUpdate?: NodeJS.Timeout;
  }>({});
  
  const baselineMetricsAccumulator = useRef<FatigueMetrics[]>([]);

  // セッション開始
  const startSession = useCallback(async (settings?: Partial<SessionSettings>) => {
    console.log('=== セッション開始処理 ===');
    
    // 既存セッション終了
    if (session?.status === 'active') {
      await endSession();
    }
    
    // 新しいセッション作成
    const newSession = createSession(settings);
    newSession.status = 'initializing';
    newSession.startTime = new Date();
    
    setSession(newSession);
    setSessionProgress(0);
    
    callbacks?.onSessionStart?.(newSession.sessionId);
    callbacks?.onStatusChange?.(newSession.status);
    
    // 直接アクティブ計測開始
    setTimeout(() => {
      startActiveTracking(newSession);
    }, 1000);
    
    console.log(`セッション開始: ${newSession.sessionId}`);
  }, [session, callbacks]);

  // ベースライン測定開始
  const startBaselineMeasurement = useCallback((sessionData: SessionData) => {
    console.log('=== ベースライン測定開始 ===');
    
    sessionData.status = 'baseline';
    sessionData._internal = {
      ...sessionData._internal,
      baselineStartTime: new Date(),
      baselineDataCount: 0
    };
    
    setSession({ ...sessionData });
    baselineMetricsAccumulator.current = [];
    
    callbacks?.onStatusChange?.(sessionData.status);
    
    // ベースライン測定終了タイマー
    timersRef.current.autoEnd = setTimeout(() => {
      completeBaselineMeasurement(sessionData);
    }, sessionData.settings.baselineDuration * 1000);
    
    console.log(`ベースライン測定期間: ${sessionData.settings.baselineDuration}秒`);
  }, [callbacks]);

  // ベースライン測定完了
  const completeBaselineMeasurement = useCallback((sessionData: SessionData) => {
    console.log('=== ベースライン測定完了 ===');
    
    if (baselineMetricsAccumulator.current.length === 0) {
      console.warn('ベースラインデータが不足しています');
      return;
    }
    
    // ベースライン平均値計算
    const baselineMetrics = calculateAverageMetrics(baselineMetricsAccumulator.current);
    
    sessionData.baselineMetrics = baselineMetrics;
    sessionData.status = 'active';
    sessionData._internal = {
      ...sessionData._internal,
      activeStartTime: new Date(),
      totalDataCount: 0
    };
    
    setSession({ ...sessionData });
    
    callbacks?.onBaselineComplete?.(baselineMetrics);
    callbacks?.onActivePhaseStart?.();
    callbacks?.onStatusChange?.(sessionData.status);
    
    // アクティブ計測の自動終了タイマー設定
    startActiveTracking(sessionData);
    
    console.log('ベースライン設定完了、アクティブ計測開始');
  }, [callbacks]);

  // アクティブ計測開始
  const startActiveTracking = useCallback((sessionData: SessionData) => {
    console.log('=== アクティブ計測開始 ===');
    
    // セッションをアクティブ状態に設定
    sessionData.status = 'active';
    sessionData._internal = {
      ...sessionData._internal,
      activeStartTime: new Date(),
      totalDataCount: 0
    };
    
    setSession({ ...sessionData });
    callbacks?.onActivePhaseStart?.();
    callbacks?.onStatusChange?.(sessionData.status);
    
    // 自動終了タイマー
    timersRef.current.autoEnd = setTimeout(() => {
      autoEndSession(sessionData);
    }, sessionData.settings.activeDuration * 60 * 1000);
    
    // 進捗更新タイマー
    timersRef.current.progressUpdate = setInterval(() => {
      const progress = calculateSessionProgress(sessionData);
      setSessionProgress(progress);
    }, 1000);
    
    console.log(`アクティブ計測期間: ${sessionData.settings.activeDuration}分`);
  }, [callbacks]);

  // メトリクスデータ追加
  const addMetricsData = useCallback((metrics: FatigueMetrics) => {
    if (!session || session.status !== 'active') {
      return;
    }
    
    const timestamp = new Date();
    
    // アクティブ計測中のデータ追加
    const dataPoint: MetricsDataPoint = {
      timestamp,
      metrics
    };
    
    session.metricsHistory.push(dataPoint);
    session.currentMetrics = metrics;
    session._internal!.totalDataCount++;
    
    setSession({ ...session });
    callbacks?.onDataUpdate?.(dataPoint);
    
    console.log(`アクティブデータ収集: ${session._internal!.totalDataCount}件`);
  }, [session, callbacks]);

  // セッション自動終了
  const autoEndSession = useCallback(async (sessionData: SessionData) => {
    console.log('=== セッション自動終了 ===');
    
    sessionData.status = 'completing';
    setSession({ ...sessionData });
    
    const summary = await generateSessionSummary(sessionData);
    
    sessionData.status = 'completed';
    sessionData.endTime = new Date();
    sessionData.summary = summary;
    
    setSession({ ...sessionData });
    callbacks?.onSessionComplete?.(summary);
    callbacks?.onStatusChange?.(sessionData.status);
    
    // タイマーをクリア
    clearAllTimers();
    
    console.log('セッション完了');
  }, [callbacks]);

  // セッション手動終了
  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    if (!session || session.status === 'completed') {
      return null;
    }
    
    console.log('=== セッション手動終了 ===');
    
    clearAllTimers();
    
    if (session.status === 'active') {
      return autoEndSession(session);
    } else {
      session.status = 'completed';
      session.endTime = new Date();
      setSession({ ...session });
      return null;
    }
  }, [session, autoEndSession]);

  // ベースラインメトリクス取得
  const getBaselineMetrics = useCallback((): FatigueMetrics | null => {
    return session?.baselineMetrics || null;
  }, [session]);

  // 現在との比較データ取得（ベースライン省略により無効）
  const getCurrentComparison = useCallback(() => {
    return null;
  }, []);

  // セッション統計取得
  const getSessionStats = useCallback(() => {
    if (!session || session.metricsHistory.length === 0) {
      return null;
    }
    
    // 基本統計の計算
    const fatigueScores = session.metricsHistory.map(h => h.metrics.fatigueScore);
    const avgFatigueScore = fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length;
    const maxFatigueScore = Math.max(...fatigueScores);
    
    return {
      avgFatigueScore,
      maxFatigueScore,
      dataPointCount: session.metricsHistory.length,
      duration: session.endTime ? 
        (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60) : 
        (new Date().getTime() - session.startTime.getTime()) / (1000 * 60)
    };
  }, [session]);

  // タイマークリア
  const clearAllTimers = useCallback(() => {
    if (timersRef.current.autoEnd) {
      clearTimeout(timersRef.current.autoEnd);
      timersRef.current.autoEnd = undefined;
    }
    if (timersRef.current.dataCollection) {
      clearTimeout(timersRef.current.dataCollection);
      timersRef.current.dataCollection = undefined;
    }
    if (timersRef.current.progressUpdate) {
      clearInterval(timersRef.current.progressUpdate);
      timersRef.current.progressUpdate = undefined;
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    session,
    isSessionActive: session?.status === 'active' || session?.status === 'baseline',
    sessionProgress,
    startSession,
    endSession,
    addMetricsData,
    getBaselineMetrics,
    getCurrentComparison,
    getSessionStats
  };
}

// ヘルパー関数

// メトリクス平均値計算
function calculateAverageMetrics(metricsArray: FatigueMetrics[]): FatigueMetrics {
  if (metricsArray.length === 0) {
    throw new Error('メトリクス配列が空です');
  }
  
  const avg = metricsArray.reduce((acc, metrics) => {
    acc.eyeAspectRatio += metrics.eyeAspectRatio;
    acc.mouthCurveRatio += metrics.mouthCurveRatio;
    acc.eyebrowPosition += metrics.eyebrowPosition;
    acc.blinkFrequency += metrics.blinkFrequency;
    acc.microSleepEvents += metrics.microSleepEvents;
    acc.attentionLevel += metrics.attentionLevel;
    acc.stressLevel += metrics.stressLevel;
    acc.fatigueScore += metrics.fatigueScore;
    acc.confidenceLevel += metrics.confidenceLevel;
    
    // headPoseの平均
    acc.headPose.pitch += metrics.headPose?.pitch || 0;
    acc.headPose.yaw += metrics.headPose?.yaw || 0;
    acc.headPose.roll += metrics.headPose?.roll || 0;
    
    return acc;
  }, {
    eyeAspectRatio: 0,
    mouthCurveRatio: 0,
    eyebrowPosition: 0,
    blinkFrequency: 0,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    expressionScores: metricsArray[0].expressionScores,
    microSleepEvents: 0,
    attentionLevel: 0,
    stressLevel: 0,
    fatigueScore: 0,
    confidenceLevel: 0,
    trend: 'stable' as const
  });
  
  const length = metricsArray.length;
  
  return {
    eyeAspectRatio: avg.eyeAspectRatio / length,
    mouthCurveRatio: avg.mouthCurveRatio / length,
    eyebrowPosition: avg.eyebrowPosition / length,
    blinkFrequency: avg.blinkFrequency / length,
    headPose: {
      pitch: avg.headPose.pitch / length,
      yaw: avg.headPose.yaw / length,
      roll: avg.headPose.roll / length
    },
    expressionScores: avg.expressionScores,
    microSleepEvents: avg.microSleepEvents / length,
    attentionLevel: avg.attentionLevel / length,
    stressLevel: avg.stressLevel / length,
    fatigueScore: avg.fatigueScore / length,
    confidenceLevel: avg.confidenceLevel / length,
    trend: 'stable'
  };
}

// メトリクス差分計算
function calculateMetricsDelta(current: FatigueMetrics, baseline: FatigueMetrics): Partial<FatigueMetrics> {
  return {
    eyeAspectRatio: current.eyeAspectRatio - baseline.eyeAspectRatio,
    fatigueScore: current.fatigueScore - baseline.fatigueScore,
    attentionLevel: current.attentionLevel - baseline.attentionLevel,
    stressLevel: current.stressLevel - baseline.stressLevel,
    microSleepEvents: current.microSleepEvents - baseline.microSleepEvents
  };
}

// セッションサマリー生成
async function generateSessionSummary(sessionData: SessionData): Promise<SessionSummary> {
  const endTime = new Date();
  const duration = (endTime.getTime() - sessionData.startTime.getTime()) / (1000 * 60); // 分
  
  const fatigueScores = sessionData.metricsHistory.map(h => h.metrics.fatigueScore);
  const blinkFrequencies = sessionData.metricsHistory.map(h => h.metrics.blinkFrequency);
  const stressLevels = sessionData.metricsHistory.map(h => h.metrics.stressLevel);
  
  const avgFatigueScore = fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length;
  const avgBlinkFrequency = blinkFrequencies.reduce((a, b) => a + b, 0) / blinkFrequencies.length;
  const avgStressLevel = stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length;
  const maxFatigueScore = Math.max(...fatigueScores);
  
  // 疲労度のトレンド分析
  const firstHalf = fatigueScores.slice(0, Math.floor(fatigueScores.length / 2));
  const secondHalf = fatigueScores.slice(Math.floor(fatigueScores.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  let fatigueProgress: 'improving' | 'stable' | 'declining';
  const diff = secondAvg - firstAvg;
  if (diff > 5) fatigueProgress = 'declining';
  else if (diff < -5) fatigueProgress = 'improving';
  else fatigueProgress = 'stable';
  
  // 平均値を含むfinalMetricsを作成
  const avgMetrics = {
    ...sessionData.currentMetrics!,
    fatigueScore: avgFatigueScore,
    blinkFrequency: avgBlinkFrequency,
    stressLevel: avgStressLevel
  };
  
  return {
    sessionId: sessionData.sessionId,
    duration,
    startTime: sessionData.startTime,
    endTime,
    baselineMetrics: sessionData.currentMetrics!, // 最初のメトリクスをベース代わりに使用
    finalMetrics: avgMetrics, // 平均値を含むメトリクス
    stats: {
      avgFatigueScore,
      maxFatigueScore,
      fatigueProgress,
      attentionDropCount: sessionData.metricsHistory.filter(h => h.metrics.attentionLevel < 50).length,
      stressPeakCount: sessionData.metricsHistory.filter(h => h.metrics.stressLevel > 70).length,
      totalMicroSleepEvents: sessionData.metricsHistory.reduce((sum, h) => sum + h.metrics.microSleepEvents, 0)
    },
    recommendations: generateRecommendations(sessionData),
    scoreImprovementSuggestions: generateImprovementSuggestions(sessionData)
  };
}

// 推奨事項生成
function generateRecommendations(sessionData: SessionData): string[] {
  const recommendations: string[] = [];
  const avgFatigue = sessionData.metricsHistory.reduce((sum, h) => sum + h.metrics.fatigueScore, 0) / sessionData.metricsHistory.length;
  
  if (avgFatigue > 70) {
    recommendations.push('定期的な休憩を取ることを強くお勧めします');
    recommendations.push('作業時間を短縮し、集中力が落ちる前に休む習慣をつけましょう');
  } else if (avgFatigue > 50) {
    recommendations.push('15分ごとの短い休憩を取り入れてみてください');
    recommendations.push('目の運動や深呼吸で疲労をリセットしましょう');
  }
  
  return recommendations;
}

// 改善提案生成
function generateImprovementSuggestions(sessionData: SessionData): string[] {
  const suggestions: string[] = [];
  
  suggestions.push('明るい環境で作業し、画面との距離を適切に保ちましょう');
  suggestions.push('水分補給を忘れずに行い、適度な運動も心がけましょう');
  
  return suggestions;
}