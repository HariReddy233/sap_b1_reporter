'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import QueryInput from './QueryInput'
import { AlertCircle, CheckCircle, BarChart3, PieChart, TrendingUp, X } from 'lucide-react'
import { saveQueryResult, safeSetSessionStorage, cleanupSessionStorage } from '@/lib/indexeddb'

interface Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
  openaiApiKey: string
  openaiModel: string
}

interface MainInterfaceProps {
  settings: Settings
  isConfigured: boolean
  loginSuccess: boolean
}

export default function MainInterface({ settings, isConfigured, loginSuccess }: MainInterfaceProps) {
  const router = useRouter()
  const [queryResult, setQueryResult] = useState<any>(null)
  const [originalQuery, setOriginalQuery] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [navigating, setNavigating] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleQuerySubmit = async (query: string, variables: Record<string, any>) => {
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setLoadingProgress('Connecting to SAP B1 and generating query...')
    setOriginalQuery(query)
    
    try {
      const response = await fetch('/api/execute-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
          settings,
        }),
        signal, // Pass abort signal
      })

      if (signal.aborted) {
        return // Request was cancelled
      }

      // Update progress based on response
      if (!response.ok) {
        setLoadingProgress('Error occurred')
      } else {
        setLoadingProgress('Fetching data from SAP B1...')
      }
      
      const data = await response.json()
      
      if (signal.aborted) {
        return // Request was cancelled
      }
      
      if (response.ok && data.data) {
        const recordCount = data.data.length || 0
        setLoadingProgress(`Retrieved ${recordCount.toLocaleString()} records`)
      }

      if (response.ok) {
        setQueryResult(data)
        setLoadingProgress('')
      } else {
        alert(`Error: ${data.error || 'Unknown error occurred'}`)
        setQueryResult(null)
        setLoadingProgress('')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Query execution cancelled by user')
        setLoadingProgress('Cancelled')
        return
      }
      console.error('Error executing query:', error)
      alert(`Failed to execute query: ${error.message || 'Please check your settings and try again.'}`)
      setQueryResult(null)
      setLoadingProgress('')
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelQuery = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setLoadingProgress('Cancelled')
      setQueryResult(null)
    }
  }

  const handleChartTypeSelect = async (chartType: 'pie' | 'bar' | 'line') => {
    // Prevent double-clicks
    if (navigating) {
      console.log('Navigation already in progress, ignoring click')
      return
    }

    // Store data in IndexedDB (supports large datasets) and navigate to results page
    if (!queryResult) {
      console.error('No query result available')
      alert('No query result available. Please run a query first.')
      return
    }

    setNavigating(true)
    
    try {
      const recordCount = queryResult.data?.length || 0
      console.log(`[Chart Select] Storing query result: ${recordCount} records, chart type: ${chartType}`)
      
      // Store data in sessionStorage first for immediate access (faster than IndexedDB)
      // This allows navigation to happen immediately while IndexedDB saves in background
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const dataToStore = {
        queryResult,
        originalQuery,
        selectedChartType: chartType,
        timestamp: Date.now()
      }
      
      // Try to store in sessionStorage (optional - for fast access)
      // If it fails due to quota, we'll just use IndexedDB
      const sessionStorageSuccess = safeSetSessionStorage('queryResultId', tempId)
      if (sessionStorageSuccess) {
        // Only try to store the full data if we have space
        // For large datasets, skip sessionStorage and rely on IndexedDB
        const dataSize = JSON.stringify(dataToStore).length
        if (dataSize < 2 * 1024 * 1024) { // Only cache if less than 2MB
          const dataStored = safeSetSessionStorage(`queryResult_${tempId}`, JSON.stringify(dataToStore))
          if (dataStored) {
            console.log('[Chart Select] Data stored in sessionStorage successfully, ID:', tempId)
          } else {
            console.log('[Chart Select] Data too large for sessionStorage, will use IndexedDB only')
          }
        } else {
          console.log('[Chart Select] Data too large for sessionStorage (' + (dataSize / 1024 / 1024).toFixed(2) + 'MB), will use IndexedDB only')
        }
      } else {
        console.log('[Chart Select] SessionStorage unavailable, will use IndexedDB only')
      }
      
      // Navigate immediately (don't wait for IndexedDB)
      console.log('[Chart Select] Navigating to results page...')
      try {
        router.push('/results')
        // Fallback: if router.push doesn't work, use window.location
        setTimeout(() => {
          if (window.location.pathname !== '/results') {
            console.log('[Chart Select] Router.push may have failed, using window.location fallback')
            window.location.href = '/results'
          }
        }, 100)
      } catch (navError) {
        console.error('[Chart Select] Navigation error, using window.location fallback:', navError)
        window.location.href = '/results'
      }
      
      // Store in IndexedDB in background (for persistence across sessions)
      saveQueryResult(queryResult, originalQuery, chartType)
        .then((resultId) => {
          // Update sessionStorage with the real ID once IndexedDB save completes (if possible)
          safeSetSessionStorage('queryResultId', resultId)
          
          // Only cache full data if it's small enough
          const dataSize = JSON.stringify(dataToStore).length
          if (dataSize < 2 * 1024 * 1024) {
            safeSetSessionStorage(`queryResult_${resultId}`, JSON.stringify(dataToStore))
          }
          
          // Clean up temp entry if it exists
          if (tempId.startsWith('temp_')) {
            try {
              sessionStorage.removeItem(`queryResult_${tempId}`)
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          console.log('[Chart Select] Successfully stored query result in IndexedDB:', resultId)
        })
        .catch((error) => {
          console.error('[Chart Select] Background IndexedDB save failed (non-critical):', error)
          // Don't show error to user - sessionStorage is sufficient for current session
        })
    } catch (error: any) {
      console.error('[Chart Select] Error in handleChartTypeSelect:', error)
      console.error('[Chart Select] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      setNavigating(false)
      
      // Provide more specific error message
      let errorMessage = 'Failed to navigate to results page. '
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        errorMessage += 'Browser storage quota exceeded. Please try closing other tabs or clearing browser data.'
      } else if (error.name === 'SecurityError' || error.code === 18) {
        errorMessage += 'Storage access denied. Please check your browser settings or try in a different browser.'
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}. Please try again.`
      }
      
      alert(errorMessage)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-4">
      {/* Configuration Status Alert - Compact and Clean */}
      {!isConfigured ? (
        // Not configured - show warning
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-gray-700 font-medium">
              Configuration Required: Please configure your SAP B1 connection in Settings before running queries.
            </p>
          </div>
        </div>
      ) : !loginSuccess ? (
        // Configured but not tested - show warning
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-gray-700 font-medium">
              Configuration Required: Please test your SAP B1 connection in Settings to verify credentials.
            </p>
          </div>
        </div>
      ) : null}

      {/* Loading Indicator - Compact Design */}
      {loading && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-xl shadow-lg p-3.5 border border-blue-200 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Processing Your Query</p>
                <p className="text-xs text-gray-600">{loadingProgress || 'Please wait...'}</p>
              </div>
            </div>
            <button
              onClick={handleCancelQuery}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 text-xs font-semibold shadow-md hover:shadow-lg"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Show Query Input or Chart Type Selector */}
      {queryResult && !loading ? (
        // Show Chart Type Selector on same page - only show recommended chart types (hide while loading)
        <div className="space-y-6">
          <QueryInput onSubmit={handleQuerySubmit} loading={loading} isConfigured={isConfigured} currentQuery={originalQuery} />
          
          {/* Chart Type Selector - Compact Design - Only show after data is loaded */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">Select Visualization Type</h3>
              {queryResult.recommendedChartTypes && queryResult.recommendedChartTypes.length < 3 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-lg font-semibold border border-blue-200">
                  ✨ Recommended
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {(queryResult.recommendedChartTypes || ['bar', 'pie', 'line']).includes('bar') && (
                <button
                  onClick={() => handleChartTypeSelect('bar')}
                  disabled={navigating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-sm ${
                    navigating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{navigating ? 'Loading...' : 'Bar'}</span>
                </button>
              )}
              {(queryResult.recommendedChartTypes || ['bar', 'pie', 'line']).includes('pie') && (
                <button
                  onClick={() => handleChartTypeSelect('pie')}
                  disabled={navigating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-sm ${
                    navigating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer'
                  }`}
                >
                  <PieChart className="w-4 h-4" />
                  <span>{navigating ? 'Loading...' : 'Pie'}</span>
                </button>
              )}
              {(queryResult.recommendedChartTypes || ['bar', 'pie', 'line']).includes('line') && (
                <button
                  onClick={() => handleChartTypeSelect('line')}
                  disabled={navigating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-sm ${
                    navigating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{navigating ? 'Loading...' : 'Line'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <QueryInput onSubmit={handleQuerySubmit} loading={loading} isConfigured={isConfigured} currentQuery={originalQuery} />
      )}
    </div>
  )
}

