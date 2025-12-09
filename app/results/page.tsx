'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ResultsPage from '@/components/ResultsPage'
import { loadQueryResult, deleteQueryResult, cleanupOldResults, safeSetSessionStorage } from '@/lib/indexeddb'

export default function ResultsPageRoute() {
  const router = useRouter()
  const [queryResult, setQueryResult] = useState<any>(null)
  const [originalQuery, setOriginalQuery] = useState<string>('')
  const [initialChartType, setInitialChartType] = useState<'pie' | 'bar' | 'line'>('bar')
  const [loading, setLoading] = useState(true)
  const [dataTimestamp, setDataTimestamp] = useState<number | undefined>(undefined)

  useEffect(() => {
    // Load query result - check sessionStorage first (instant), then IndexedDB (for persistence)
    const loadData = async () => {
      try {
        // Get the result ID from sessionStorage
        const resultId = sessionStorage.getItem('queryResultId')
        
        if (!resultId) {
          console.warn('No query result ID found, redirecting to home')
          router.push('/')
          return
        }

        // Try to load from sessionStorage first (instant access)
        const sessionData = sessionStorage.getItem(`queryResult_${resultId}`)
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData)
            setQueryResult(parsed.queryResult)
            setOriginalQuery(parsed.originalQuery)
            if (['bar', 'pie', 'line'].includes(parsed.selectedChartType)) {
              setInitialChartType(parsed.selectedChartType as 'pie' | 'bar' | 'line')
            }
            setDataTimestamp(parsed.timestamp || Date.now())
            setLoading(false)
            console.log('Loaded query result from sessionStorage:', parsed.queryResult.data?.length || 0, 'records')
            
            // Clean up old results in background (non-blocking)
            cleanupOldResults().catch(err => console.error('Background cleanup failed:', err))
            
            // Try to migrate to IndexedDB in background if not already there
            if (!resultId.startsWith('temp_')) {
              // Already in IndexedDB, nothing to do
              return
            }
            
            // Try to load from IndexedDB in background to get the real ID
            loadQueryResult(resultId).then((storedData) => {
              if (storedData) {
                // Update sessionStorage with real ID (if possible)
                const realId = storedData.id || resultId
                safeSetSessionStorage('queryResultId', realId)
                
                // Only cache if data is small enough
                const dataToCache = {
                  queryResult: storedData.queryResult,
                  originalQuery: storedData.originalQuery,
                  selectedChartType: storedData.selectedChartType,
                  timestamp: storedData.timestamp
                }
                const dataSize = JSON.stringify(dataToCache).length
                if (dataSize < 2 * 1024 * 1024) {
                  safeSetSessionStorage(`queryResult_${realId}`, JSON.stringify(dataToCache))
                }
                // Clean up temp entry
                try {
                  sessionStorage.removeItem(`queryResult_${resultId}`)
                } catch (e) {
                  // Ignore cleanup errors
                }
              }
            }).catch(err => {
              console.log('IndexedDB migration in progress or failed (non-critical):', err)
            })
            
            return
          } catch (parseError) {
            console.warn('Failed to parse sessionStorage data, falling back to IndexedDB')
          }
        }

        // Fallback to IndexedDB if sessionStorage doesn't have it
        // Clean up old results first (non-blocking)
        cleanupOldResults().catch(err => console.error('Background cleanup failed:', err))
        
        const storedData = await loadQueryResult(resultId)
        
        if (storedData) {
          setQueryResult(storedData.queryResult)
          setOriginalQuery(storedData.originalQuery)
          if (['bar', 'pie', 'line'].includes(storedData.selectedChartType)) {
            setInitialChartType(storedData.selectedChartType as 'pie' | 'bar' | 'line')
          }
          setDataTimestamp(storedData.timestamp)
          console.log('Loaded query result from IndexedDB:', storedData.queryResult.data?.length || 0, 'records')
          
          // Try to cache in sessionStorage for faster future access (optional)
          const dataToCache = {
            queryResult: storedData.queryResult,
            originalQuery: storedData.originalQuery,
            selectedChartType: storedData.selectedChartType,
            timestamp: storedData.timestamp
          }
          const dataSize = JSON.stringify(dataToCache).length
          // Only cache if data is small enough (< 2MB)
          if (dataSize < 2 * 1024 * 1024) {
            safeSetSessionStorage(`queryResult_${resultId}`, JSON.stringify(dataToCache))
          } else {
            console.log('Data too large for sessionStorage cache, using IndexedDB only')
          }
        } else {
          console.warn('Query result not found in IndexedDB, redirecting to home')
          router.push('/')
        }
      } catch (error: any) {
        console.error('Error loading results:', error)
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code
        })
        alert(`Failed to load results: ${error.message || 'Unknown error'}. Please run the query again.`)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleBackToQuery = async () => {
    // Clear the stored data and navigate back
    try {
      const resultId = sessionStorage.getItem('queryResultId')
      if (resultId) {
        // Clear sessionStorage first
        sessionStorage.removeItem('queryResultId')
        // Also clear any cached query result data
        try {
          sessionStorage.removeItem(`queryResult_${resultId}`)
        } catch (e) {
          // Ignore if doesn't exist
        }
        // Delete from IndexedDB in background (non-blocking)
        deleteQueryResult(resultId).catch(err => {
          console.error('Error deleting from IndexedDB:', err)
        })
      }
    } catch (error) {
      console.error('Error cleaning up query result:', error)
    }
    // Navigate back to home
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!queryResult) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <ResultsPage
          queryResult={queryResult}
          originalQuery={originalQuery}
          onBack={handleBackToQuery}
          initialChartType={initialChartType}
          dataTimestamp={dataTimestamp}
        />
      </div>
    </div>
  )
}

