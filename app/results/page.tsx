'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ResultsPage from '@/components/ResultsPage'
import { loadQueryResult, deleteQueryResult, cleanupOldResults } from '@/lib/indexeddb'

export default function ResultsPageRoute() {
  const router = useRouter()
  const [queryResult, setQueryResult] = useState<any>(null)
  const [originalQuery, setOriginalQuery] = useState<string>('')
  const [initialChartType, setInitialChartType] = useState<'pie' | 'bar' | 'line'>('bar')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load query result from IndexedDB
    const loadData = async () => {
      try {
        // Clean up old results first
        await cleanupOldResults()
        
        // Get the result ID from sessionStorage
        const resultId = sessionStorage.getItem('queryResultId')
        
        if (!resultId) {
          console.warn('No query result ID found, redirecting to home')
          router.push('/')
          return
        }

        // Load from IndexedDB
        const storedData = await loadQueryResult(resultId)
        
        if (storedData) {
          setQueryResult(storedData.queryResult)
          setOriginalQuery(storedData.originalQuery)
          if (['bar', 'pie', 'line'].includes(storedData.selectedChartType)) {
            setInitialChartType(storedData.selectedChartType as 'pie' | 'bar' | 'line')
          }
          console.log('Loaded query result from IndexedDB:', storedData.queryResult.data?.length || 0, 'records')
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
        await deleteQueryResult(resultId)
        sessionStorage.removeItem('queryResultId')
      }
    } catch (error) {
      console.error('Error cleaning up query result:', error)
    }
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
        />
      </div>
    </div>
  )
}

