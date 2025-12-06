import { useState, useEffect, useCallback } from 'react';
import { SessionSummary, SessionData } from '@/types/session';

const STORAGE_KEY = 'fatigueCare_sessionHistory';

export interface SessionHistoryItem {
  id: string;
  summary: SessionSummary;
  timestamp: number;
  tags?: string[];
}

export interface SessionHistoryStats {
  totalSessions: number;
  averageFatigueScore: number;
  totalDuration: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
  lastWeekAverage: number;
  thisWeekAverage: number;
}

interface UseSessionHistoryReturn {
  // 履歴データ
  history: SessionHistoryItem[];
  stats: SessionHistoryStats;
  
  // 履歴管理
  addSession: (summary: SessionSummary) => void;
  removeSession: (sessionId: string) => void;
  clearHistory: () => void;
  
  // フィルタリング・ソート
  getFilteredHistory: (filter?: {
    dateRange?: { start: Date; end: Date };
    fatigueRange?: { min: number; max: number };
    tags?: string[];
  }) => SessionHistoryItem[];
  
  // 統計計算
  calculateStats: (items?: SessionHistoryItem[]) => SessionHistoryStats;
  getTrendData: (days?: number) => { date: string; avgFatigue: number; sessionCount: number }[];
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);

  // ローカルストレージから履歴を読み込み
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEY);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory) as SessionHistoryItem[];
        // 日付の復元
        const restored = parsed.map(item => ({
          ...item,
          summary: {
            ...item.summary,
            startTime: new Date(item.summary.startTime),
            endTime: new Date(item.summary.endTime)
          }
        }));
        setHistory(restored);
      }
    } catch (error) {
      console.error('履歴データの読み込みに失敗:', error);
      setHistory([]);
    }
  }, []);

  // 履歴をローカルストレージに保存
  const saveToStorage = useCallback((historyData: SessionHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
    } catch (error) {
      console.error('履歴データの保存に失敗:', error);
    }
  }, []);

  // セッション追加
  const addSession = useCallback((summary: SessionSummary) => {
    const newItem: SessionHistoryItem = {
      id: summary.sessionId,
      summary,
      timestamp: Date.now(),
      tags: generateAutoTags(summary)
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 100); // 最大100件保持
      saveToStorage(updated);
      return updated;
    });

    console.log('セッション履歴に追加:', newItem.id);
  }, [saveToStorage]);

  // セッション削除
  const removeSession = useCallback((sessionId: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== sessionId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // 履歴全削除
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // フィルタリング
  const getFilteredHistory = useCallback((filter?: {
    dateRange?: { start: Date; end: Date };
    fatigueRange?: { min: number; max: number };
    tags?: string[];
  }) => {
    if (!filter) return history;

    return history.filter(item => {
      // 日付範囲フィルタ
      if (filter.dateRange) {
        const itemDate = new Date(item.summary.startTime);
        if (itemDate < filter.dateRange.start || itemDate > filter.dateRange.end) {
          return false;
        }
      }

      // 疲労度範囲フィルタ
      if (filter.fatigueRange) {
        const avgFatigue = item.summary.stats.avgFatigueScore;
        if (avgFatigue < filter.fatigueRange.min || avgFatigue > filter.fatigueRange.max) {
          return false;
        }
      }

      // タグフィルタ
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => 
          item.tags?.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [history]);

  // 統計計算
  const calculateStats = useCallback((items: SessionHistoryItem[] = history): SessionHistoryStats => {
    if (items.length === 0) {
      return {
        totalSessions: 0,
        averageFatigueScore: 0,
        totalDuration: 0,
        improvementTrend: 'stable',
        lastWeekAverage: 0,
        thisWeekAverage: 0
      };
    }

    const totalSessions = items.length;
    const totalDuration = items.reduce((sum, item) => sum + item.summary.duration, 0);
    const averageFatigueScore = items.reduce((sum, item) => 
      sum + item.summary.stats.avgFatigueScore, 0) / totalSessions;

    // 週ごとの比較
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    const thisWeekItems = items.filter(item => item.timestamp > oneWeekAgo);
    const lastWeekItems = items.filter(item => 
      item.timestamp > twoWeeksAgo && item.timestamp <= oneWeekAgo);

    const thisWeekAverage = thisWeekItems.length > 0 
      ? thisWeekItems.reduce((sum, item) => sum + item.summary.stats.avgFatigueScore, 0) / thisWeekItems.length
      : 0;

    const lastWeekAverage = lastWeekItems.length > 0 
      ? lastWeekItems.reduce((sum, item) => sum + item.summary.stats.avgFatigueScore, 0) / lastWeekItems.length
      : 0;

    // トレンド計算
    let improvementTrend: 'improving' | 'stable' | 'declining';
    if (lastWeekAverage === 0) {
      improvementTrend = 'stable';
    } else {
      const diff = thisWeekAverage - lastWeekAverage;
      if (diff < -5) improvementTrend = 'improving'; // 疲労度が下がった = 改善
      else if (diff > 5) improvementTrend = 'declining';
      else improvementTrend = 'stable';
    }

    return {
      totalSessions,
      averageFatigueScore,
      totalDuration,
      improvementTrend,
      lastWeekAverage,
      thisWeekAverage
    };
  }, [history]);

  // トレンドデータ取得
  const getTrendData = useCallback((days: number = 7) => {
    const result: { date: string; avgFatigue: number; sessionCount: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayItems = history.filter(item => {
        const itemDate = new Date(item.summary.startTime);
        return itemDate >= dayStart && itemDate <= dayEnd;
      });
      
      const avgFatigue = dayItems.length > 0 
        ? dayItems.reduce((sum, item) => sum + item.summary.stats.avgFatigueScore, 0) / dayItems.length
        : 0;
      
      result.push({
        date: dateStr,
        avgFatigue,
        sessionCount: dayItems.length
      });
    }
    
    return result;
  }, [history]);

  // 現在の統計を計算
  const stats = calculateStats();

  return {
    history,
    stats,
    addSession,
    removeSession,
    clearHistory,
    getFilteredHistory,
    calculateStats,
    getTrendData
  };
}

// 自動タグ生成
function generateAutoTags(summary: SessionSummary): string[] {
  const tags: string[] = [];
  
  // 疲労度レベル
  if (summary.stats.avgFatigueScore < 25) {
    tags.push('良好');
  } else if (summary.stats.avgFatigueScore < 50) {
    tags.push('普通');
  } else if (summary.stats.avgFatigueScore < 75) {
    tags.push('疲労');
  } else {
    tags.push('高疲労');
  }
  
  // 時間帯
  const hour = summary.startTime.getHours();
  if (hour < 6) tags.push('深夜');
  else if (hour < 12) tags.push('午前');
  else if (hour < 18) tags.push('午後');
  else tags.push('夜間');
  
  // ストレス状態
  if (summary.stats.stressPeakCount > 3) {
    tags.push('高ストレス');
  } else if (summary.stats.stressPeakCount === 0) {
    tags.push('低ストレス');
  }
  
  // 注意力
  if (summary.stats.attentionDropCount > 5) {
    tags.push('注意散漫');
  } else if (summary.stats.attentionDropCount === 0) {
    tags.push('集中');
  }
  
  // トレンド
  if (summary.stats.fatigueProgress === 'improving') {
    tags.push('改善中');
  } else if (summary.stats.fatigueProgress === 'declining') {
    tags.push('悪化傾向');
  }
  
  return tags;
}

// 日時フォーマット用ヘルパー
export function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}秒`;
  } else if (minutes < 60) {
    return `${minutes.toFixed(1)}分`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}時間${mins}分`;
  }
}