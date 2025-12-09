'use client'

import { useState } from 'react'
import { CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react'

interface DataTableProps {
  data: any[]
  originalQuery: string
  objectName?: string
}

export default function DataTable({ data, originalQuery, objectName }: DataTableProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'schema'>('table')
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const rowsPerPage = 10

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-sky-200">
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    )
  }

  // Get all unique column names, excluding internal/system fields
  const allColumns = new Set<string>()
  data.forEach((item: any) => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => {
        // Filter out internal/system fields
        if (!key.startsWith('odata.') && key !== '__metadata') {
          allColumns.add(key)
        }
      })
    }
  })

  const columns = Array.from(allColumns)
  
  // Initialize selected columns if empty
  if (selectedColumns.size === 0 && columns.length > 0) {
    const initialSelection = new Set(columns.slice(0, Math.min(4, columns.length)))
    setSelectedColumns(initialSelection)
  }

  // Get columns to display (or all if none selected)
  const displayColumns = selectedColumns.size > 0 
    ? columns.filter(col => selectedColumns.has(col))
    : columns

  // Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = data.slice(startIndex, endIndex)

  const toggleColumn = (column: string) => {
    const newSelection = new Set(selectedColumns)
    if (newSelection.has(column)) {
      newSelection.delete(column)
    } else {
      newSelection.add(column)
    }
    setSelectedColumns(newSelection)
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'number') {
      // Format numbers with commas
      if (Number.isInteger(value)) {
        return value.toLocaleString()
      }
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Format dates
      return new Date(value).toLocaleDateString()
    }
    return String(value)
  }

  const getColumnType = (column: string): string => {
    const sampleValue = data.find(item => item[column] !== null && item[column] !== undefined)?.[column]
    if (sampleValue === null || sampleValue === undefined) return 'Text'
    if (typeof sampleValue === 'number') return 'Number'
    if (typeof sampleValue === 'boolean') return 'Boolean'
    if (sampleValue instanceof Date || (typeof sampleValue === 'string' && sampleValue.match(/^\d{4}-\d{2}-\d{2}/))) {
      return 'Date'
    }
    return 'Text'
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-sky-200" data-table-section>
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'table'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Data Table
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'schema'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Schema & Columns
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'table' ? (
          <div className="space-y-4">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {displayColumns.map((column) => (
                      <th key={column} className="text-left py-3 px-4 font-semibold text-gray-700 uppercase text-xs">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                      {displayColumns.map((column) => (
                        <td key={column} className="py-3 px-4 text-gray-800">
                          {formatValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length.toLocaleString()} rows
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">Available columns from {objectName || 'query'}:</p>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filtered Columns List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {columns
                .filter((column) => 
                  searchQuery.trim() === '' || 
                  column.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((column) => {
                  const isSelected = selectedColumns.has(column)
                  const columnType = getColumnType(column)
                  return (
                    <div
                      key={column}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleColumn(column)}
                    >
                      <div className="flex items-center space-x-3">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{column}</p>
                          <p className="text-xs text-gray-500">{columnType}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              {searchQuery.trim() !== '' && 
               columns.filter((column) => 
                 column.toLowerCase().includes(searchQuery.toLowerCase())
               ).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No columns found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

