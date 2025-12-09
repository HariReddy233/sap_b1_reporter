'use client'

import { BarChart3, PieChart, TrendingUp, Table2, Sparkles } from 'lucide-react'

interface RecommendedVisualizationsProps {
  data: any[]
  onSelectVisualization: (type: 'bar' | 'pie' | 'line' | 'table' | 'kpi') => void
  recommendedTypes?: ('pie' | 'bar' | 'line')[]
  bestChartType?: 'pie' | 'bar' | 'line' // AI's best recommendation
}

export default function RecommendedVisualizations({ 
  data, 
  onSelectVisualization,
  recommendedTypes = ['bar', 'pie', 'line'],
  bestChartType
}: RecommendedVisualizationsProps) {
  const visualizations = [
    {
      id: 'bar' as const,
      icon: BarChart3,
      title: 'Column Chart',
      description: 'Best for comparing sales across months',
      color: 'blue',
      recommended: recommendedTypes.includes('bar'),
      isBest: bestChartType === 'bar'
    },
    {
      id: 'line' as const,
      icon: TrendingUp,
      title: 'Line Chart',
      description: 'Show trends and patterns over time',
      color: 'green',
      recommended: recommendedTypes.includes('line'),
      isBest: bestChartType === 'line'
    },
    {
      id: 'pie' as const,
      icon: PieChart,
      title: 'Pie Chart',
      description: 'Compare proportions and percentages',
      color: 'purple',
      recommended: recommendedTypes.includes('pie'),
      isBest: bestChartType === 'pie'
    },
    {
      id: 'table' as const,
      icon: Table2,
      title: 'Data Table',
      description: 'View detailed data in tabular format',
      color: 'gray',
      recommended: false
    }
  ]

  // Calculate KPI values if numeric data exists
  const numericColumns = data.length > 0 && typeof data[0] === 'object' && data[0] !== null
    ? Object.keys(data[0]).filter(key => {
        const sample = data.find(item => item[key] !== null && item[key] !== undefined)?.[key]
        return typeof sample === 'number'
      })
    : []

  const hasKPIData = numericColumns.length > 0

  if (hasKPIData) {
    const firstNumericCol = numericColumns[0]
    const total = data.reduce((sum, item) => sum + (item[firstNumericCol] || 0), 0)
    const avg = data.length > 0 ? total / data.length : 0

    visualizations.push({
      id: 'kpi' as const,
      icon: Sparkles,
      title: 'KPI Summary',
      description: 'Key metrics and totals',
      color: 'indigo',
      recommended: false,
      kpiData: {
        total: total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        avg: avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        label: firstNumericCol
      }
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Recommended visualizations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visualizations.map((viz) => {
          const Icon = viz.icon
          const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            green: 'bg-green-50 border-green-200 hover:bg-green-100',
            purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
            indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
          }

          return (
            <div
              key={viz.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${colorClasses[viz.color as keyof typeof colorClasses]} ${
                viz.recommended ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onSelectVisualization(viz.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${
                  viz.color === 'blue' ? 'bg-blue-100' :
                  viz.color === 'green' ? 'bg-green-100' :
                  viz.color === 'purple' ? 'bg-purple-100' :
                  viz.color === 'indigo' ? 'bg-indigo-100' :
                  'bg-gray-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    viz.color === 'blue' ? 'text-blue-600' :
                    viz.color === 'green' ? 'text-green-600' :
                    viz.color === 'purple' ? 'text-purple-600' :
                    viz.color === 'indigo' ? 'text-indigo-600' :
                    'text-gray-600'
                  }`} />
                </div>
                {viz.isBest && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
                {viz.recommended && !viz.isBest && (
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    Also Good
                  </span>
                )}
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-1">{viz.title}</h4>
              <p className="text-xs text-gray-600 mb-3">{viz.description}</p>

              {viz.id === 'kpi' && viz.kpiData && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Total {viz.kpiData.label}</p>
                    <p className="text-lg font-bold text-gray-900">${viz.kpiData.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="text-sm font-semibold text-gray-700">${viz.kpiData.avg}</p>
                  </div>
                </div>
              )}

              <button
                className="w-full mt-3 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectVisualization(viz.id)
                }}
              >
                Use this view
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

