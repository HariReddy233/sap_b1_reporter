import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Consultare | AI Powered Analytics',
  description: 'AI-powered analytics platform for SAP Business One - Ask questions in natural language and get instant insights',
  icons: {
    icon: '/consultare-logo.svg',
    shortcut: '/consultare-logo.svg',
    apple: '/consultare-logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

