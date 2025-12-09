'use client'

import { Sparkles } from 'lucide-react'

interface AIAssistantSummaryProps {
  userQuery: string
  dataCount: number
  objectName?: string
  description?: string
}

export default function AIAssistantSummary({ 
  userQuery, 
  dataCount, 
  objectName,
  description
}: AIAssistantSummaryProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">AI Assistant</h3>
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-medium">You asked:</span> "{userQuery}"
          </p>
          <p className="text-sm text-gray-700">
            {description || `I've queried your SAP B1 data and found ${dataCount.toLocaleString()} records from ${objectName || 'the database'}. The data shows relevant information based on your query.`}
          </p>
        </div>
      </div>
    </div>
  )
}

