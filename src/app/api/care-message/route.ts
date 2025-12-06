import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

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