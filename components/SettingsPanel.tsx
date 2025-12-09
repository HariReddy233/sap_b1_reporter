'use client'

import { useState, useEffect } from 'react'
import { X, Save, Plug, CheckCircle, XCircle, Loader2, Eye, EyeOff, Server, Database, User, Lock, Shield, Users, Settings as SettingsIcon, Menu, Zap, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [environmentName, setEnvironmentName] = useState('Production')

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
    <div className="h-full w-full flex flex-col bg-sky-50">
      <div className="bg-white shadow-lg overflow-hidden flex flex-col h-full">
        {/* Header with Close Button */}
        <div className="bg-white px-6 py-3.5 flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-base font-semibold text-gray-900">
                1 Connect SAP B1
              </h2>
              <span className="text-gray-400 text-sm">2 Try Sample Question</span>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel - Information */}
          <div className="w-full lg:w-2/5 bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Connect your SAP Business One data
              </h1>
              <p className="text-gray-700 text-base mb-8 leading-relaxed">
                Configure your own REST API / Service Layer credentials so the AI Copilot can securely query your SAP B1 data to generate insights.
              </p>

              {/* Security Features */}
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 bg-blue-100 rounded-xl flex-shrink-0 shadow-sm">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1.5 text-base">Secure & User-Specific</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Your credentials stay encrypted. We never store raw passwords in plain text.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2.5 bg-purple-100 rounded-xl flex-shrink-0 shadow-sm">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1.5 text-base">Access Control Respect</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">The AI only sees the data your SAP user account is permitted to access.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2.5 bg-green-100 rounded-xl flex-shrink-0 shadow-sm">
                    <SettingsIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1.5 text-base">Full Control</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">You can update credentials or revoke access anytime in your Settings.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trusted Connection */}
            <div className="flex items-center space-x-2.5 text-gray-600 mt-6 pt-6 border-t border-gray-200">
              <Lock className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">End-to-end encrypted connection via TLS 1.3</span>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="w-full lg:w-3/5 bg-white p-8 lg:p-10 overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Form Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-gray-900">SAP B1 Credentials</h2>
                    <Menu className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
                  REST API / Service Layer
                </span>
              </div>

              {/* Form Fields */}
              <div className="space-y-5 flex-1">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={environmentName}
                    onChange={(e) => setEnvironmentName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-800 text-sm"
                    placeholder="Production"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Service Layer Base URL
                  </label>
                  <input
                    type="text"
                    value={formData.sapServer}
                    onChange={(e) => setFormData({ ...formData, sapServer: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-800 text-sm"
                    placeholder="https://server:50000/b1s/v1"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Must be accessible from the internet or via VPN tunnel.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Company DB Schema
                  </label>
                  <input
                    type="text"
                    value={formData.companyDB}
                    onChange={(e) => setFormData({ ...formData, companyDB: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-800 text-sm"
                    placeholder="e.g. SBODemoUS"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>SAP B1 Username</span>
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-800 text-sm"
                    placeholder="manager"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>SAP B1 Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-800 text-sm"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="border-t border-gray-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <span>Advanced Settings (Optional)</span>
                    {showAdvanced ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  {showAdvanced && (
                    <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Advanced settings can be added here if needed */}
                      <p className="text-sm text-gray-500">Advanced configuration options will be available here.</p>
                    </div>
                  )}
                </div>

                {/* Test Connection Button and Result */}
                <div className="space-y-4">
                  {testResult && (
                    <div className={`p-4 rounded-lg flex items-start space-x-3 ${
                      testResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {testResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          testResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {testResult.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex-1 flex items-center justify-center space-x-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-md hover:shadow-lg"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 text-white" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-base"
                  >
                    <span>Save & Continue</span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-medium">End-to-end encrypted connection via TLS 1.3</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    You can manage multiple environments later in Settings.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

