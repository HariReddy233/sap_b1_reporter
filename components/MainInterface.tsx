'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import QueryInput from './QueryInput'
import AIAssistantSummary from './AIAssistantSummary'
import DataTable from './DataTable'
import RecommendedVisualizations from './RecommendedVisualizations'
import ChartDisplay from './ChartDisplay'
import { AlertCircle, CheckCircle, BarChart3, PieChart, TrendingUp, X, Save, ArrowLeft, Trophy, Package, DollarSign, Users } from 'lucide-react'
import { saveQueryResult, safeSetSessionStorage, cleanupSessionStorage, saveReport } from '@/lib/indexeddb'

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
  const pathname = usePathname()
  const [queryResult, setQueryResult] = useState<any>(null)
  const [originalQuery, setOriginalQuery] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [navigating, setNavigating] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [generatingChart, setGeneratingChart] = useState(false)
  const [generatedChart, setGeneratedChart] = useState<any>(null)
  const [chartPage, setChartPage] = useState(1)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track previous pathname to detect navigation
  const prevPathnameRef = useRef<string>(pathname)
  
  // Clear query result when navigating back to home page from another page
  useEffect(() => {
    // Only clear if we navigated TO '/' from another page (not if we're already on '/')
    if (pathname === '/' && prevPathnameRef.current !== '/' && prevPathnameRef.current !== '') {
      // Check if there's no query result ID in sessionStorage (meaning user navigated back)
      const resultId = sessionStorage.getItem('queryResultId')
      if (!resultId) {
        // User navigated back from another page, clear the state
        setQueryResult(null)
        setOriginalQuery('')
      }
    }
    
    // Update previous pathname
    prevPathnameRef.current = pathname
    
    // Reset navigating state when on home page
    if (pathname === '/') {
      setNavigating(false)
    }
  }, [pathname])

  const handleQuerySubmit = async (query: string, variables: Record<string, any>) => {
    // Prevent queries when disconnected
    if (!loginSuccess) {
      alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
      return
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setLoadingProgress('Connecting to SAP B1 and generating query...')
    setOriginalQuery(query)
    setGeneratedChart(null) // Clear any previously generated chart
    setChartPage(1) // Reset chart pagination
    
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

  const handleBack = () => {
    // Clear query result and reset state
    setQueryResult(null)
    setOriginalQuery('')
    setGeneratedChart(null)
    setChartPage(1)
    
    // Clear session storage
    try {
      sessionStorage.removeItem('queryResultId')
    } catch (e) {
      console.error('Error clearing session storage:', e)
    }
    
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const handleSaveReport = async () => {
    if (!queryResult) {
      alert('No query result to save. Please run a query first.')
      return
    }

    const reportTitle = prompt('Enter a name for this report:', originalQuery.substring(0, 50) || 'My Report')
    if (!reportTitle || !reportTitle.trim()) {
      return // User cancelled
    }

    setSavingReport(true)
    try {
      const chartType = (queryResult.bestChartType || 'bar') as 'pie' | 'bar' | 'line'
      const description = queryResult.description || `Report generated from query: ${originalQuery}`
      
      // Extract tags from query (simple keyword extraction)
      const tags: string[] = []
      const queryLower = originalQuery.toLowerCase()
      if (queryLower.includes('sales')) tags.push('Sales')
      if (queryLower.includes('customer')) tags.push('Customers')
      if (queryLower.includes('revenue')) tags.push('Revenue')
      if (queryLower.includes('inventory')) tags.push('Inventory')
      if (queryLower.includes('month') || queryLower.includes('quarter') || queryLower.includes('year')) tags.push('Time Series')
      
      await saveReport(
        reportTitle.trim(),
        queryResult,
        originalQuery,
        chartType,
        description,
        tags.length > 0 ? tags : undefined,
        queryResult.chartConfig
      )
      
      alert(`Report "${reportTitle}" saved successfully!`)
    } catch (error: any) {
      console.error('Error saving report:', error)
      alert(`Failed to save report: ${error.message || 'Unknown error'}`)
    } finally {
      setSavingReport(false)
    }
  }

  const handleChartTypeSelect = async (chartType: 'pie' | 'bar' | 'line') => {
    // Prevent double-clicks
    if (generatingChart || navigating) {
      console.log('Chart generation or navigation already in progress, ignoring click')
      return
    }

    if (!queryResult) {
      console.error('No query result available')
      alert('No query result available. Please run a query first.')
      return
    }

    setGeneratingChart(true)
    setGeneratedChart(null)

    try {
      // Call AI to generate chart configuration
      const response = await fetch('/api/generate-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: queryResult.data || [],
          chartType,
          originalQuery,
          settings,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate chart')
      }

      const chartConfig = await response.json()
      
      // Update queryResult with AI-generated chart configuration
      const updatedQueryResult = {
        ...queryResult,
        bestChartType: chartType,
        chartConfig: chartConfig.chartConfig,
      }

      setGeneratedChart(updatedQueryResult)
      setQueryResult(updatedQueryResult)
    } catch (error: any) {
      console.error('Error generating chart:', error)
      alert(`Failed to generate chart: ${error.message || 'Unknown error'}`)
    } finally {
      setGeneratingChart(false)
    }
  }

  const handleOldChartTypeSelect = async (chartType: 'pie' | 'bar' | 'line') => {
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
    <div className="flex flex-col h-full relative">
      {/* Configuration Status Alert - Compact and Clean */}
      {!isConfigured ? (
        // Not configured - show warning
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-2.5 border border-amber-200 shadow-sm mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-gray-700 font-medium">
              Configuration Required: Please configure your SAP B1 connection in Settings before running queries.
            </p>
          </div>
        </div>
      ) : !loginSuccess ? (
        // Configured but not tested - show warning
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-2.5 border border-amber-200 shadow-sm mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-gray-700 font-medium">
              Configuration Required: Please test your SAP B1 connection in Settings to verify credentials.
            </p>
          </div>
        </div>
      ) : null}

      {/* Loading Indicator - Compact Design */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-3 border border-sky-200 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 flex-1">
              <div className="relative">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-sky-200 border-t-blue-600"></div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800">Processing Your Query</p>
                <p className="text-xs text-gray-600">{loadingProgress || 'Please wait...'}</p>
              </div>
            </div>
            <button
              onClick={handleCancelQuery}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 text-xs font-semibold shadow-md hover:shadow-lg"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Show Query Input or Data Flow */}
      {queryResult && !loading ? (
        // Show Data Flow: Query -> AI Summary -> Data Table -> Recommended Visualizations
        <div className="space-y-6 flex-1 overflow-y-auto pb-24">
          {/* Header with Back Button and Save Report Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all duration-200 border border-gray-300 shadow-sm hover:shadow-md font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <div className="flex-1 mx-4">
              <AIAssistantSummary
                userQuery={originalQuery}
                dataCount={queryResult.data?.length || 0}
                objectName={queryResult.objectName}
                description={queryResult.description}
              />
            </div>
            
            <button
              onClick={handleSaveReport}
              disabled={savingReport}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{savingReport ? 'Saving...' : 'Save Report'}</span>
            </button>
          </div>

          {/* Data Table with Tabs */}
          <DataTable
            data={queryResult.data || []}
            originalQuery={originalQuery}
            objectName={queryResult.objectName}
          />

          {/* AI Generated Chart - Show when user selects a visualization */}
          {generatedChart && generatedChart.bestChartType && generatedChart.data && generatedChart.data.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Data Visualization</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Showing {chartPage * 10 - 9} to {Math.min(chartPage * 10, generatedChart.data.length)} of {generatedChart.data.length} record{generatedChart.data.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md font-semibold border border-blue-200">
                  ✨ AI Generated
                </span>
              </div>
              {generatingChart ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating chart with AI...</p>
                  </div>
                </div>
              ) : (
                <ChartDisplay
                  data={generatedChart.data}
                  chartType={generatedChart.bestChartType}
                  chartConfig={generatedChart.chartConfig}
                  currentPage={chartPage}
                  onPageChange={setChartPage}
                  rowsPerPage={10}
                />
              )}
            </div>
          )}

          {/* Recommended Visualizations */}
          <RecommendedVisualizations
            data={queryResult.data || []}
            onSelectVisualization={(type) => {
              if (type === 'table') {
                // Table view is already shown, scroll to it
                const tableElement = document.querySelector('[data-table-section]')
                tableElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                return
              } else if (type === 'kpi') {
                // For KPI, use bar chart as default
                handleChartTypeSelect('bar')
              } else if (type === 'bar' || type === 'pie' || type === 'line') {
                handleChartTypeSelect(type)
              }
            }}
            recommendedTypes={queryResult.recommendedChartTypes}
            bestChartType={queryResult.bestChartType}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Suggestions Section - Above input */}
          <div className="flex-1 flex items-center justify-center pb-4">
            <div className="w-full max-w-4xl mx-auto px-4">
              <div className="space-y-4">
                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (!loginSuccess) {
                        alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
                        return
                      }
                      if (isConfigured) {
                        handleQuerySubmit('Show me inventory status for all items', {})
                      }
                    }}
                    disabled={loading || !isConfigured || !loginSuccess}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="flex-shrink-0 w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-xs">Inventory Status</h3>
                        <p className="text-[10px] text-gray-600 mt-0.5">View stock levels</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!loginSuccess) {
                        alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
                        return
                      }
                      if (isConfigured) {
                        handleQuerySubmit('Show me top 10 sales by revenue', {})
                      }
                    }}
                    disabled={loading || !isConfigured || !loginSuccess}
                    className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-3 hover:border-green-400 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="flex-shrink-0 w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Trophy className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-xs">Top 10 Sales</h3>
                        <p className="text-[10px] text-gray-600 mt-0.5">Revenue leaders</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!loginSuccess) {
                        alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
                        return
                      }
                      if (isConfigured) {
                        handleQuerySubmit('Show me top 10 customers by revenue', {})
                      }
                    }}
                    disabled={loading || !isConfigured || !loginSuccess}
                    className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-3 hover:border-purple-400 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="flex-shrink-0 w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-xs">Top Customers</h3>
                        <p className="text-[10px] text-gray-600 mt-0.5">Revenue leaders</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Input Bar - Fixed at Bottom */}
          <div className="pb-4">
            <div className="w-full max-w-4xl mx-auto px-4">
              <QueryInput onSubmit={handleQuerySubmit} loading={loading} isConfigured={isConfigured} loginSuccess={loginSuccess} currentQuery={originalQuery} showSuggestions={false} />
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed Input Bar at Bottom when Results are Shown */}
      {queryResult && !loading && (
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-lg">
          <div className="max-w-4xl mx-auto px-4">
            <QueryInput onSubmit={handleQuerySubmit} loading={loading} isConfigured={isConfigured} loginSuccess={loginSuccess} currentQuery={originalQuery} compact={true} />
          </div>
        </div>
      )}
    </div>
  )
}

