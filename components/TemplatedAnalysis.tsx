'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart3, PieChart, TrendingUp, Send, Loader2, Lock, Trophy } from 'lucide-react'
import ChartDisplay from './ChartDisplay'
import DataTable from './DataTable'

interface Settings {
  sapServer: string
  companyDB: string
  userName: string
  password: string
  openaiApiKey: string
  openaiModel: string
}

interface TemplatedAnalysisProps {
  settings: Settings
  isConfigured: boolean
  loginSuccess: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function TemplatedAnalysis({ settings, isConfigured, loginSuccess }: TemplatedAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'SalesAnalysis' | 'PurchaseAnalysis'>('SalesAnalysis')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState<any[]>([])
  const [queryResult, setQueryResult] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'You are viewing the Sales Analysis. Ask me a question about sales data, and I\'ll fetch and analyze the data for you. What would you like to know?'
  }])
  const [question, setQuestion] = useState('')
  const [processingQuestion, setProcessingQuestion] = useState(false)
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('bar')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Update initial message when tab changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `You are viewing the ${activeTab === 'SalesAnalysis' ? 'Sales' : 'Purchase'} Analysis. Ask me a question about ${activeTab === 'SalesAnalysis' ? 'sales' : 'purchase'} data, and I'll fetch and analyze the data for you. What would you like to know?`
    }])
    // Clear previous data when tab changes
    setAnalysisData([])
    setQueryResult(null)
    setQuestion('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchAnalysisData = async () => {
    if (!loginSuccess || !isConfigured) {
      alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/fetch-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          analysisType: activeTab,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch analysis data')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setAnalysisData(result.data)
        setQueryResult({
          data: result.data,
          analysisType: result.analysisType,
          count: result.count
        })
        
        // Initialize with default chart
        if (result.data.length > 0) {
          analyzeDataForChart(result.data)
        }
      }
    } catch (error: any) {
      console.error('Error fetching analysis data:', error)
      alert(`Failed to fetch ${activeTab} data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const analyzeDataForChart = (data: any[]) => {
    if (!data || data.length === 0) return

    // Simple analysis to determine best chart type
    const firstRecord = data[0]
    if (typeof firstRecord === 'object' && firstRecord !== null) {
      const fields = Object.keys(firstRecord)
      const numericFields = fields.filter(f => {
        const val = firstRecord[f]
        return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)))
      })
      const dateFields = fields.filter(f => f.toLowerCase().includes('date') || f.toLowerCase().includes('time'))
      
      if (dateFields.length > 0 && numericFields.length > 0) {
        setChartType('line')
      } else if (numericFields.length > 0) {
        setChartType('bar')
      } else {
        setChartType('bar')
      }
    }
  }

  const handleQuestionSubmit = async (e?: React.FormEvent, queryText?: string) => {
    if (e) e.preventDefault()
    const questionToProcess = queryText || question.trim()
    if (!questionToProcess || processingQuestion) return

    if (!loginSuccess || !isConfigured) {
      alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
      return
    }

    const userQuestion = questionToProcess.trim()
    setQuestion('')
    setProcessingQuestion(true)

    // Add user message
    const userMessage: Message = { role: 'user', content: userQuestion }
    setMessages(prev => [...prev, userMessage])

    try {
      // First, fetch analysis data if not already loaded
      let dataToUse = analysisData
      
      if (dataToUse.length === 0) {
        setLoading(true)
        const fetchResponse = await fetch('/api/fetch-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings,
            analysisType: activeTab,
          }),
        })

        if (!fetchResponse.ok) {
          const error = await fetchResponse.json()
          throw new Error(error.error || 'Failed to fetch analysis data')
        }

        const fetchResult = await fetchResponse.json()
        if (fetchResult.success && fetchResult.data && Array.isArray(fetchResult.data)) {
          dataToUse = fetchResult.data
          setAnalysisData(fetchResult.data)
        } else {
          throw new Error('No data received from analysis endpoint')
        }
        setLoading(false)
      }

      // Validate we have data before proceeding
      if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
        throw new Error('No data available to process your question. Please try again.')
      }

      // Now process the question with the data
      const response = await fetch('/api/query-analysis-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userQuestion,
          data: dataToUse,
          analysisType: activeTab,
          settings: {
            openaiApiKey: settings.openaiApiKey,
            openaiModel: settings.openaiModel,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process question')
      }

      const result = await response.json()
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response || 'I\'ve processed your question. Here are the results:'
      }
      setMessages(prev => [...prev, assistantMessage])

      // Update query result if we have filtered data
      if (result.filteredData && Array.isArray(result.filteredData)) {
        setQueryResult({
          data: result.filteredData,
          analysisType: activeTab,
          count: result.filteredData.length,
          question: userQuestion
        })
        analyzeDataForChart(result.filteredData)
      } else {
        // If no filtered data but we have original data, show all data
        setQueryResult({
          data: dataToUse,
          analysisType: activeTab,
          count: dataToUse.length,
          question: userQuestion
        })
        analyzeDataForChart(dataToUse)
      }
    } catch (error: any) {
      console.error('Error processing question:', error)
      setLoading(false)
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setProcessingQuestion(false)
    }
  }


  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-sky-50">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Report Details and Visualization */}
        <div className="flex-1 flex flex-col overflow-hidden pr-4">
          {/* Tabs */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab('SalesAnalysis')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'SalesAnalysis'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sales Analysis
            </button>
            <button
              onClick={() => setActiveTab('PurchaseAnalysis')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'PurchaseAnalysis'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Purchase Analysis
            </button>
          </div>

          {/* Loading State - Only show when processing a question */}
          {loading && processingQuestion && (
            <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-md border border-sky-200">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading {activeTab} data...</p>
              </div>
            </div>
          )}

          {/* Main Visualization */}
          {!loading && queryResult && queryResult.data && queryResult.data.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-sky-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {activeTab === 'SalesAnalysis' ? 'Sales Analysis' : 'Purchase Analysis'}
                </h2>
                <div className="h-96">
                  <ChartDisplay
                    data={queryResult.data}
                    chartType={chartType}
                  />
                </div>
              </div>

              {/* Report Configuration */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-sky-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Report Configuration</h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Edit Configuration
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date Range:</span>
                    <span className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <span>Last 6 months</span>
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Selected Columns:</span>
                    <span className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <span>Month: X-Axis</span>
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-md border border-sky-200 mb-4">
                <DataTable
                  data={queryResult.data}
                  originalQuery={queryResult.question || `View ${activeTab}`}
                  objectName={activeTab}
                />
              </div>
            </div>
          )}

          {/* Empty State - Prompt user to ask questions */}
          {!loading && (!queryResult || !queryResult.data || queryResult.data.length === 0) && (
            <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-md border border-sky-200">
              <div className="text-center max-w-md px-6">
                <BarChart3 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTab === 'SalesAnalysis' ? 'Sales Analysis' : 'Purchase Analysis'}
                </h3>
                <p className="text-gray-600">
                  Ask me a question about {activeTab === 'SalesAnalysis' ? 'sales' : 'purchase'} data, and I'll fetch and analyze the information for you.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - AI Assistant */}
        <div className="w-96 bg-white border-l border-sky-200 flex flex-col">
          {/* AI Assistant Header */}
          <div className="p-4 border-b border-sky-200">
            <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-50 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {processingQuestion && (
              <div className="flex justify-start">
                <div className="bg-blue-50 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Question Input */}
          <div className="p-4 border-t border-sky-200">
            <form onSubmit={handleQuestionSubmit} className="flex space-x-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about this report..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={processingQuestion}
              />
              <button
                type="submit"
                disabled={processingQuestion || !question.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>
      </div>
    </div>
  )
}

