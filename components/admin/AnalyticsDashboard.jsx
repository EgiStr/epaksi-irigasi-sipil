'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Map,
  Activity,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react'

const AnalyticsDashboard = () => {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0]
  })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange.start, dateRange.end])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // In real implementation:
      // const response = await fetch(`/api/admin/analytics?startDate=${dateRange.start}&endDate=${dateRange.end}`)
      
      // Simulated analytics data
      const simulatedData = {
        overview: {
          totalUsers: 156,
          activeUsers: 89,
          totalSurveys: 1247,
          totalFeatures: 342,
          averageScore: 78.5,
          systemUptime: 99.8
        },
        trends: {
          usersGrowth: 12.5,
          surveysGrowth: -3.2,
          featuresGrowth: 8.1,
          scoreImprovement: 2.3
        },
        chartData: {
          surveysPerDay: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            surveys: Math.floor(Math.random() * 50) + 10,
            users: Math.floor(Math.random() * 20) + 5
          })),
          scoreDistribution: [
            { class: 'A', count: 245, percentage: 19.6 },
            { class: 'B', count: 389, percentage: 31.2 },
            { class: 'C', count: 432, percentage: 34.6 },
            { class: 'D', count: 181, percentage: 14.5 }
          ],
          schemeComparison: [
            { scheme: 'Utama', count: 756, avgScore: 82.3 },
            { scheme: 'Tersier', count: 491, avgScore: 73.1 }
          ],
          topPerformers: [
            { name: 'D.I. Way Rarem', surveys: 89, avgScore: 85.2 },
            { name: 'D.I. Sukamaju', surveys: 76, avgScore: 82.1 },
            { name: 'D.I. Rejosari', surveys: 65, avgScore: 79.8 },
            { name: 'D.I. Makmur Jaya', surveys: 58, avgScore: 77.4 },
            { name: 'D.I. Sumber Rejeki', surveys: 52, avgScore: 75.9 }
          ]
        },
        systemHealth: {
          cpu: 45,
          memory: 67,
          disk: 23,
          network: 89,
          database: 'healthy',
          lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      }
      
      setAnalytics(simulatedData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  const exportReport = (type) => {
    // In real implementation:
    // window.open(`/api/admin/analytics/export?type=${type}&startDate=${dateRange.start}&endDate=${dateRange.end}`, '_blank')
    alert(`Export ${type} akan segera tersedia`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error loading analytics: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportReport('summary')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export Summary
          </button>
          <button
            onClick={() => exportReport('detailed')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export Detailed
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.overview.totalUsers}</p>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-600">+{analytics.trends.usersGrowth}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.overview.activeUsers}</p>
              <div className="text-xs text-gray-500">
                {((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100).toFixed(1)}% active
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Surveys</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.overview.totalSurveys}</p>
              <div className="flex items-center gap-1 text-xs">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-red-600">{analytics.trends.surveysGrowth}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Map className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Features</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.overview.totalFeatures}</p>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-600">+{analytics.trends.featuresGrowth}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.overview.averageScore}</p>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-600">+{analytics.trends.scoreImprovement}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">System Uptime</p>
              <p className="text-xl font-semibold text-gray-900">{analytics.overview.systemUptime}%</p>
              <div className="text-xs text-green-600">Excellent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Harian</h3>
          <div className="h-64 flex items-end justify-between gap-1">
            {analytics.chartData.surveysPerDay.slice(-14).map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="w-6 bg-blue-500 rounded-t"
                    style={{ height: `${(day.surveys / 50) * 100}px` }}
                    title={`${day.surveys} surveys`}
                  ></div>
                  <div 
                    className="w-6 bg-green-500 rounded-b"
                    style={{ height: `${(day.users / 20) * 100}px` }}
                    title={`${day.users} users`}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1 rotate-45 transform origin-left">
                  {new Date(day.date).getDate()}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Surveys</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Active Users</span>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Score</h3>
          <div className="space-y-4">
            {analytics.chartData.scoreDistribution.map((item) => (
              <div key={item.class} className="flex items-center gap-3">
                <div className="w-12 text-center">
                  <span className={`inline-block w-8 h-8 rounded-full text-white text-sm font-semibold leading-8 ${
                    item.class === 'A' ? 'bg-green-500' :
                    item.class === 'B' ? 'bg-blue-500' :
                    item.class === 'C' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {item.class}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Score {item.class}</span>
                    <span className="text-sm text-gray-500">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${
                        item.class === 'A' ? 'bg-green-500' :
                        item.class === 'B' ? 'bg-blue-500' :
                        item.class === 'C' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheme Comparison */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Perbandingan Scheme</h3>
          <div className="space-y-4">
            {analytics.chartData.schemeComparison.map((scheme) => (
              <div key={scheme.scheme} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Scheme {scheme.scheme}</h4>
                  <span className="text-2xl font-bold text-blue-600">{scheme.avgScore}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {scheme.count} surveys • Rata-rata score
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${(scheme.avgScore / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Areas</h3>
          <div className="space-y-3">
            {analytics.chartData.topPerformers.map((area, index) => (
              <div key={area.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{area.name}</div>
                  <div className="text-sm text-gray-600">
                    {area.surveys} surveys • Avg: {area.avgScore}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-blue-600">{area.avgScore}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">CPU Usage</div>
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div 
                className="absolute inset-0 bg-blue-500 rounded-full"
                style={{ 
                  background: `conic-gradient(#3B82F6 ${analytics.systemHealth.cpu * 3.6}deg, #E5E7EB 0deg)`,
                  borderRadius: '50%'
                }}
              ></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">{analytics.systemHealth.cpu}%</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Memory</div>
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div 
                className="absolute inset-0 bg-yellow-500 rounded-full"
                style={{ 
                  background: `conic-gradient(#EAB308 ${analytics.systemHealth.memory * 3.6}deg, #E5E7EB 0deg)`,
                  borderRadius: '50%'
                }}
              ></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">{analytics.systemHealth.memory}%</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Disk Space</div>
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div 
                className="absolute inset-0 bg-green-500 rounded-full"
                style={{ 
                  background: `conic-gradient(#22C55E ${analytics.systemHealth.disk * 3.6}deg, #E5E7EB 0deg)`,
                  borderRadius: '50%'
                }}
              ></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">{analytics.systemHealth.disk}%</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Network</div>
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div 
                className="absolute inset-0 bg-purple-500 rounded-full"
                style={{ 
                  background: `conic-gradient(#8B5CF6 ${analytics.systemHealth.network * 3.6}deg, #E5E7EB 0deg)`,
                  borderRadius: '50%'
                }}
              ></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">{analytics.systemHealth.network}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Database Status</div>
              <div className="text-sm text-green-600 capitalize">{analytics.systemHealth.database}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Last Backup</div>
              <div className="text-sm text-gray-600">
                {new Date(analytics.systemHealth.lastBackup).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
