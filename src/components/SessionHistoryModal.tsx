'use client';

import React, { useState, useEffect } from 'react';
import { SessionHistoryItem, SessionHistoryStats, formatSessionDate, formatDuration } from '@/hooks/useSessionHistory';

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionHistoryItem[];
  stats: SessionHistoryStats;
  getFilteredHistory: (filter?: {
    dateRange?: { start: Date; end: Date };
    fatigueRange?: { min: number; max: number };
    tags?: string[];
  }) => SessionHistoryItem[];
  getTrendData: (days?: number) => { date: string; avgFatigue: number; sessionCount: number }[];
}

interface FilterState {
  dateRange?: { start: string; end: string };
  fatigueRange?: { min: number; max: number };
  tags?: string[];
  sortBy: 'date' | 'fatigue' | 'duration';
  sortOrder: 'asc' | 'desc';
}

export default function SessionHistoryModal({
  isOpen,
  onClose,
  history,
  stats,
  getFilteredHistory,
  getTrendData
}: SessionHistoryModalProps) {
  const [filter, setFilter] = useState<FilterState>({
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [filteredHistory, setFilteredHistory] = useState<SessionHistoryItem[]>(history);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

  // 利用可能なタグを取得
  const availableTags = Array.from(new Set(history.flatMap(item => item.tags || [])));

  // フィルタを適用
  useEffect(() => {
    let filtered = getFilteredHistory({
      dateRange: filter.dateRange ? {
        start: new Date(filter.dateRange.start),
        end: new Date(filter.dateRange.end)
      } : undefined,
      fatigueRange: filter.fatigueRange,
      tags: filter.tags && filter.tags.length > 0 ? filter.tags : undefined
    });

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filter.sortBy) {
        case 'date':
          comparison = a.summary.startTime.getTime() - b.summary.startTime.getTime();
          break;
        case 'fatigue':
          comparison = a.summary.stats.avgFatigueScore - b.summary.stats.avgFatigueScore;
          break;
        case 'duration':
          comparison = a.summary.duration - b.summary.duration;
          break;
      }
      return filter.sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredHistory(filtered);
  }, [filter, getFilteredHistory]);

  const handleTagToggle = (tag: string) => {
    const currentTags = filter.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    setFilter(prev => ({ ...prev, tags: newTags }));
  };

  const clearFilters = () => {
    setFilter({
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const getFatigueColor = (score: number): string => {
    if (score < 25) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
    if (score < 50) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
    if (score < 75) return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendData7Days = getTrendData(7);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">セッション履歴</h2>
              <p className="text-blue-100 mt-1">過去の計測結果と分析データ</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* 表示モード切り替え */}
              <div className="bg-white bg-opacity-20 rounded-lg p-1 flex space-x-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  リスト
                </button>
                <button
                  onClick={() => setViewMode('stats')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    viewMode === 'stats'
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  統計
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-red-200 transition-colors text-2xl"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {viewMode === 'stats' ? (
            /* 統計表示 */
            <div className="space-y-6">
              {/* 全体統計 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">総セッション数</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalSessions}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">平均疲労度</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">{(stats.averageFatigueScore || 0).toFixed(1)}%</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">総計測時間</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatDuration(stats.totalDuration || 0)}</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                  <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">改善傾向</div>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {getTrendIcon(stats.improvementTrend)} {
                      stats.improvementTrend === 'improving' ? '改善' :
                      stats.improvementTrend === 'declining' ? '悪化' : '安定'
                    }
                  </div>
                </div>
              </div>

              {/* 週間トレンド */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">7日間のトレンド</h3>
                <div className="grid grid-cols-7 gap-2">
                  {getTrendData7Days.map((day, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {new Date(day.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm">
                        <div className="text-sm font-bold text-gray-800 dark:text-white">
                          {day.avgFatigue && day.avgFatigue > 0 ? day.avgFatigue.toFixed(1) : '-'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {day.sessionCount || 0}件
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* タグ別統計 */}
              {availableTags.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">タグ別統計</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const tagSessions = history.filter(h => h.tags?.includes(tag));
                      const tagAvg = tagSessions.length > 0 
                        ? tagSessions.reduce((sum, h) => sum + (h.summary.stats?.avgFatigueScore || 0), 0) / tagSessions.length 
                        : 0;
                      return (
                        <div key={tag} className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                          <span className="font-medium text-gray-800 dark:text-white">{tag}</span>
                          <span className="ml-2 text-gray-500 dark:text-gray-400">
                            {tagSessions.length}件・{(tagAvg || 0).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* リスト表示 */
            <div>
              {/* フィルタ・ソート */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 日付範囲 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">日付範囲</label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filter.dateRange?.start || ''}
                        onChange={(e) => setFilter(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value, end: prev.dateRange?.end || '' }
                        }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      />
                      <input
                        type="date"
                        value={filter.dateRange?.end || ''}
                        onChange={(e) => setFilter(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: prev.dateRange?.start || '', end: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* 疲労度範囲 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">疲労度範囲</label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filter.fatigueRange?.min || 0}
                        onChange={(e) => setFilter(prev => ({
                          ...prev,
                          fatigueRange: { min: parseInt(e.target.value), max: prev.fatigueRange?.max || 100 }
                        }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{filter.fatigueRange?.min || 0}%</span>
                        <span>{filter.fatigueRange?.max || 100}%</span>
                      </div>
                    </div>
                  </div>

                  {/* ソート */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">ソート</label>
                    <div className="space-y-2">
                      <select
                        value={filter.sortBy}
                        onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      >
                        <option value="date">日時順</option>
                        <option value="fatigue">疲労度順</option>
                        <option value="duration">時間順</option>
                      </select>
                      <select
                        value={filter.sortOrder}
                        onChange={(e) => setFilter(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      >
                        <option value="desc">降順</option>
                        <option value="asc">昇順</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* タグフィルタ */}
                {availableTags.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">タグ</label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            filter.tags?.includes(tag)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* フィルタクリア */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    フィルタクリア
                  </button>
                </div>
              </div>

              {/* 履歴リスト */}
              <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-lg font-medium">該当するセッションがありません</p>
                    <p className="text-sm">フィルタ条件を変更してみてください</p>
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="text-lg font-semibold text-gray-800 dark:text-white">
                              {formatSessionDate(item.summary.startTime)}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getFatigueColor(item.summary.stats?.avgFatigueScore || 0)}`}>
                              {(item.summary.stats?.avgFatigueScore || 0).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDuration(item.summary.duration)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {item.tags?.map((tag, index) => (
                              <React.Fragment key={tag}>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                  {tag}
                                </span>
                                {index < item.tags!.length - 1 && (
                                  <span className="text-gray-400 dark:text-gray-500 text-xs mx-1">・</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 md:ml-6 grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">疲労レベル平均</div>
                            <div className="text-sm font-bold text-gray-800 dark:text-white">
                              {(item.summary.stats?.avgFatigueScore || 0).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">瞬き回数平均</div>
                            <div className="text-sm font-bold text-gray-800 dark:text-white">
                              {(item.summary.finalMetrics?.blinkFrequency || 0).toFixed(0)}/分
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ストレス平均</div>
                            <div className="text-sm font-bold text-gray-800 dark:text-white">
                              {(item.summary.finalMetrics?.stressLevel || 0).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}