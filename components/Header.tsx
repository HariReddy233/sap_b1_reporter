'use client'

import { Settings, Sparkles } from 'lucide-react'
import Image from 'next/image'

interface HeaderProps {
  onSettingsClick: () => void
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Left: Consultare Logo with AI Badge Below */}
        <div className="flex flex-col">
          <div className="relative h-10 w-auto mb-1 flex items-center">
            <Image
              src="/consultare-logo.svg"
              alt="Consultare"
              width={180}
              height={40}
              className="h-10 w-auto object-contain"
              priority
              unoptimized
            />
          </div>
          {/* AI Powered Analytics Badge - Below Logo with Animation (No Background) */}
          <div className="flex items-center space-x-1.5 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" style={{ animationDuration: '2s' }} />
            <span className="text-[10px] font-semibold whitespace-nowrap leading-tight text-gray-600">AI Powered Analytics</span>
          </div>
        </div>

        {/* Right: Settings Button */}
        <div className="flex items-center">
          <button
            onClick={onSettingsClick}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm whitespace-nowrap">Settings</span>
          </button>
        </div>
      </div>
    </header>
  )
}

