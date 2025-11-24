'use client'

import { useState, useMemo, useEffect, memo } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react'

interface ChartDisplayProps {
  data: any[]
  chartType: 'pie' | 'bar' | 'line'
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#ef4444', '#8b5cf6', '#3b82f6']

// Memoized helper function to find value field
const findValueField = (item: any, numericFields: [string, any][]): string => {
  const priorityValueFields = ['DocTotal', 'Total', 'Amount', 'Quantity', 'QuantityOnStock', 'OnHand', 'Price', 'Revenue', 'Sales', 'Value']
  const found = priorityValueFields.find(field => 
    numericFields.some(([key]) => key === field)
  )
  if (found) return found
  return numericFields.find(([key]) => !['DocEntry', 'DocNum', 'LineNum', 'Series'].includes(key))?.[0]
    || numericFields[0]?.[0] || 'value'
}

// Memoized helper function to find name field
const findNameField = (item: any, valueField: string): string => {
  const priorityNameFields = ['CardName', 'ItemName', 'Name', 'CustomerName', 'SupplierName', 'DocDate', 'Date', 'Description']
  const found = priorityNameFields.find(field => 
    Object.keys(item).some(key => key === field)
  )
  if (found) return found
  
  return Object.keys(item).find(k => 
    k.toLowerCase().includes('name') || 
    k.toLowerCase().includes('item') ||
    k.toLowerCase().includes('card') ||
    k.toLowerCase().includes('customer') ||
    k.toLowerCase().includes('description')
  ) || Object.keys(item).find(k => 
    !['DocEntry', 'DocNum', 'LineNum', 'Series', valueField].includes(k)
  ) || Object.keys(item)[0] || 'name'
}

// Memoized data transformation
const transformChartData = (data: any[]): any[] => {
  if (!Array.isArray(data) || data.length === 0) return []
  
  return data.map((item, index) => {
    if (typeof item === 'object' && item !== null) {
      // Find numeric fields for aggregation (prioritize meaningful fields)
      const numericFields = Object.entries(item).filter(([_, val]) => 
        typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)))
      )
      
      if (numericFields.length === 0) {
        return { name: `Item ${index + 1}`, value: 0, valueFieldName: 'Value', ...item }
      }
      
      const valueField = findValueField(item, numericFields)
      const nameField = findNameField(item, valueField)
      
      // Format the name field value
      let nameValue = String(item[nameField] || nameField)
      
      // If the value is empty or null, try to use the field name itself or find another meaningful field
      if (!nameValue || nameValue === 'undefined' || nameValue === 'null') {
        const alternativeField = Object.keys(item).find(k => {
          const val = item[k]
          return val !== null && val !== undefined && val !== '' && 
                 !['DocEntry', 'DocNum', 'LineNum', 'Series', valueField].includes(k) &&
                 typeof val !== 'number'
        })
        if (alternativeField) {
          nameValue = String(item[alternativeField])
        }
      }
      
      // If it's a date, format it nicely
      if (nameField.toLowerCase().includes('date') && item[nameField]) {
        try {
          const date = new Date(item[nameField])
          if (!isNaN(date.getTime())) {
            nameValue = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          }
        } catch (e) {
          // Keep original if date parsing fails
        }
      }
      
      return {
        name: nameValue,
        value: parseFloat(String(item[valueField] || 0)),
        valueFieldName: valueField,
        ...item,
      }
    }
    return { name: `Item ${index + 1}`, value: parseFloat(String(item)) || 0, valueFieldName: 'Value' }
  })
}

function ChartDisplay({ data, chartType }: ChartDisplayProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  
  // Get all available fields from data - memoized
  const allFields = useMemo(() => {
    if (!data || data.length === 0) return []
    if (typeof data[0] === 'object' && data[0] !== null) {
      return Object.keys(data[0])
    }
    return ['Value']
  }, [data])
  
  // Create a stable key for the fields to detect when they actually change
  const fieldsKey = useMemo(() => allFields.sort().join(','), [allFields])
  
  // State for selected fields - default to empty (user must select)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [lastFieldsKey, setLastFieldsKey] = useState<string>('')
  
  // Reset selected fields only when the actual field structure changes
  useEffect(() => {
    if (fieldsKey !== lastFieldsKey && fieldsKey.length > 0) {
      setSelectedFields(new Set())
      setLastFieldsKey(fieldsKey)
    } else if (lastFieldsKey === '' && fieldsKey.length > 0) {
      setLastFieldsKey(fieldsKey)
    }
  }, [fieldsKey, lastFieldsKey])

  // Memoize chart data transformation - this is the expensive operation
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    if (Array.isArray(data)) {
      return transformChartData(data)
    } else if (typeof data === 'object') {
      return Object.entries(data).map(([key, value]) => ({
        name: key,
        value: typeof value === 'number' ? value : parseFloat(String(value)) || 0,
        valueFieldName: 'Value',
      }))
    }
    return []
  }, [data])

  // Memoize value key
  const valueKey = useMemo(() => {
    if (chartData.length > 0 && typeof chartData[0].value === 'number') {
      return 'value'
    }
    if (chartData.length > 0) {
      const found = Object.keys(chartData[0] || {}).find(k => 
        typeof chartData[0][k] === 'number'
      )
      return found || 'value'
    }
    return 'value'
  }, [chartData])

  // Memoize pagination calculations
  const { totalPages, startIndex, endIndex, paginatedData } = useMemo(() => {
    const total = Math.ceil(data.length / itemsPerPage)
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return {
      totalPages: total,
      startIndex: start,
      endIndex: end,
      paginatedData: data.slice(start, end)
    }
  }, [data, currentPage, itemsPerPage])
  
  // Memoize table headers
  const tableHeaders = useMemo(() => 
    Array.from(selectedFields).filter(field => allFields.includes(field)),
    [selectedFields, allFields]
  )

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
        <p className="text-gray-500 text-center">No data to display</p>
      </div>
    )
  }

  // Toggle field selection
  const toggleField = (field: string) => {
    setSelectedFields(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(field)) {
        newSelected.delete(field)
      } else {
        newSelected.add(field)
      }
      return newSelected
    })
  }
  
  const selectAllFields = () => {
    setSelectedFields(new Set(allFields))
  }
  
  const deselectAllFields = () => {
    setSelectedFields(new Set())
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-gray-800 mb-1">
          Data Visualization
        </h3>
        <p className="text-xs text-gray-500">
          Showing all {chartData.length.toLocaleString()} records
        </p>
      </div>
      <div className="h-[400px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => {
                  const shortName = name.length > 20 ? name.substring(0, 20) + '...' : name
                  return `${shortName}: ${(percent * 100).toFixed(1)}%`
                }}
                outerRadius={140}
                fill="#8884d8"
                dataKey={valueKey}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
              />
            </PieChart>
          ) : chartType === 'bar' ? (
            <BarChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: chartData.length > 50 ? 120 : 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={chartData.length > 30 ? -90 : -45}
                textAnchor="end"
                height={chartData.length > 30 ? 120 : 80}
                interval={chartData.length > 50 ? Math.floor(chartData.length / 30) : 0}
                tick={{ fontSize: chartData.length > 50 ? 9 : 11 }}
                tickFormatter={(value) => {
                  // Show full name without truncation for better readability
                  return value && value.length > 25 ? value.substring(0, 25) + '...' : value
                }}
              />
              <YAxis 
                label={{ value: 'Value', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: any, props: any) => {
                  // Show the value field name (e.g., "DocTotal", "Amount") instead of repeating the name
                  const valueFieldName = props.payload?.valueFieldName || valueKey || 'Value'
                  const displayValue = typeof value === 'number' ? value.toLocaleString() : value
                  return [displayValue, valueFieldName]
                }}
                labelFormatter={(label) => `Name: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey={valueKey} 
                fill="#3b82f6" 
                radius={[8, 8, 0, 0]}
                name="Value"
              />
            </BarChart>
          ) : (
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: chartData.length > 50 ? 120 : 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={chartData.length > 30 ? -90 : -45}
                textAnchor="end"
                height={chartData.length > 30 ? 120 : 80}
                interval={chartData.length > 50 ? Math.floor(chartData.length / 30) : 0}
                tick={{ fontSize: chartData.length > 50 ? 9 : 11 }}
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: any, props: any) => {
                  // Show the value field name (e.g., "DocTotal", "Amount") instead of repeating the name
                  const valueFieldName = props.payload?.valueFieldName || valueKey || 'Value'
                  const displayValue = typeof value === 'number' ? value.toLocaleString() : value
                  return [displayValue, valueFieldName]
                }}
                labelFormatter={(label) => `Name: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={valueKey} 
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 6 }}
                name="Value"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Field Selector */}
      <div className="mt-6 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-bold text-gray-800">Select Fields to Display</h4>
          <div className="flex gap-2">
            <button
              onClick={selectAllFields}
              className="px-2.5 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-all font-semibold"
            >
              Select All
            </button>
            <button
              onClick={deselectAllFields}
              className="px-2.5 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-all font-semibold"
            >
              Deselect All
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {allFields.map((field) => (
            <button
              key={field}
              onClick={() => toggleField(field)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all text-left text-xs ${
                selectedFields.has(field)
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {selectedFields.has(field) ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span className="font-medium truncate">{field}</span>
            </button>
          ))}
        </div>
        {selectedFields.size === 0 && (
          <p className="mt-3 text-xs text-amber-600 font-medium">
            ⚠️ Please select at least one field to display in the table
          </p>
        )}
      </div>

      {/* Data Table with Pagination */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-bold text-gray-800">Data Details</h4>
          <div className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md font-medium">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length.toLocaleString()} records
          </div>
        </div>
        
        {selectedFields.size > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {tableHeaders.map((key) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={startIndex + idx} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    {tableHeaders.map((header) => {
                      const val = typeof row === 'object' && row !== null ? row[header] : row
                      return (
                        <td key={header} className="px-4 py-3 text-xs text-gray-700 border-r border-gray-100 last:border-r-0">
                          {val === null || val === undefined 
                            ? <span className="text-gray-400">-</span>
                            : typeof val === 'number' 
                              ? <span className="font-semibold text-gray-900">{val.toLocaleString()}</span>
                              : <span className="text-gray-700">{String(val)}</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-xs text-amber-700 font-medium">Please select at least one field above to display data in the table</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-600 font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ChartDisplay)

