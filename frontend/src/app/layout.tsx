import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'SwanyBot Pro | Ultimate Streaming Automation',
  description: 'The ultimate streaming automation platform for content creators',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cyber-darker antialiased">
        <div className="cyber-grid-bg fixed inset-0 pointer-events-none" />
        {children}
      </body>
    </html>
  )
}
