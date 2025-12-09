'use client'

import { Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface QueryDisplayProps {
  userQuery: string
  formattedQuery?: string
  description?: string
  objectName?: string
}

export default function QueryDisplay({ userQuery, formattedQuery, description, objectName }: QueryDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (formattedQuery) {
      try {
        await navigator.clipboard.writeText(formattedQuery)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  if (!formattedQuery) {
    return null
  }

  return (
    <div className="space-y-4 mb-6">
      {/* User Query Bubble */}
      <div className="flex justify-end">
        <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-2xl">
          <p className="text-sm text-gray-800">{userQuery}</p>
        </div>
      </div>

      {/* System Response */}
      <div className="space-y-3">
        {description && (
          <p className="text-sm text-gray-700">
            {description} 👍
          </p>
        )}

        {/* Query Title */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-gray-900">
            {objectName ? `${objectName} Query` : 'Generated Query'}
          </h3>
        </div>

        {/* SQL Code Block */}
        <div className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          {/* Code Block Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
            <span className="text-xs font-mono text-gray-600">sql</span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Content */}
          <div className="p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
              <code>{formattedQuery}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

