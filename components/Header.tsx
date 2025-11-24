'use client'

import { Settings, Sparkles } from 'lucide-react'
import Image from 'next/image'

interface HeaderProps {
  onSettingsClick: () => void
}

// SAP Business One Logo Component - Using actual image
const SAPBusinessOneLogo = () => (
  <div className="flex items-center">
    <Image
      src="/sap-logo.jpg"
      alt="SAP Business One"
      width={180}
      height={35}
      className="h-9 w-auto object-contain"
      priority
      unoptimized
    />
  </div>
)

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-6 py-3.5">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Consultare Logo */}
          <div className="flex items-center flex-shrink-0">
            <Image
              src="/consultare-logo.png"
              alt="Consultare"
              width={160}
              height={35}
              className="h-9 w-auto object-contain"
              priority
              unoptimized
            />
          </div>

          {/* Center: SAP Business One Logo with AI Powered Analytics */}
          <div className="flex items-center flex-1 justify-center gap-4">
            <SAPBusinessOneLogo />
            
            {/* AI Powered Analytics Button - Modern Design */}
            <button
              className="flex items-center space-x-2.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm whitespace-nowrap transform hover:scale-105"
              style={{ 
                fontFamily: 'Arial, Helvetica, sans-serif',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span className="tracking-wide">AI Powered Analytics</span>
            </button>
          </div>

          {/* Right: Settings Button */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={onSettingsClick}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm whitespace-nowrap transform hover:scale-105"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
