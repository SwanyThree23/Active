import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Content Studio',
  description: 'Create stunning AI-powered content with our all-in-one platform',
  keywords: ['AI', 'content creation', 'video', 'avatar', 'voice synthesis', 'newsletter'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} scrollbar-thin`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
