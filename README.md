## aiハッカソン
## 大前提
完全にaiに任せて開発する。

## 将来の働き方とは
問い: 将来エンジニアはどうなっていると思うか？
自分の中での答え: ゴールドラッシュでいうところのスコップの形状を設計をしている、ごく一部のエンジニアだけが残っていく。

とはいえ近未来の働き方改善になるものを作りたい
->表情認識によるメンタルケアをを実装する。


## AI提案の設計
「FatigueCare」- 表情認識メンタルケアサービス設計
素晴らしいアイデアですね！評価基準に沿って、ハッカソンで映える設計を提案します。

 1. 未来ビジョン度 (Vision)
コンセプト：「自分の疲れに気づけない時代を終わらせる」
課題設定（共感ポイント）

リモートワーク増加で「頑張りすぎ」に誰も気づいてくれない
自分の疲労は自分では見えない（鏡を見ない限り）
メンタル不調は「気づいた時には遅い」

ビジョンステートメント

「あなたの顔が、あなたの心を守るセンサーになる」
働く人の表情を優しく見守り、本人より先に疲れを察知。
休むべき時に、そっと背中を押してくれる「デジタル同僚」

ストーリー例（デモで見せる）
朝9時：「今日も元気そうですね！調子良さそう 😊」
午後3時：「少し目の周りに疲れが見えます。コーヒーブレイクどうですか？☕」
午後6時：「今日は頑張りましたね。そろそろ切り上げ時かも 🌙」

🤖 2. 技術的チャレンジ度 (Technology)
アーキテクチャ
┌─────────────────────────────────────────────────────────────┐
│                      ブラウザ/デスクトップアプリ                │
├─────────────────────────────────────────────────────────────┤
│  📷 Webカメラ                                                │
│      ↓                                                      │
│  🔍 顔検出 (MediaPipe / face-api.js)                        │
│      ↓                                                      │
│  📊 特徴量抽出                                               │
│      - 目の開き具合 (EAR: Eye Aspect Ratio)                  │
│      - 口角の位置                                            │
│      - 眉の位置・角度                                         │
│      - 顔色（HSV解析）                                       │
│      - まばたき頻度                                          │
│      ↓                                                      │
│  🧠 疲労度スコアリング (時系列変化を考慮)                      │
│      ↓                                                      │
│  💬 Claude API → パーソナライズされたケアメッセージ生成         │
└─────────────────────────────────────────────────────────────┘
技術的な「面白さ」ポイント
要素工夫時系列比較朝の表情をベースラインとして、時間経過での変化を検出複合指標単一の表情ではなく、複数の微細な変化を組み合わせてスコア化Claude活用疲労度＋時間帯＋過去履歴を踏まえた「共感的で具体的な」ケア提案プライバシー配慮画像はローカル処理のみ、サーバーには数値データのみ送信
Claude APIの活用例（プロンプト設計）
javascriptconst prompt = `
あなたは優しいメンタルケアアシスタントです。

【現在の状態】
- 疲労スコア: ${fatigueScore}/100
- 時刻: ${currentTime}
- 作業継続時間: ${workDuration}分
- 今日のスコア推移: ${scoreHistory}

【過去の傾向】
- この人は午後3時頃に疲れやすい
- コーヒーブレイクの提案に好反応

上記を踏まえ、押し付けがましくなく、
具体的で実行可能なケアメッセージを1-2文で生成してください。
`;
```

---

## 💡 3. 具体性と実現可能性 (Feasibility & Demo)

### MVP（最小限のデモ）構成

**使用技術（すべて無料・即座に使える）**

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React / Next.js |
| 顔認識 | face-api.js（ブラウザで動作） |
| AI対話 | Claude API (Anthropic) |
| UI | Tailwind CSS |

### デモシナリオ（5分間のプレゼン用）
```
1. [0:00] アプリ起動 → カメラ許可 → 顔検出開始
2. [0:30] 「おはようございます！今日の調子を記録しました」
3. [1:00] （疲れた表情を作る）→ リアルタイムでスコア変動
4. [1:30] 閾値超え → Claudeからケアメッセージ表示
   「目の疲れが見えますね。20-20-20ルール試してみませんか？
   20分ごとに、20フィート先を、20秒見るだけで目が楽になりますよ」
5. [2:00] ダッシュボードで1日の疲労推移グラフを表示
   実装の優先順位
   優先度機能実装目安🔴 必須カメラ映像から顔検出2時間🔴 必須疲労スコア算出（EAR等）3時間🔴 必須Claude APIでメッセージ生成2時間🟡 推奨スコア履歴グラフ2時間🟢 あれば通知機能1時間

🎯 審査員へのアピールポイントまとめ
評価軸アピールVision「見えない疲れ」という普遍的課題。リモートワーク時代の孤独な働き方を変えるTechnology顔認識×時系列分析×生成AIの3層構造。プライバシー配慮設計Feasibilityブラウザだけで動く。デモで「自分の疲れ」をリアルタイム可視化


## 技術的情報

### 🛠️ アーキテクチャ

#### フロントエンド
- **Framework**: Next.js 14.2.14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18.3.1
- **Styling**: Tailwind CSS
- **Features**: ダークモード対応、レスポンシブデザイン

#### AI・機械学習
- **顔検出**: face-api.js
  - TinyFaceDetector による高速顔検出
  - 68点顔ランドマーク検出
  - リアルタイム表情認識
- **AI対話**: Claude API (Anthropic)
  - 疲労状態に応じたパーソナライズメッセージ生成
  - 時系列データを考慮した文脈的回答

#### データ処理
- **MediaStream API**: WebRTC による高品質カメラアクセス
- **リアルタイム分析**: 毎フレームでの顔特徴量抽出
- **プライバシー保護**: 画像はローカル処理のみ、サーバーには数値データのみ送信

### 📊 疲労度分析アルゴリズム

#### 1. 多次元メトリクス
```typescript
interface FatigueMetrics {
  eyeAspectRatio: number;        // 目の開き具合 (EAR)
  mouthCurveRatio: number;       // 口角の位置
  eyebrowPosition: number;       // 眉の位置
  blinkFrequency: number;        // まばたき頻度
  headPose: {                    // 頭部姿勢
    pitch: number; yaw: number; roll: number;
  };
  expressionScores: {            // 表情スコア
    happy: number; sad: number; neutral: number;
    surprised: number; angry: number; fearful: number;
    disgusted: number;
  };
  microSleepEvents: number;      // 微睡イベント数
  attentionLevel: number;        // 注意レベル (0-100%)
  stressLevel: number;          // ストレスレベル (0-100%)
  fatigueScore: number;         // 総合疲労スコア (0-100%)
  confidenceLevel: number;      // 信頼度
  trend: 'improving' | 'stable' | 'declining'; // トレンド
}
```

#### 2. EAR (Eye Aspect Ratio) 計算
```javascript
// EAR = (|P2-P6| + |P3-P5|) / (2 * |P1-P4|)
calculateEAR(landmarks) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  
  // 各目のEARを計算
  const leftEAR = this.calculateSingleEyeEAR(leftEye);
  const rightEAR = this.calculateSingleEyeEAR(rightEye);
  
  return (leftEAR + rightEAR) / 2;
}

calculateSingleEyeEAR(eyePoints) {
  const vertical1 = distance(eyePoints[1], eyePoints[5]);
  const vertical2 = distance(eyePoints[2], eyePoints[4]);
  const horizontal = distance(eyePoints[0], eyePoints[3]);
  
  return (vertical1 + vertical2) / (2 * horizontal);
}
```

#### 3. 疲労度スコア統合アルゴリズム
```javascript
calculateFatigueScore(metrics) {
  let score = 0;
  
  // 各要素の重み付け合計 (8次元分析)
  score += Math.max(0, (baseline.EAR - current.EAR) * 80);     // 20%
  score += mouthChange * 40;                                   // 10%
  score += eyebrowChange * 25;                                 // 8%
  score += blinkChange * 1.5;                                  // 7%
  score += microSleepScore;                                    // 15%
  score += attentionDeficit * 0.3;                            // 20%
  score += headPoseInstability * 0.8;                         // 10%
  score += expressionFatigue * 0.2;                           // 10%
  
  // トレンド補正
  score *= trendMultiplier; // declining: 1.3x, improving: 0.7x
  
  // 信頼度補正
  score *= (confidenceLevel / 100);
  
  return Math.min(100, Math.max(0, score));
}
```

#### 4. ストレスレベル検出
```javascript
calculateStressLevel(expressions, metrics) {
  let stressScore = 25; // ベースライン
  
  // 多軸分析
  // 1. 即時表情分析
  stressScore += (angry + fearful + disgusted + sad) * 150;
  
  // 2. 表情変化率分析
  if (expressionHistory.length >= 5) {
    const emotionVariance = calculateEmotionVariance();
    stressScore += emotionVariance * 60;
  }
  
  // 3. 生理的指標
  stressScore += blinkAbnormality * 2;
  stressScore += EARAbnormality * 80;
  
  // 4. 頭部動作不安定性
  stressScore += headMovementInstability * 1.2;
  
  // 5. 感情抑制兆候
  if (neutral > 0.8) stressScore += (neutral - 0.8) * 50;
  
  // 6. 時系列トレンド増幅
  if (isRisingTrend) stressScore *= 1.2;
  
  return Math.min(100, Math.max(5, stressScore));
}
```

### 🎯 技術的特徴

#### リアルタイム処理
- **60FPS対応**: 毎フレーム分析による即座の反応
- **軽量化**: TinyFaceDetector使用で低負荷
- **バッファリング**: 過去データを活用した安定性向上

#### 時系列分析
- **履歴管理**: 50回分のメトリクス履歴保持
- **トレンド検出**: 改善・安定・悪化の3段階判定
- **ベースライン学習**: 個人差に対応した動的基準値設定

#### プライバシー設計
- **ローカル処理**: 顔画像はブラウザ内で処理
- **最小データ**: 数値メトリクスのみサーバー送信
- **透明性**: 処理内容をリアルタイム表示

### 🚀 パフォーマンス最適化

#### フロントエンド
- **Next.js最適化**: App Router使用によるページ分割
- **TypeScript**: 型安全性による実行時エラー防止
- **React Hooks**: useCallback, useMemoによる再レンダリング最適化

#### カメラ処理
- **Ref Callback**: 確実なビデオ要素アクセス
- **フォールバック戦略**: 複数のタイミングでストリーム初期化
- **エラーハンドリング**: カメラアクセス失敗時の適切な処理

### 🔧 開発・デプロイ

#### 開発環境
```bash
npm run dev    # 開発サーバー起動
npm run build  # プロダクションビルド
npm run lint   # コード品質チェック
npm run type-check # TypeScript型チェック
```

#### 環境変数
```env
ANTHROPIC_API_KEY=your_claude_api_key
NODE_ENV=development|production
```

#### デプロイ要件
- **HTTPS必須**: カメラアクセスにはセキュア接続が必要
- **モダンブラウザ**: WebRTC, MediaStream API対応
- **十分なメモリ**: 顔認識処理のため最低4GB推奨

### 📈 将来の拡張性

#### 機能拡張
- **音声解析**: 音声による感情・疲労検出
- **生体センサー**: ウェアラブルデバイス連携
- **チーム機能**: グループでの疲労状況共有

#### 技術拡張
- **エッジAI**: WebAssemblyによる高速化
- **リアルタイム通信**: WebSocketによるチーム連携
- **データ分析**: 長期傾向分析とレポート生成

## 🤖 AIケアアシスタント設定

### Gemini API設定

FatigueCareでは、Gemini AIを使用してパーソナライズされたケアメッセージを生成します。

#### 1. APIキーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたAPIキーをコピー

#### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成：

```bash
# .env.local
GEMINI_API_KEY=your_actual_api_key_here
```

#### 3. 機能説明

**AIケアアシスタントの特徴：**
- 疲労度に基づいたパーソナライズメッセージ
- 科学的根拠に基づいたケア提案
- 優しく親しみやすいトーン
- 即座に実行できる具体的なアドバイス

**フォールバック機能：**
- APIキーが設定されていない場合、事前定義メッセージを使用
- ネットワークエラー時の自動フォールバック
- 安定したユーザー体験を保証

#### 4. セキュリティ

⚠️ **重要**: APIキーは絶対に公開リポジトリにコミットしないでください

- `.env.local` は `.gitignore` に含まれています
- 本番環境では環境変数として設定
- 定期的なAPIキーのローテーション推奨

