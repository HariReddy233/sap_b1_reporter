'use client'

import { useState, useEffect } from 'react'
import MainInterface from '@/components/MainInterface'
import SettingsPanel from '@/components/SettingsPanel'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import SavedReports from '@/components/SavedReports'
import TemplatedAnalysis from '@/components/TemplatedAnalysis'
import { loadSettings, saveSettings, clearSettings } from '@/lib/storage'
import { cleanupSessionStorage } from '@/lib/indexeddb'

const defaultSettings = {
  sapServer: 'https://b1.ativy.mx:50077/b1s/v1/Login',
  companyDB: 'SBODEMOUS',
  userName: 'Support',
  password: 'Chung@890',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: 'gpt-3.5-turbo',
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(defaultSettings)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState<'chat' | 'reports' | 'settings' | 'templatedAnalysis'>('chat')

  // Clean up sessionStorage on app load to prevent quota issues
  useEffect(() => {
    cleanupSessionStorage()
  }, [])

  // Check if page was reloaded and handle settings accordingly
  useEffect(() => {
    // Detect if page was reloaded using Performance Navigation API
    const isReload = (): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        // Modern browsers - Performance Navigation Timing API
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        if (navEntries.length > 0) {
          const navType = navEntries[0].type
          return navType === 'reload'
        }
        
        // Fallback for older browsers
        if ((performance as any).navigation) {
          const navType = (performance as any).navigation.type
          // 0 = TYPE_NAVIGATE, 1 = TYPE_RELOAD, 2 = TYPE_BACK_FORWARD
          return navType === 1
        }
      } catch (error) {
        console.error('Error detecting page reload:', error)
      }
      
      return false
    }

    const wasReloaded = isReload()
    
    if (wasReloaded) {
      // Page was reloaded - clear all settings
      clearSettings()
      setSettings(defaultSettings)
      setLoginSuccess(false)
    } else {
      // Normal navigation or first load - load from session storage (30 min persistence)
      const stored = loadSettings()
      if (stored) {
        setSettings(stored.settings)
        setLoginSuccess(stored.loginSuccess)
      } else {
        setSettings(defaultSettings)
        setLoginSuccess(false)
      }
    }
  }, [])

  const handleSaveSettings = (newSettings: typeof defaultSettings) => {
    setSettings(newSettings)
    setShowSettings(false)
    setActiveSection('chat')
    // Save to session storage with current login status
    saveSettings(newSettings, loginSuccess)
  }

  const handleLoginSuccess = (success: boolean) => {
    setLoginSuccess(success)
    // Update session storage with new login status and current form data
    // The SettingsPanel will have already saved the form data, we just update login status
    const stored = loadSettings()
    if (stored) {
      // Update both settings and login status from storage
      setSettings(stored.settings)
      saveSettings(stored.settings, success)
    } else {
      saveSettings(settings, success)
    }
  }

  // Sync state from session storage when settings panel closes
  useEffect(() => {
    if (!showSettings) {
      // When settings panel is closed, ensure we have latest data from storage
      const stored = loadSettings()
      if (stored) {
        setSettings(stored.settings)
        setLoginSuccess(stored.loginSuccess)
      }
    }
  }, [showSettings])

  const isConfigured = !!(settings.sapServer && settings.companyDB && settings.userName && settings.password)

  const handleSectionChange = (section: 'chat' | 'reports' | 'settings' | 'templatedAnalysis') => {
    setActiveSection(section)
    if (section === 'settings') {
      setShowSettings(true)
    } else {
      setShowSettings(false)
    }
  }

  const handleSettingsClick = () => {
    setActiveSection('settings')
    setShowSettings(true)
  }

  return (
    <div className="min-h-screen bg-sky-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onSettingsClick={handleSettingsClick}
        environment="Production (SAP B1)"
        isConnected={loginSuccess}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        <main className={`relative z-10 flex-1 flex flex-col overflow-hidden ${showSettings ? '' : 'px-8 py-8'}`}>
          {showSettings ? (
            <SettingsPanel
              settings={settings}
              onSave={handleSaveSettings}
              onCancel={() => {
                // When closing settings, reload from session storage to ensure sync
                const stored = loadSettings()
                if (stored) {
                  setSettings(stored.settings)
                  setLoginSuccess(stored.loginSuccess)
                }
                setShowSettings(false)
                setActiveSection('chat')
              }}
              onLoginSuccess={handleLoginSuccess}
            />
          ) : activeSection === 'reports' ? (
            <SavedReports />
          ) : activeSection === 'templatedAnalysis' ? (
            <TemplatedAnalysis 
              settings={settings} 
              isConfigured={isConfigured}
              loginSuccess={loginSuccess}
            />
          ) : (
            <MainInterface 
              settings={settings} 
              isConfigured={isConfigured}
              loginSuccess={loginSuccess}
            />
          )}
        </main>
      </div>
    </div>
  )
}
