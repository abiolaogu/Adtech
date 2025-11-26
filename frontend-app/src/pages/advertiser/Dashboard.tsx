import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, MousePointerClick, Target, Eye } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import { fetchDashboardMetrics, fetchCampaignPerformance } from '../../services/advertiserApi';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdvertiserDashboard() {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', timeRange],
    queryFn: () => fetchDashboardMetrics(timeRange),
  });

  const { data: campaigns } = useQuery({
    queryKey: ['campaign-performance', timeRange],
    queryFn: () => fetchCampaignPerformance(timeRange),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your advertising performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            + New Campaign
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Impressions"
          value={metrics?.impressions?.toLocaleString() || '0'}
          change={metrics?.impressionsChange || 0}
          icon={<Eye className="w-6 h-6 text-blue-600" />}
          trend={metrics?.impressionsChange > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Clicks"
          value={metrics?.clicks?.toLocaleString() || '0'}
          change={metrics?.clicksChange || 0}
          icon={<MousePointerClick className="w-6 h-6 text-green-600" />}
          trend={metrics?.clicksChange > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Conversions"
          value={metrics?.conversions?.toLocaleString() || '0'}
          change={metrics?.conversionsChange || 0}
          icon={<Target className="w-6 h-6 text-purple-600" />}
          trend={metrics?.conversionsChange > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Total Spend"
          value={`$${metrics?.spend?.toLocaleString() || '0'}`}
          change={metrics?.spendChange || 0}
          icon={<DollarSign className="w-6 h-6 text-yellow-600" />}
          trend={metrics?.spendChange > 0 ? 'up' : 'down'}
          subtitle={`Budget: $${metrics?.budget?.toLocaleString() || '0'}`}
        />
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Campaign Performance</h2>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Impressions</button>
            <button className="px-3 py-1 text-sm border border-blue-600 bg-blue-50 text-blue-600 rounded-lg">Clicks</button>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Conversions</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics?.chartData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="conversions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Campaigns</h2>
          <div className="space-y-4">
            {campaigns?.map((campaign: any) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${campaign.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                    <span>Budget: ${campaign.budget.toLocaleString()}</span>
                    <span>Spent: ${campaign.spent.toLocaleString()}</span>
                    <span>CTR: {campaign.ctr.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {campaign.performance > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <span className={campaign.performance > 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(campaign.performance)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition">
            View All Campaigns
          </button>
        </div>

        {/* Top Performing Creatives */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Creatives</h2>
          <div className="space-y-4">
            {metrics?.topCreatives?.map((creative: any, index: number) => (
              <div key={creative.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded overflow-hidden">
                  <img src={creative.thumbnail} alt={creative.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{creative.name}</p>
                  <p className="text-sm text-gray-600">CTR: {creative.ctr.toFixed(2)}% | Conversions: {creative.conversions}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Performance</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={metrics?.deviceData || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {metrics?.deviceData?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h2>
          <div className="space-y-3">
            {metrics?.topLocations?.map((location: any) => (
              <div key={location.country} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{location.flag}</span>
                  <span className="text-gray-900">{location.country}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${location.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">{location.conversions} conversions</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 text-left bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
              <div className="font-medium">Create Campaign</div>
              <div className="text-sm opacity-75">Start new advertising campaign</div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition">
              <div className="font-medium">Upload Creative</div>
              <div className="text-sm opacity-75">Add new ad creatives</div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition">
              <div className="font-medium">View Reports</div>
              <div className="text-sm opacity-75">Detailed analytics</div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition">
              <div className="font-medium">Billing</div>
              <div className="text-sm opacity-75">Manage payments</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
