import { FatigueMetrics } from './faceDetection';

export interface CareMessage {
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export interface UserContext {
  currentTime: string;
  workDuration: number;
  scoreHistory: number[];
  previousMessages: string[];
}

export class ClaudeCarePlanner {
  private static readonly API_ENDPOINT = '/api/care-message';

  static formatTimeContext(workDuration: number): string {
    const hours = Math.floor(workDuration / 60);
    const minutes = workDuration % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  }

  static categorizeScore(score: number): 'low' | 'medium' | 'high' {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    return 'high';
  }

  static generatePrompt(metrics: FatigueMetrics, context: UserContext): string {
    const severity = this.categorizeScore(metrics.fatigueScore);
    const timeOfDay = new Date().getHours();
    
    let timeContext = '';
    if (timeOfDay < 12) {
      timeContext = '午前中';
    } else if (timeOfDay < 18) {
      timeContext = '午後';
    } else {
      timeContext = '夕方';
    }

    return `あなたは優しくて共感的なメンタルケアアシスタントです。

【現在の状況】
- 疲労スコア: ${metrics.fatigueScore.toFixed(1)}/100
- 時間帯: ${timeContext} (${context.currentTime})
- 作業継続時間: ${this.formatTimeContext(context.workDuration)}
- 目の開き具合 (EAR): ${metrics.eyeAspectRatio.toFixed(3)}
- まばたき頻度: ${metrics.blinkFrequency}回/分
- 重要度: ${severity}

【過去のスコア推移】
${context.scoreHistory.slice(-5).map((score, i) => `${i+1}回前: ${score.toFixed(1)}`).join(', ')}

【ガイドライン】
1. 押し付けがましくない、自然な声かけ
2. 具体的で実行しやすい提案
3. ユーザーの状況に共感を示す
4. 1-2文の簡潔なメッセージ

疲労度が${severity}レベルの状況で、適切なケアメッセージを日本語で生成してください。`;
  }

  static async generateCareMessage(
    metrics: FatigueMetrics,
    context: UserContext
  ): Promise<CareMessage> {
    const severity = this.categorizeScore(metrics.fatigueScore);
    
    if (metrics.fatigueScore < 20) {
      return {
        message: `調子良さそうですね！このまま頑張って 😊`,
        severity: 'low',
        suggestions: ['水分補給を忘れずに', '良いペースを維持しましょう']
      };
    }

    try {
      const prompt = this.generatePrompt(metrics, context);
      
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        message: data.message,
        severity,
        suggestions: data.suggestions || this.getDefaultSuggestions(severity)
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return this.getFallbackMessage(severity);
    }
  }

  private static getDefaultSuggestions(severity: 'low' | 'medium' | 'high'): string[] {
    switch (severity) {
      case 'low':
        return ['水分補給をしましょう', '背筋を伸ばしてみませんか'];
      case 'medium':
        return ['5分間休憩してみませんか', '軽くストレッチをしてみましょう', '深呼吸をしてみてください'];
      case 'high':
        return ['20分程度の休憩をお勧めします', '散歩や軽い運動はいかがですか', '目を閉じて休憩しましょう'];
    }
  }

  private static getFallbackMessage(severity: 'low' | 'medium' | 'high'): CareMessage {
    const messages = {
      low: 'お疲れ様です。調子良さそうですね！',
      medium: '少し疲れが見えてきました。軽く休憩してみませんか？',
      high: 'かなりお疲れのようです。しっかりと休憩を取りましょう。'
    };

    return {
      message: messages[severity],
      severity,
      suggestions: this.getDefaultSuggestions(severity)
    };
  }
}