'use client'

import { useState, useEffect } from 'react'
import { Send, Loader2, Sparkles, BarChart3, Trophy } from 'lucide-react'

interface QueryInputProps {
  onSubmit: (query: string, variables: Record<string, any>) => void
  loading: boolean
  isConfigured: boolean
  loginSuccess?: boolean // Connection status
  currentQuery?: string // Add current query prop to keep it visible
  compact?: boolean // Show compact version when results are present
  showSuggestions?: boolean // Show example suggestions
}

const exampleQueries = [
  {
    icon: BarChart3,
    text: 'Show me sales by item group for the last 6 months',
    color: 'blue'
  },
  {
    icon: Trophy,
    text: 'Top 10 items by gross profit this quarter',
    color: 'green'
  }
]

const quickActions = [
  'Inventory Status',
  'Cash Flow',
  'Top Customers'
]


export default function QueryInput({ onSubmit, loading, isConfigured, loginSuccess = false, currentQuery, compact = false, showSuggestions = false }: QueryInputProps) {
  const [query, setQuery] = useState(currentQuery || '')
  const [variables, setVariables] = useState<Record<string, string>>({})

  // Update query when currentQuery prop changes (but not when loading to preserve user input)
  useEffect(() => {
    if (currentQuery && !loading) {
      setQuery(currentQuery)
    }
  }, [currentQuery, loading])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || loading) return
    if (!loginSuccess) {
      alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
      return
    }
    if (query.trim() && isConfigured) {
      onSubmit(query, variables)
      // Don't clear query during loading - keep it visible
      if (!loading) {
        setVariables({})
      }
    }
  }

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery)
    if (!loginSuccess) {
      alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
      return
    }
    if (isConfigured) {
      onSubmit(exampleQuery, {})
    }
  }

  const handleQuickAction = (action: string) => {
    const actionQueries: Record<string, string> = {
      'Inventory Status': 'Show me inventory status for all items',
      'Cash Flow': 'Show me cash flow for the last 3 months',
      'Top Customers': 'Show me top 10 customers by revenue'
    }
    const actionQuery = actionQueries[action] || action
    setQuery(actionQuery)
    if (!loginSuccess) {
      alert('Please connect to SAP B1 first. Go to Settings and test your connection.')
      return
    }
    if (isConfigured) {
      onSubmit(actionQuery, {})
    }
  }


  // Simple variable extraction (can be enhanced)
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{(\w+)\}/g)
    return matches ? matches.map(m => m.slice(1, -1)) : []
  }

  const detectedVars = extractVariables(query)
  const allVars = Array.from(new Set([...Object.keys(variables), ...detectedVars]))


  // Compact version (when results are present)
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question in natural language, e.g. 'Show monthly sales by warehouse for this year'"
            className="w-full pl-10 pr-12 py-2.5 bg-white border-2 border-sky-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={loading || !isConfigured || !loginSuccess}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim() || !isConfigured}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Variables Section */}
        {allVars.length > 0 && (
          <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
            <h3 className="text-xs font-semibold text-gray-800 mb-2">
              Variables Detected
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allVars.map((varName) => (
                <div key={varName}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {varName}
                  </label>
                  <input
                    type="text"
                    value={variables[varName] || ''}
                    onChange={(e) =>
                      setVariables({ ...variables, [varName]: e.target.value })
                    }
                    className="w-full px-2.5 py-2 bg-white border border-sky-300 rounded-lg text-gray-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder={`Enter value for ${varName}`}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    )
  }

  // Full version (initial state) - Clean ChatGPT-like interface with suggestions
  return (
    <div className="w-full space-y-4">
      {/* Suggestions Section */}
      {showSuggestions && (
        <div className="space-y-4">
          {/* Example Query Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exampleQueries.map((example, index) => {
              const Icon = example.icon
              const colorClasses = {
                blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
                green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              }
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleExampleClick(example.text)}
                  disabled={loading || !isConfigured || !loginSuccess}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[example.color as keyof typeof colorClasses]}`}
                >
                  <div className="flex items-start space-x-2.5">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      example.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                    }`} />
                    <p className="font-medium text-xs leading-relaxed">{example.text}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {quickActions.map((action, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickAction(action)}
                disabled={loading || !isConfigured || !loginSuccess}
                className="px-3 py-1.5 bg-white border border-sky-300 rounded-full text-xs font-medium text-gray-700 hover:bg-sky-50 hover:border-sky-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question in natural language, e.g. 'Show monthly sales by warehouse for this year'"
            className="w-full pl-10 pr-12 py-3 bg-white border-2 border-sky-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={loading || !isConfigured || !loginSuccess}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim() || !isConfigured}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Variables Section */}
        {allVars.length > 0 && (
          <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
            <h3 className="text-xs font-semibold text-gray-800 mb-2">
              Variables Detected
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allVars.map((varName) => (
                <div key={varName}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {varName}
                  </label>
                  <input
                    type="text"
                    value={variables[varName] || ''}
                    onChange={(e) =>
                      setVariables({ ...variables, [varName]: e.target.value })
                    }
                    className="w-full px-2.5 py-2 bg-white border border-sky-300 rounded-lg text-gray-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder={`Enter value for ${varName}`}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

