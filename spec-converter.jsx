import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Layout, Sparkles, ChevronRight, Loader2, RefreshCw, Download, Copy } from 'lucide-react';

const SYSTEM_PROMPT = `あなたは「抽象→仕様変換AI」です。ユーザーのふわっとしたアイデアを、開発可能な仕様書に変換する専門家です。

## あなたの役割
1. ユーザーの曖昧なアイデアを受け取る
2. 適切な質問で具体化を促す
3. 理解を確認しながら要件を整理
4. 最終的に構造化された仕様書を生成

## 対話のガイドライン
- 1回のレスポンスで質問は2-3個まで
- 「いい感じ」「使いやすい」などの曖昧な表現を検出したら具体化を促す
- 類似サービスの例を挙げて確認する
- ユーザーの言葉を技術用語に翻訳して確認する

## 対話フェーズ
Phase 1: アイデアの理解（誰が、何を、なぜ）
Phase 2: 機能の具体化（どのように実現するか）
Phase 3: 優先度の整理（MVP vs 将来機能）
Phase 4: 仕様書の生成

## 仕様書生成時のフォーマット
ユーザーが「仕様書を生成して」「まとめて」などと言ったら、以下の形式で出力：

---SPEC_START---
{
  "productName": "プロダクト名",
  "概要": "1-2文の説明",
  "ターゲットユーザー": "誰が使うか",
  "解決する課題": "何を解決するか",
  "機能要件": [
    {"priority": "Must", "feature": "機能1", "description": "詳細"},
    {"priority": "Should", "feature": "機能2", "description": "詳細"}
  ],
  "非機能要件": ["要件1", "要件2"],
  "MVP": ["最小構成の機能リスト"],
  "技術構成案": ["技術1", "技術2"],
  "画面構成": [
    {"name": "画面名", "purpose": "目的", "elements": ["要素1", "要素2"]}
  ]
}
---SPEC_END---

通常の会話では上記フォーマットは使わず、自然な対話を続けてください。`;

export default function SpecConverterAI() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `こんにちは！**抽象→仕様変換AI**です 🎯

あなたの「ふわっとしたアイデア」を、開発可能な仕様書に変換するお手伝いをします。

下のサンプルを試すか、自由にアイデアを入力してください！`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSpec, setGeneratedSpec] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const sampleScenarios = [
    {
      title: '🌤️ チームの天気予報',
      description: 'チームの雰囲気を天気で表現',
      prompt: 'チームの雰囲気が分かるようなやつが欲しい。Slackでのやり取りから、今日のチームの調子を天気みたいに表示できたらいいな。'
    },
    {
      title: '💬 お客様の声分析',
      description: '顧客フィードバックを自動分析',
      prompt: 'お客さんからの問い合わせやレビューを自動で分析して、改善点を見つけられるシステムが欲しい。'
    },
    {
      title: '📚 社内ナレッジ共有',
      description: '知識の共有をスムーズに',
      prompt: '社内の情報共有をもっとスムーズにしたい。誰がどんなスキルを持っているか分からないし、過去のノウハウも探しにくい。'
    },
    {
      title: '⚡ タスク効率化',
      description: '繰り返し作業の自動化',
      prompt: '毎週同じような報告書を作っているんだけど、これを自動化できないかな？データを入れたら勝手にグラフとかまとめてくれるやつ。'
    }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseSpecFromResponse = (text) => {
    const specMatch = text.match(/---SPEC_START---([\s\S]*?)---SPEC_END---/);
    if (specMatch) {
      try {
        const spec = JSON.parse(specMatch[1].trim());
        return {
          spec,
          cleanText: text.replace(/---SPEC_START---[\s\S]*?---SPEC_END---/, '').trim()
        };
      } catch (e) {
        console.error('Spec parse error:', e);
      }
    }
    return { spec: null, cleanText: text };
  };

  const simulateAIResponse = (userInput) => {
    const responses = {
      'チーム': 'チームに関するアイデアですね！もう少し詳しく教えてください。\n\n- どんなチームですか？（開発チーム、営業チーム、など）\n- 現在どのような課題がありますか？\n- チームの規模はどのくらいですか？',
      '天気': 'チームの状況を天気で表現するアイデアですね！面白いです。\n\n- どのようなデータから天気を判定しますか？（Slack、メール、作業時間など）\n- 誰が見るためのものですか？（マネージャー、メンバー全員？）\n- どのタイミングで更新したいですか？',
      '仕様書': JSON.stringify({
        "productName": "Team Weather Dashboard",
        "概要": "チームのコミュニケーション状況を天気で可視化するダッシュボード",
        "ターゲットユーザー": "チームマネージャーとメンバー",
        "解決する課題": "チーム内の雰囲気やコミュニケーション状況の可視化",
        "機能要件": [
          {"priority": "Must", "feature": "Slack連携", "description": "Slackメッセージの感情分析"},
          {"priority": "Must", "feature": "天気表示", "description": "チーム状況を天気で表現"},
          {"priority": "Should", "feature": "週次レポート", "description": "一週間の推移を表示"}
        ],
        "非機能要件": ["プライバシー保護", "リアルタイム更新"],
        "MVP": ["Slack連携", "基本的な感情分析", "天気アイコン表示"],
        "技術構成案": ["React", "Node.js", "Slack API", "Cloud Functions"],
        "画面構成": [
          {"name": "ダッシュボード", "purpose": "現在の天気表示", "elements": ["天気アイコン", "コメント数", "アクティビティ"]}
        ]
      })
    };
    
    for (const key in responses) {
      if (userInput.includes(key)) {
        return responses[key];
      }
    }
    
    return 'もう少し具体的に教えてください。例えば：\n- 誰が使いますか？\n- どのような問題を解決したいですか？\n- 似ているサービスはありますか？';
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
      
      let assistantText;
      
      if (apiKey) {
        // Real API call
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 2000,
            system: SYSTEM_PROMPT,
            messages: newMessages.map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${response.status} - ${errorData.error?.message || '不明なエラー'}`);
        }

        const data = await response.json();
        assistantText = data.content?.[0]?.text || 'レスポンスの解析に失敗しました';
      } else {
        // Demo mode with simulated responses
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        assistantText = simulateAIResponse(input);
      }
      
      const { spec, cleanText } = parseSpecFromResponse(assistantText);
      
      if (spec) {
        setGeneratedSpec(spec);
        setActiveTab('spec');
      }

      setMessages([...newMessages, { 
        role: 'assistant', 
        content: cleanText || '仕様書を生成しました！「仕様書」タブをご確認ください。' 
      }]);
    } catch (error) {
      console.error('API Error:', error);
      let errorMessage = 'エラーが発生しました。';
      
      if (error.message.includes('API Error')) {
        errorMessage = `API エラー: ${error.message}`;
      } else if (error.name === 'TypeError') {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else {
        errorMessage = `予期しないエラー: ${error.message}`;
      }
      
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: `${errorMessage}\n\n💡 **デモモード**: APIキーが設定されていない場合、簡易的なレスポンスでデモが動作します。`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([{
      role: 'assistant',
      content: `新しいアイデアについて聞かせてください！どんなものを作りたいですか？`
    }]);
    setGeneratedSpec(null);
    setActiveTab('chat');
  };

  const requestSpecGeneration = () => {
    setInput('これまでの内容をもとに仕様書を生成してください');
    setTimeout(() => sendMessage(), 100);
  };

  const convertSpecToMarkdown = (spec) => {
    let markdown = `# ${spec.productName || 'プロダクト仕様書'}\n\n`;
    
    if (spec.概要) {
      markdown += `## 概要\n${spec.概要}\n\n`;
    }
    
    if (spec.ターゲットユーザー) {
      markdown += `## ターゲットユーザー\n${spec.ターゲットユーザー}\n\n`;
    }
    
    if (spec.解決する課題) {
      markdown += `## 解決する課題\n${spec.解決する課題}\n\n`;
    }
    
    if (spec.機能要件?.length > 0) {
      markdown += `## 機能要件\n\n`;
      spec.機能要件.forEach((req, i) => {
        markdown += `### ${req.feature} (${req.priority})\n${req.description}\n\n`;
      });
    }
    
    if (spec.非機能要件?.length > 0) {
      markdown += `## 非機能要件\n`;
      spec.非機能要件.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += '\n';
    }
    
    if (spec.MVP?.length > 0) {
      markdown += `## MVP（最小構成）\n`;
      spec.MVP.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += '\n';
    }
    
    if (spec.技術構成案?.length > 0) {
      markdown += `## 技術構成案\n`;
      spec.技術構成案.forEach(tech => {
        markdown += `- ${tech}\n`;
      });
      markdown += '\n';
    }
    
    if (spec.画面構成?.length > 0) {
      markdown += `## 画面構成\n\n`;
      spec.画面構成.forEach((screen, i) => {
        markdown += `### ${screen.name}\n**目的**: ${screen.purpose}\n\n**要素**:\n`;
        screen.elements?.forEach(el => {
          markdown += `- ${el}\n`;
        });
        markdown += '\n';
      });
    }
    
    markdown += '\n---\n*この仕様書は抽象→仕様変換AIによって自動生成されました*';
    return markdown;
  };

  const downloadSpec = () => {
    if (!generatedSpec) return;
    
    const markdown = convertSpecToMarkdown(generatedSpec);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedSpec.productName || 'spec'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToastMessage(`${generatedSpec.productName || '仕様書'}.mdをダウンロードしました！`);
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copySpecToClipboard = async () => {
    if (!generatedSpec) return;
    
    const markdown = convertSpecToMarkdown(generatedSpec);
    try {
      await navigator.clipboard.writeText(markdown);
      showToastMessage('仕様書をクリップボードにコピーしました！');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showToastMessage('コピーに失敗しました。ブラウザの設定をご確認ください。');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">抽象→仕様変換AI</h1>
              <p className="text-xs text-white/60">ふわっとしたアイデアを開発可能な仕様書に</p>
            </div>
          </div>
          <button
            onClick={resetConversation}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-2">
          {[
            { id: 'chat', label: '対話', icon: Send },
            { id: 'spec', label: '仕様書', icon: FileText, disabled: !generatedSpec },
            { id: 'mock', label: 'モック', icon: Layout, disabled: !generatedSpec }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : tab.disabled
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pb-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-b-2xl rounded-tr-2xl border border-white/10 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: msg.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }} 
                      />
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80">AIが分析中...</span>
                          <div className="w-32 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full animate-pulse" style={{width: '60%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Sample Scenarios */}
              {messages.length === 1 && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sampleScenarios.map((scenario, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(scenario.prompt)}
                        className="text-left p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                      >
                        <h4 className="font-medium text-sm mb-1 group-hover:text-purple-300 transition-colors">
                          {scenario.title}
                        </h4>
                        <p className="text-xs text-white/60">
                          {scenario.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {messages.length > 4 && !generatedSpec && (
                <div className="px-4 pb-2">
                  <button
                    onClick={requestSpecGeneration}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    仕様書を生成する
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="アイデアを入力してください..."
                    className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spec Tab */}
          {activeTab === 'spec' && generatedSpec && (
            <div className="h-full overflow-y-auto">
              {/* Export Controls */}
              <div className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">生成された仕様書</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={copySpecToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      コピー
                    </button>
                    <button
                      onClick={downloadSpec}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      ダウンロード
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <SpecDocument spec={generatedSpec} />
              </div>
            </div>
          )}

          {/* Mock Tab */}
          {activeTab === 'mock' && generatedSpec && (
            <div className="h-full overflow-y-auto p-6">
              <MockGenerator spec={generatedSpec} />
            </div>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg border border-green-500">
            <p className="text-sm font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecDocument({ spec }) {
  const priorityColors = {
    Must: 'bg-red-500/20 text-red-300 border-red-500/30',
    Should: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Could: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Wont: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{spec.productName || 'プロダクト仕様書'}</h2>
        <span className="text-xs text-white/40">自動生成</span>
      </div>

      <section className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-purple-400 mb-2">概要</h3>
        <p className="text-white/80">{spec.概要}</p>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">ターゲットユーザー</h3>
          <p className="text-white/80">{spec.ターゲットユーザー}</p>
        </section>
        <section className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">解決する課題</h3>
          <p className="text-white/80">{spec.解決する課題}</p>
        </section>
      </div>

      <section className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-purple-400 mb-3">機能要件</h3>
        <div className="space-y-2">
          {spec.機能要件?.map((req, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
              <span className={`px-2 py-0.5 text-xs rounded border ${priorityColors[req.priority] || priorityColors.Could}`}>
                {req.priority}
              </span>
              <div>
                <p className="font-medium">{req.feature}</p>
                <p className="text-sm text-white/60">{req.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-purple-400 mb-3">MVP（最小構成）</h3>
        <ul className="space-y-1">
          {spec.MVP?.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-purple-400 mb-3">技術構成案</h3>
        <div className="flex flex-wrap gap-2">
          {spec.技術構成案?.map((tech, i) => (
            <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
              {tech}
            </span>
          ))}
        </div>
      </section>

      {spec.非機能要件?.length > 0 && (
        <section className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-purple-400 mb-3">非機能要件</h3>
          <ul className="space-y-1">
            {spec.非機能要件.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MockGenerator({ spec }) {
  const [selectedView, setSelectedView] = useState('web');
  
  const screens = spec.画面構成 || [
    { name: 'ダッシュボード', purpose: 'メイン画面', elements: ['ヘッダー', 'メインコンテンツ', 'サイドバー'] }
  ];

  const generateComponentsFromFeatures = () => {
    const components = [];
    
    spec.機能要件?.forEach((feature, i) => {
      if (feature.feature.includes('ダッシュボード') || feature.feature.includes('表示')) {
        components.push({ type: 'dashboard', name: feature.feature });
      } else if (feature.feature.includes('ログイン') || feature.feature.includes('認証')) {
        components.push({ type: 'auth', name: feature.feature });
      } else if (feature.feature.includes('検索') || feature.feature.includes('フィルター')) {
        components.push({ type: 'search', name: feature.feature });
      } else if (feature.feature.includes('チャート') || feature.feature.includes('グラフ')) {
        components.push({ type: 'chart', name: feature.feature });
      } else {
        components.push({ type: 'feature', name: feature.feature });
      }
    });
    
    return components;
  };

  const renderMockComponent = (component, key) => {
    const baseClass = "bg-white/10 rounded-lg p-3 border border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all cursor-pointer";
    
    switch (component.type) {
      case 'dashboard':
        return (
          <div key={key} className={`${baseClass} h-32`}>
            <div className="text-xs text-white/60 mb-2">Dashboard</div>
            <div className="grid grid-cols-2 gap-2 h-20">
              <div className="bg-white/20 rounded flex items-center justify-center">
                <span className="text-xs">📊</span>
              </div>
              <div className="bg-white/20 rounded flex items-center justify-center">
                <span className="text-xs">📈</span>
              </div>
            </div>
            <div className="absolute inset-x-2 bottom-2 text-xs text-white/80 truncate">
              {component.name}
            </div>
          </div>
        );
      case 'auth':
        return (
          <div key={key} className={`${baseClass} h-32 flex flex-col justify-center items-center`}>
            <div className="w-12 h-12 bg-white/20 rounded-full mb-2 flex items-center justify-center">
              <span className="text-lg">🔐</span>
            </div>
            <div className="w-20 h-2 bg-white/30 rounded mb-1"></div>
            <div className="w-16 h-2 bg-white/30 rounded"></div>
            <div className="text-xs text-white/80 mt-2 text-center truncate">
              {component.name}
            </div>
          </div>
        );
      case 'search':
        return (
          <div key={key} className={`${baseClass} h-20`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-6 bg-white/20 rounded"></div>
              <div className="w-6 h-6 bg-white/30 rounded flex items-center justify-center">
                <span className="text-xs">🔍</span>
              </div>
            </div>
            <div className="text-xs text-white/80 truncate">{component.name}</div>
          </div>
        );
      case 'chart':
        return (
          <div key={key} className={`${baseClass} h-28`}>
            <div className="text-xs text-white/60 mb-2">Chart</div>
            <div className="h-16 bg-white/20 rounded flex items-end justify-around p-2">
              {[40, 60, 35, 80, 50].map((height, i) => (
                <div key={i} className="w-2 bg-purple-400 rounded-t" style={{height: `${height}%`}}></div>
              ))}
            </div>
            <div className="text-xs text-white/80 truncate mt-1">{component.name}</div>
          </div>
        );
      default:
        return (
          <div key={key} className={`${baseClass} h-24 flex flex-col justify-center`}>
            <div className="w-full h-3 bg-white/20 rounded mb-2"></div>
            <div className="w-3/4 h-2 bg-white/15 rounded mb-1"></div>
            <div className="w-1/2 h-2 bg-white/15 rounded"></div>
            <div className="text-xs text-white/80 truncate mt-2">{component.name}</div>
          </div>
        );
    }
  };

  const components = generateComponentsFromFeatures();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">インタラクティブモック</h2>
        <div className="flex gap-2">
          {['web', 'mobile'].map(view => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                selectedView === view
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'
              }`}
            >
              {view === 'web' ? '💻 Web' : '📱 Mobile'}
            </button>
          ))}
        </div>
      </div>

      {/* Feature-based Components */}
      {components.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>🧩</span>
            機能コンポーネント
          </h3>
          <div className={`grid gap-3 ${selectedView === 'web' ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'}`}>
            {components.map((comp, i) => renderMockComponent(comp, i))}
          </div>
        </div>
      )}

      {/* Screen Wireframes */}
      <div className="grid gap-6">
        {screens.map((screen, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="font-semibold mb-2">{screen.name}</h3>
            <p className="text-sm text-white/60 mb-4">{screen.purpose}</p>
            
            {/* Responsive Wireframe */}
            <div className={`bg-slate-800 rounded-lg p-4 border-2 border-dashed border-white/20 ${
              selectedView === 'mobile' ? 'max-w-xs mx-auto' : ''
            }`}>
              {/* Header */}
              <div className="h-12 bg-white/10 rounded-lg mb-4 flex items-center px-4">
                <div className={`h-4 bg-white/20 rounded ${selectedView === 'mobile' ? 'w-16' : 'w-24'}`} />
                <div className="ml-auto flex gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full" />
                </div>
              </div>
              
              {/* Content */}
              <div className={selectedView === 'mobile' ? 'space-y-4' : 'flex gap-4'}>
                {/* Sidebar/Navigation */}
                {selectedView === 'web' && (
                  <div className="w-48 space-y-2">
                    {[1,2,3,4].map(n => (
                      <div key={n} className="h-10 bg-white/10 rounded-lg" />
                    ))}
                  </div>
                )}
                
                {/* Main Content */}
                <div className="flex-1 space-y-4">
                  <div className={`grid gap-4 ${selectedView === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {[1,2,3].slice(0, selectedView === 'mobile' ? 2 : 3).map(n => (
                      <div key={n} className="h-24 bg-white/10 rounded-lg" />
                    ))}
                  </div>
                  <div className={`bg-white/10 rounded-lg ${selectedView === 'mobile' ? 'h-32' : 'h-48'}`} />
                </div>
              </div>
            </div>

            {/* Elements */}
            <div className="mt-4 flex flex-wrap gap-2">
              {screen.elements?.map((el, j) => (
                <span key={j} className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
                  {el}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
        <p className="text-sm text-white/80">
          💡 このモックは仕様書の機能要件から自動生成されています。
          Web/Mobile表示の切り替えやコンポーネントのホバー効果をお試しください。
        </p>
      </div>
    </div>
  );
}
