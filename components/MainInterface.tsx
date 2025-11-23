'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import QueryInput from './QueryInput'
import { AlertCircle, CheckCircle, BarChart3, PieChart, TrendingUp, X } from 'lucide-react'
import { saveQueryResult } from '@/lib/indexeddb'

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
    // Store data in IndexedDB (supports large datasets) and navigate to results page
    if (queryResult) {
      try {
        const recordCount = queryResult.data?.length || 0
        console.log(`Storing query result: ${recordCount} records`)
        
        // Store in IndexedDB (can handle large datasets - 20k+ records)
        const resultId = await saveQueryResult(queryResult, originalQuery, chartType)
        
        // Store the ID in sessionStorage for quick access
        sessionStorage.setItem('queryResultId', resultId)
        
        console.log('Successfully stored query result in IndexedDB')
        
        // Navigate to results page
        router.push('/results')
      } catch (error: any) {
        console.error('Error storing results:', error)
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          dataSize: queryResult.data?.length || 0
        })
        
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

      {/* Loading Indicator - Modern Design */}
      {loading && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-200 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
                <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-gray-800 mb-1">Processing Your Query</p>
                <p className="text-sm text-gray-600 font-medium">{loadingProgress || 'Please wait...'}</p>
              </div>
            </div>
            <button
              onClick={handleCancelQuery}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Show Query Input or Chart Type Selector */}
      {queryResult ? (
        // Show Chart Type Selector on same page - only show recommended chart types
        <div className="space-y-6">
          <QueryInput onSubmit={handleQuerySubmit} loading={loading} isConfigured={isConfigured} currentQuery={originalQuery} />
          
          {/* Chart Type Selector - Only show recommended chart types */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Select Visualization Type</h3>
              {queryResult.recommendedChartTypes && queryResult.recommendedChartTypes.length < 3 && (
                <span className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-xl font-semibold border border-blue-200">
                  ✨ AI Recommended
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {(queryResult.recommendedChartTypes || ['bar', 'pie', 'line']).includes('bar') && (
                <button
                  onClick={() => handleChartTypeSelect('bar')}
                  className="flex items-center space-x-3 px-8 py-4 rounded-xl transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-700 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl hover:scale-105 font-semibold"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span>Bar Chart</span>
                </button>
              )}
              {(queryResult.recommendedChartTypes || ['bar', 'pie', 'line']).includes('pie') && (
                <button
                  onClick={() => handleChartTypeSelect('pie')}
                  className="flex items-center space-x-3 px-8 py-4 rounded-xl transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-700 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl hover:scale-105 font-semibold"
                >
                  <PieChart className="w-6 h-6" />
                  <span>Pie Chart</span>
                </button>
              )}
              {(queryResult.recommendedChartTypes || ['bar', 'pie', 'line']).includes('line') && (
                <button
                  onClick={() => handleChartTypeSelect('line')}
                  className="flex items-center space-x-3 px-8 py-4 rounded-xl transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-700 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl hover:scale-105 font-semibold"
                >
                  <TrendingUp className="w-6 h-6" />
                  <span>Line Chart</span>
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

