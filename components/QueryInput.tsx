'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Sparkles, Brain } from 'lucide-react'

interface QueryInputProps {
  onSubmit: (query: string, variables: Record<string, any>) => void
  loading: boolean
  isConfigured: boolean
  currentQuery?: string // Add current query prop to keep it visible
}

const exampleQueries = [
  'Give me one year sales',
  'Show top 10 customers by revenue',
  'Monthly revenue for this year',
  'List all pending orders',
  'Show inventory items below minimum stock',
]

export default function QueryInput({ onSubmit, loading, isConfigured, currentQuery }: QueryInputProps) {
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
    if (isConfigured) {
      onSubmit(exampleQuery, {})
    }
  }

  // Simple variable extraction (can be enhanced)
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{(\w+)\}/g)
    return matches ? matches.map(m => m.slice(1, -1)) : []
  }

  const detectedVars = extractVariables(query)
  const allVars = Array.from(new Set([...Object.keys(variables), ...detectedVars]))

  // Modern Animated AI Logo Component - Refined and Cleaner
  const AnimatedAILogo = () => (
    <div className="relative flex items-center justify-center w-12 h-12">
      {/* Subtle outer glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 opacity-15 animate-pulse" style={{ animationDuration: '4s' }}></div>
      
      {/* Main container with refined gradient */}
      <div className="relative p-2.5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl shadow-md">
        {/* Minimal sparkles - only 2 for cleaner look */}
        <div className="absolute -top-0.5 -right-0.5">
          <Sparkles className="w-2.5 h-2.5 text-yellow-300 animate-pulse" style={{ animationDuration: '2s' }} />
        </div>
        <div className="absolute -bottom-0.5 -left-0.5">
          <Sparkles className="w-2 h-2 text-cyan-300 animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
        </div>
        
        {/* Brain icon with subtle animation */}
        <Brain 
          className="w-5 h-5 text-white relative z-10" 
          style={{ 
            filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))',
            animation: 'float 4s ease-in-out infinite'
          }} 
        />
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-200">
      {/* Header Section - Centered and Clean */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <AnimatedAILogo />
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Natural Language Query
          </h2>
        </div>
        <p className="text-sm text-gray-500">Ask questions in plain English and get instant insights</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Query Input Section - Cleaner Layout */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your SAP B1 data..."
              className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={loading || !isConfigured}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim() || !isConfigured}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg font-semibold text-base whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>

        {allVars.length > 0 && (
          <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              Variables Detected
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allVars.map((varName) => (
                <div key={varName}>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    {varName}
                  </label>
                  <input
                    type="text"
                    value={variables[varName] || ''}
                    onChange={(e) =>
                      setVariables({ ...variables, [varName]: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder={`Enter value for ${varName}`}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example Queries - Refined */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-3 font-medium">💡 Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleExampleClick(example)}
                disabled={loading || !isConfigured}
                className="px-4 py-2 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}

