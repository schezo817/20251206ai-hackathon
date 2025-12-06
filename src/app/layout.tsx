import './globals.css'

export const metadata = {
  title: 'FatigueCare - 表情認識メンタルケア',
  description: 'AIが表情から疲労を検出し、適切なケアを提案するアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}