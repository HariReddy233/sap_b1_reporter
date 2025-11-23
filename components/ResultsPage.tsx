'use client'

import { useState } from 'react'
import { ArrowLeft, Download, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import ChartDisplay from './ChartDisplay'

interface QueryResult {
  success: boolean
  query: string
  objectName: string
  data: any[]
  rawResult: any
  recommendedChartTypes?: ('pie' | 'bar' | 'line')[]
}

interface ResultsPageProps {
  queryResult: QueryResult
  originalQuery: string
  onBack: () => void
  initialChartType?: 'pie' | 'bar' | 'line'
}

export default function ResultsPage({ queryResult, originalQuery, onBack, initialChartType = 'bar' }: ResultsPageProps) {
  // Get recommended chart types or default to all
  const recommendedTypes = queryResult.recommendedChartTypes || ['bar', 'pie', 'line']
  const defaultChartType = recommendedTypes.includes(initialChartType) ? initialChartType : recommendedTypes[0]
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>(defaultChartType)

  // Log data length for debugging
  console.log('ResultsPage: Query result data length:', queryResult.data?.length || 0)
  console.log('ResultsPage: Full query result:', queryResult)

  const handleExport = async () => {
    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx')
      
      if (!queryResult.data || queryResult.data.length === 0) {
        alert('No data to export')
        return
      }

      // Prepare data for Excel export
      // Get all unique field names from all records
      const allFields = new Set<string>()
      queryResult.data.forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => allFields.add(key))
        }
      })

      // Convert data to array of objects format for Excel (better structure)
      const headers = Array.from(allFields)
      const rows = queryResult.data.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          const row: any = {}
          headers.forEach(header => {
            const value = item[header]
            // Handle null, undefined
            if (value === null || value === undefined) {
              row[header] = ''
            } else {
              row[header] = value
            }
          })
          return row
        }
        return { Value: item }
      })

      // Create worksheet from array of objects
      const worksheet = XLSX.utils.json_to_sheet(rows)

      // Set column widths for better readability
      const columnWidths = headers.map(header => ({
        wch: Math.max(header.length + 2, 15) // Minimum width 15, add padding
      }))
      worksheet['!cols'] = columnWidths

      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new()
      const sheetName = (queryResult.objectName || 'Data').substring(0, 31) // Excel sheet name limit
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

      // Generate Excel file and download
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array'
      })
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const timestamp = new Date().toISOString().split('T')[0]
      const fileName = `sap-b1-${(queryResult.objectName || 'data').toLowerCase().replace(/\s+/g, '-')}-${timestamp}.xlsx`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      // Fallback to JSON if xlsx library is not available
      const dataStr = JSON.stringify(queryResult.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sap-b1-query-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
      alert('Excel export failed. Data exported as JSON instead.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all duration-200 border border-gray-300 shadow-sm hover:shadow-md font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export to Excel</span>
        </button>
      </div>

      {/* Query Info Card - Compact and Modern */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-800">Query Results</h2>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-xs text-gray-600 font-medium">Object: </span>
              <span className="text-xs font-bold text-blue-700">{queryResult.objectName}</span>
            </div>
            <div className="px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              <span className="text-xs text-gray-600 font-medium">Records: </span>
              <span className="text-xs font-bold text-green-700">{(queryResult.data?.length || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Query:</span> <span className="italic">"{originalQuery}"</span>
        </p>
      </div>

      {/* Chart Type Selector - Only show recommended chart types */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Visualization Type</h3>
          {recommendedTypes.length < 3 && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-semibold border border-blue-200">
              ✨ AI Recommended
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {recommendedTypes.includes('bar') && (
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                chartType === 'bar'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-blue-50 border border-gray-300 hover:border-blue-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Bar</span>
            </button>
          )}
          {recommendedTypes.includes('pie') && (
            <button
              onClick={() => setChartType('pie')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                chartType === 'pie'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-purple-50 border border-gray-300 hover:border-purple-300'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Pie</span>
            </button>
          )}
          {recommendedTypes.includes('line') && (
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                chartType === 'line'
                  ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-green-50 border border-gray-300 hover:border-green-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Line</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Display */}
      <ChartDisplay data={queryResult.data} chartType={chartType} />
    </div>
  )
}

