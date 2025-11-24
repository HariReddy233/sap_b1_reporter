'use client'

import { useState, useEffect } from 'react'
import { X, Save, Plug, CheckCircle, XCircle, Loader2, Eye, EyeOff, Server, Database, User, Lock, Key, Cpu, ArrowRight } from 'lucide-react'
import { saveSettings, loadSettings } from '@/lib/storage'

interface Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
  openaiApiKey: string
  openaiModel: string
}

interface SettingsPanelProps {
  settings: Settings
  onSave: (settings: Settings) => void
  onCancel: () => void
  onLoginSuccess?: (success: boolean) => void
}

export default function SettingsPanel({ settings, onSave, onCancel, onLoginSuccess }: SettingsPanelProps) {
  // Load from session storage first, then fall back to props
  const getInitialData = (): Settings => {
    const stored = loadSettings()
    if (stored && stored.settings) {
      return stored.settings
    }
    return settings
  }

  const [formData, setFormData] = useState<Settings>(getInitialData())
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState<'sap' | 'openai'>('sap')

  // Update form data when settings prop changes (but only if no stored data exists)
  useEffect(() => {
    const stored = loadSettings()
    if (!stored || !stored.settings) {
      setFormData(settings)
    } else {
      // Always prefer stored data when available
      setFormData(stored.settings)
    }
  }, [settings])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    // Save to session storage
    const stored = loadSettings()
    saveSettings(formData, stored?.loginSuccess || false)
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sapServer: formData.sapServer,
          companyDB: formData.companyDB,
          userName: formData.userName,
          password: formData.password,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        // If response is not JSON, get text
        const text = await response.text()
        setTestResult({
          success: false,
          message: `Connection test failed: ${response.status} ${response.statusText}. ${text || 'Unknown error'}`,
        })
        return
      }
      
      // Handle both success and error responses
      const success = data.success || false
      setTestResult({
        success,
        message: data.message || `Connection test ${success ? 'succeeded' : 'failed'}`,
      })
      
      // Always save form data to session storage when test completes
      // This ensures data persists even if user clicks Cancel
      if (success) {
        saveSettings(formData, true)
        // Update parent component state immediately
        if (onLoginSuccess) {
          onLoginSuccess(true)
        }
      } else {
        // Keep existing login status if test fails
        const stored = loadSettings()
        saveSettings(formData, stored?.loginSuccess || false)
        if (onLoginSuccess) {
          onLoginSuccess(false)
        }
      }
    } catch (error: any) {
      console.error('Test connection error:', error)
      setTestResult({
        success: false,
        message: error.message || 'Failed to test connection. Please check your network connection and try again.',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="bg-white shadow-2xl border border-gray-200 backdrop-blur-sm overflow-hidden flex flex-col h-full">
        {/* Header - Modern Design */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 md:px-8 py-4 flex-shrink-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">
                Settings
              </h2>
              <p className="text-blue-100 text-sm font-medium">Configure your connections</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90 transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Modern Design */}
        <div className="flex border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white flex-shrink-0 shadow-sm">
          <button
            onClick={() => setActiveTab('sap')}
            className={`flex-1 px-6 py-3 text-center font-semibold transition-all duration-300 relative ${
              activeTab === 'sap'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Server className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'sap' ? 'scale-110' : ''}`} />
              <span className="text-sm">SAP Business One</span>
            </div>
            {activeTab === 'sap' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('openai')}
            className={`flex-1 px-6 py-3 text-center font-semibold transition-all duration-300 relative ${
              activeTab === 'openai'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Cpu className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'openai' ? 'scale-110' : ''}`} />
              <span className="text-sm">OpenAI Configuration</span>
            </div>
            {activeTab === 'openai' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600"></div>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto bg-gradient-to-b from-white to-gray-50">
          {/* SAP B1 Settings Page */}
          {activeTab === 'sap' && (
            <div className="space-y-6 flex-1">
              {/* Page Header - Modern */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <Server className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">SAP Business One</h3>
                    <p className="text-sm text-gray-600 font-medium">Service Layer Connection</p>
                  </div>
                </div>
              </div>
              {/* Form Fields - Modern Card */}
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-lg shadow-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2.5">
                      <Server className="w-4 h-4 mr-2 text-blue-600" />
                      Server URL
                    </label>
                    <input
                      type="text"
                      value={formData.sapServer}
                      onChange={(e) => setFormData({ ...formData, sapServer: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:border-gray-300"
                      placeholder="https://localhost:50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2.5">
                      <Database className="w-4 h-4 mr-2 text-blue-600" />
                      Company Database
                    </label>
                    <input
                      type="text"
                      value={formData.companyDB}
                      onChange={(e) => setFormData({ ...formData, companyDB: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:border-gray-300"
                      placeholder="Database Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2.5">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:border-gray-300"
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2.5">
                      <Lock className="w-4 h-4 mr-2 text-blue-600" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3.5 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:border-gray-300"
                        placeholder="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-all duration-200 p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Test Connection Button and Result - Modern */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center space-x-3 px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold transform hover:scale-105 disabled:transform-none"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Plug className="w-5 h-5" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                  
                  {testResult && (
                    <div className={`mt-4 p-4 rounded-xl flex items-start space-x-3 shadow-md ${
                      testResult.success
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
                        : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200'
                    }`}>
                      {testResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${
                          testResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {testResult.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* OpenAI Configuration Page */}
          {activeTab === 'openai' && (
            <div className="space-y-6 flex-1">
              {/* Page Header - Modern */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <Cpu className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">OpenAI Configuration</h3>
                    <p className="text-sm text-gray-600 font-medium">AI Model Settings</p>
                  </div>
                </div>
              </div>
              {/* Form Fields - Modern Card */}
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-lg shadow-gray-100">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2.5">
                      <Key className="w-4 h-4 mr-2 text-purple-600" />
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={formData.openaiApiKey}
                        onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                        className="w-full px-4 py-3.5 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-sm hover:border-gray-300"
                        placeholder="sk-proj-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-all duration-200 p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">Get your API key from OpenAI platform</p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2.5">
                      <Cpu className="w-4 h-4 mr-2 text-purple-600" />
                      Model
                    </label>
                    <select
                      value={formData.openaiModel}
                      onChange={(e) => setFormData({ ...formData, openaiModel: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 text-gray-800 cursor-pointer shadow-sm hover:border-gray-300"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">Select the AI model for query processing</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Modern */}
          <div className="flex justify-between items-center pt-6 mt-6 border-t-2 border-gray-200 flex-shrink-0 bg-white rounded-b-2xl">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <div className="flex items-center space-x-3">
              {activeTab === 'sap' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('openai')}
                  className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-all duration-300 font-semibold hover:bg-gray-50 rounded-xl"
                >
                  <span>Next: OpenAI Configuration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 font-semibold transform hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

