'use client'

import { useState, useMemo, memo } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ChartDisplayProps {
  data: any[]
  chartType: 'pie' | 'bar' | 'line' | 'table' | 'kpi'
  chartConfig?: {
    xAxisField?: string
    yAxisField?: string
    groupByField?: string
  }
  currentPage?: number
  rowsPerPage?: number
  onPageChange?: (page: number) => void
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

// Memoized data transformation with AI-determined field mapping
const transformChartData = (data: any[], chartConfig?: { xAxisField?: string; yAxisField?: string; groupByField?: string }): any[] => {
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
      
      // Use AI-determined fields if available, otherwise use fallback logic
      const valueField = chartConfig?.yAxisField || findValueField(item, numericFields)
      const nameField = chartConfig?.xAxisField || findNameField(item, valueField)
      
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

function ChartDisplay({ data, chartType, chartConfig, currentPage: externalCurrentPage, rowsPerPage = 10, onPageChange }: ChartDisplayProps) {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1)
  const currentPage = externalCurrentPage !== undefined ? externalCurrentPage : internalCurrentPage
  const itemsPerPage = rowsPerPage
  
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
  
  // Memoize pagination calculations - show only 10 records at a time
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

  // Memoize chart data transformation - use paginated data (only 10 records)
  const chartData = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return []
    
    if (Array.isArray(paginatedData)) {
      return transformChartData(paginatedData, chartConfig)
    } else if (typeof paginatedData === 'object') {
      return Object.entries(paginatedData).map(([key, value]) => ({
        name: key,
        value: typeof value === 'number' ? value : parseFloat(String(value)) || 0,
        valueFieldName: 'Value',
      }))
    }
    return []
  }, [paginatedData, chartConfig])

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

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage)
    } else {
      setInternalCurrentPage(newPage)
    }
  }
  

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
        <p className="text-gray-500 text-center">No data to display</p>
      </div>
    )
  }


  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-0.5">
            Data Visualization
          </h3>
          <p className="text-xs text-gray-500">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length.toLocaleString()} records
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
            <span className="text-xs text-gray-600 font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
        )}
      </div>
      <div className="h-[300px] mb-4">
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

    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ChartDisplay)

