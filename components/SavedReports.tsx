'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, Eye, Calendar, Tag, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { getAllReports, deleteReport, SavedReport } from '@/lib/indexeddb'
import { useRouter } from 'next/navigation'

export default function SavedReports() {
  const router = useRouter()
  const [reports, setReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredReports, setFilteredReports] = useState<SavedReport[]>([])

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    // Filter reports based on search query
    if (!searchQuery.trim()) {
      setFilteredReports(reports)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredReports(
        reports.filter(
          (report) =>
            report.title.toLowerCase().includes(query) ||
            report.description?.toLowerCase().includes(query) ||
            report.originalQuery.toLowerCase().includes(query) ||
            report.tags?.some((tag) => tag.toLowerCase().includes(query))
        )
      )
    }
  }, [searchQuery, reports])

  const loadReports = async () => {
    try {
      setLoading(true)
      const allReports = await getAllReports()
      setReports(allReports)
      setFilteredReports(allReports)
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Failed to load saved reports')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      await deleteReport(id)
      await loadReports() // Reload the list
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Failed to delete report')
    }
  }

  const handleViewReport = (report: SavedReport) => {
    // Store report data and navigate to results page
    const dataToStore = {
      queryResult: report.queryResult,
      originalQuery: report.originalQuery,
      selectedChartType: report.selectedChartType,
      timestamp: report.timestamp
    }

    const tempId = `report_${report.id}`
    try {
      sessionStorage.setItem('queryResultId', tempId)
      const dataSize = JSON.stringify(dataToStore).length
      if (dataSize < 2 * 1024 * 1024) {
        sessionStorage.setItem(`queryResult_${tempId}`, JSON.stringify(dataToStore))
      }
      router.push('/results')
    } catch (error) {
      console.error('Error navigating to report:', error)
      alert('Failed to open report')
    }
  }

  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'bar':
        return BarChart3
      case 'pie':
        return PieChart
      case 'line':
        return TrendingUp
      default:
        return BarChart3
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Reports</h1>
        <p className="text-gray-600">Browse and manage your saved visualizations</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search reports by name, tag, or description"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery ? 'No reports found' : 'No saved reports yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create and save reports from your queries to see them here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const ChartIcon = getChartIcon(report.selectedChartType)
            const recordCount = report.queryResult?.data?.length || 0

            return (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Chart Preview Area */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b border-gray-200">
                  <div className="text-center">
                    <ChartIcon className="w-16 h-16 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-600 font-medium">
                      {report.selectedChartType.toUpperCase()} Chart
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{recordCount} records</p>
                  </div>
                </div>

                {/* Report Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{report.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.description}</p>

                  {/* Tags */}
                  {report.tags && report.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {report.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {report.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          +{report.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(report.lastModified)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="w-3 h-3" />
                      <span>{report.queryResult?.objectName || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewReport(report)}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Open Report</span>
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id, report.title)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

