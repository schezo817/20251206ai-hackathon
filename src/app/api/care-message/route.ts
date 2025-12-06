import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Gemini API呼び出し
    const apiKey = process.env.GEMINI_API_KEY;
    
    
    if (apiKey) {
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `あなたは優しいAIケアアシスタントです。以下の疲労度情報に基づいて、短くて実用的なケアメッセージと3つの具体的な提案を日本語で返してください。

${prompt}

以下の形式でJSONを返してください：
{
  "message": "優しく親しみやすいケアメッセージ（1-2文）",
  "suggestions": ["具体的な提案1", "具体的な提案2", "具体的な提案3"]
}

注意：
- メッセージは親しみやすく、具体的で実行しやすい内容にする
- 提案は即座に実行できる簡単なものにする
- 健康的で科学的根拠のあるアドバイスを心がける`
              }]
            }]
          })
        });

        if (geminiResponse.ok) {
          const data = await geminiResponse.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (generatedText) {
            try {
              // JSONを抽出（マークダウンのコードブロックを削除）
              const jsonText = generatedText.replace(/```json\n?|```\n?/g, '').trim();
              const parsedResponse = JSON.parse(jsonText);
              
              if (parsedResponse.message && parsedResponse.suggestions) {
                return NextResponse.json(parsedResponse);
              }
            } catch (parseError) {
              console.error('JSON parsing error:', parseError);
            }
          }
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
      }
    }

    // フォールバックメッセージ
    const fallbackMessages = [
      {
        message: '少し疲れが見えますね。深呼吸をして、短い休憩を取ってみませんか？',
        suggestions: ['5分間の深呼吸', '軽いストレッチ', '水分補給']
      },
      {
        message: '頑張っていますね！目を休めるために20フィート先を20秒間見つめてみてください。',
        suggestions: ['20-20-20ルール', '目のマッサージ', 'まばたきを意識的に']
      },
      {
        message: 'お疲れ様です。肩や首をゆっくり回して、筋肉の緊張をほぐしましょう。',
        suggestions: ['肩回し運動', '首のストレッチ', '背筋を伸ばす']
      },
      {
        message: '集中が続いていますね。少し席を立って、軽く歩いてみてはいかがでしょうか？',
        suggestions: ['短い散歩', '椅子から立ち上がる', '軽い体操']
      }
    ];

    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    return NextResponse.json(randomMessage);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        message: '今日もお疲れ様です。適度な休憩を心がけましょう。',
        suggestions: ['深呼吸', '軽いストレッチ', '水分補給']
      },
      { status: 500 }
    );
  }
}