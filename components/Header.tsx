'use client'

import { Sparkles } from 'lucide-react'
import Image from 'next/image'

interface HeaderProps {
  onSettingsClick?: () => void
}

// SAP Business One Logo Component - Using actual image
const SAPBusinessOneLogo = () => (
  <div className="flex items-center">
    <Image
      src="/sap-logo.jpg"
      alt="SAP Business One"
      width={140}
      height={28}
      className="h-7 w-auto object-contain"
      priority
      unoptimized
    />
  </div>
)

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-sky-200 shadow-sm sticky top-0 z-30">
      <div className="w-full px-8 py-4 h-[60px] flex items-center">
        <div className="flex items-center justify-between gap-6 w-full">
          {/* Left: Consultare Logo */}
          <div className="flex items-center flex-shrink-0">
            <Image
              src="/consultare-logo.png"
              alt="Consultare"
              width={120}
              height={28}
              className="h-7 w-auto object-contain"
              priority
              unoptimized
            />
          </div>

          {/* Center: SAP Business One Logo */}
          <div className="flex items-center flex-1 justify-center">
            <SAPBusinessOneLogo />
          </div>

          {/* Right: AI Powered Analytics Button */}
          <div className="flex items-center flex-shrink-0">
            <button
              className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg font-semibold text-sm whitespace-nowrap"
              style={{ 
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span className="tracking-wide">AI Powered Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
