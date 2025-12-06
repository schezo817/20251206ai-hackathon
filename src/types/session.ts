import { FatigueMetrics } from '@/lib/faceDetection';

/**
 * セッション状態の定義
 */
export type SessionStatus = 
  | 'idle'           // 未開始
  | 'initializing'   // 初期化中
  | 'baseline'       // ベースライン測定中
  | 'active'         // アクティブ計測中
  | 'completing'     // 終了処理中
  | 'completed';     // 完了

/**
 * セッション設定
 */
export interface SessionSettings {
  /** ベースライン測定時間（秒） */
  baselineDuration: number;
  /** セッション計測時間（分） */
  activeDuration: number;
  /** データ収集間隔（ミリ秒） */
  dataCollectionInterval: number;
}

/**
 * メトリクス履歴ポイント
 */
export interface MetricsDataPoint {
  timestamp: Date;
  metrics: FatigueMetrics;
  /** ベースラインからの差分 */
  deltaFromBaseline?: Partial<FatigueMetrics>;
  /** 前回測定からの変化率 */
  changeRate?: number;
}

/**
 * セッション統計情報
 */
export interface SessionStats {
  /** 平均疲労スコア */
  avgFatigueScore: number;
  /** 最大疲労スコア */
  maxFatigueScore: number;
  /** 疲労スコア変化トレンド */
  fatigueProgress: 'improving' | 'stable' | 'declining';
  /** 注意力低下回数 */
  attentionDropCount: number;
  /** ストレスピーク回数 */
  stressPeakCount: number;
  /** 微睡イベント総数 */
  totalMicroSleepEvents: number;
}

/**
 * セッション完了サマリー
 */
export interface SessionSummary {
  sessionId: string;
  duration: number; // 実際の測定時間（分）
  startTime: Date;
  endTime: Date;
  baselineMetrics: FatigueMetrics;
  finalMetrics: FatigueMetrics;
  stats: SessionStats;
  recommendations: string[];
  scoreImprovementSuggestions: string[];
}

/**
 * セッションデータ構造
 */
export interface SessionData {
  sessionId: string;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  settings: SessionSettings;
  
  /** ベースライン測定結果 */
  baselineMetrics?: FatigueMetrics;
  /** 現在のメトリクス */
  currentMetrics?: FatigueMetrics;
  /** 全測定データ履歴 */
  metricsHistory: MetricsDataPoint[];
  
  /** セッション完了時のサマリー */
  summary?: SessionSummary;
  
  /** 内部状態 */
  _internal?: {
    baselineStartTime?: Date;
    activeStartTime?: Date;
    autoEndTimer?: NodeJS.Timeout;
    dataCollectionTimer?: NodeJS.Timeout;
    baselineDataCount: number;
    totalDataCount: number;
  };
}

/**
 * デフォルトセッション設定
 */
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  baselineDuration: 0,         // ベースライン測定なし
  activeDuration: 1,           // 1分アクティブ測定
  dataCollectionInterval: 2000 // 2秒間隔でデータ収集
};

/**
 * セッション管理のコールバック関数型
 */
export interface SessionCallbacks {
  onSessionStart?: (sessionId: string) => void;
  onBaselineComplete?: (baselineMetrics: FatigueMetrics) => void;
  onActivePhaseStart?: () => void;
  onSessionComplete?: (summary: SessionSummary) => void;
  onDataUpdate?: (dataPoint: MetricsDataPoint) => void;
  onStatusChange?: (status: SessionStatus) => void;
}

/**
 * セッション作成用のファクトリー関数
 */
export function createSession(settings?: Partial<SessionSettings>): SessionData {
  const sessionSettings = { ...DEFAULT_SESSION_SETTINGS, ...settings };
  
  return {
    sessionId: generateSessionId(),
    status: 'idle',
    startTime: new Date(),
    settings: sessionSettings,
    metricsHistory: [],
    _internal: {
      baselineDataCount: 0,
      totalDataCount: 0
    }
  };
}

/**
 * セッションID生成
 */
function generateSessionId(): string {
  const timestamp = new Date().getTime();
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${timestamp}_${random}`;
}

/**
 * セッション時間フォーマット
 */
export function formatSessionDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
  return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
}

/**
 * セッション進捗率計算
 */
export function calculateSessionProgress(session: SessionData): number {
  if (session.status === 'idle' || session.status === 'initializing') return 0;
  if (session.status === 'completed') return 100;
  
  const now = new Date().getTime();
  const startTime = session._internal?.activeStartTime?.getTime() || session.startTime.getTime();
  const totalDuration = session.settings.activeDuration * 60 * 1000;
  const elapsed = now - startTime;
  
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
}