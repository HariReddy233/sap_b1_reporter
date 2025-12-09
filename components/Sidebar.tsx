'use client'

import { MessageCircle, FileText, Settings, CheckCircle, BarChart } from 'lucide-react'

interface SidebarProps {
  activeSection: 'chat' | 'reports' | 'settings' | 'templatedAnalysis'
  onSectionChange: (section: 'chat' | 'reports' | 'settings' | 'templatedAnalysis') => void
  onSettingsClick: () => void
  environment?: string
  isConnected?: boolean
}

export default function Sidebar({ 
  activeSection, 
  onSectionChange, 
  onSettingsClick,
  environment = 'Production (SAP B1)',
  isConnected = true 
}: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-sky-200 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo and Title */}
      <div className="p-4 border-b border-sky-200">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base">M</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">MIRA</h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1.5">
        <button
          onClick={() => onSectionChange('chat')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
            activeSection === 'chat'
              ? 'bg-sky-100 text-blue-700 border border-sky-300'
              : 'text-gray-700 hover:bg-sky-50'
          }`}
        >
          <MessageCircle className={`w-4 h-4 ${activeSection === 'chat' ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className="font-medium text-sm">Chat & Explore</span>
        </button>

        <button
          onClick={() => onSectionChange('reports')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
            activeSection === 'reports'
              ? 'bg-sky-100 text-blue-700 border border-sky-300'
              : 'text-gray-700 hover:bg-sky-50'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeSection === 'reports' ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className="font-medium text-sm">Saved Reports</span>
        </button>

        <button
          onClick={() => onSectionChange('templatedAnalysis')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
            activeSection === 'templatedAnalysis'
              ? 'bg-sky-100 text-blue-700 border border-sky-300'
              : 'text-gray-700 hover:bg-sky-50'
          }`}
        >
          <BarChart className={`w-4 h-4 ${activeSection === 'templatedAnalysis' ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className="font-medium text-sm">TemplatedAnalysis</span>
        </button>

        <button
          onClick={() => {
            onSectionChange('settings')
            onSettingsClick()
          }}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
            activeSection === 'settings'
              ? 'bg-sky-100 text-blue-700 border border-sky-300'
              : 'text-gray-700 hover:bg-sky-50'
          }`}
        >
          <Settings className={`w-4 h-4 ${activeSection === 'settings' ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className="font-medium text-sm">Settings</span>
        </button>
      </nav>

      {/* Environment Section */}
      <div className="p-3 border-t border-sky-200">
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ENVIRONMENT</p>
          <div className="flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <select 
          className="w-full px-2.5 py-1.5 text-xs border border-sky-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          defaultValue={environment}
        >
          <option>{environment}</option>
        </select>
      </div>
    </div>
  )
}


