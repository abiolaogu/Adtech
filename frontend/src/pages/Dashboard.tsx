import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../lib/api';
import { TrendingUp, Users, Package, Megaphone } from 'lucide-react';

export default function Dashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsAPI.overview().then(res => res.data)
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const stats = [
    {
      name: 'Active Campaigns',
      value: overview?.campaigns?.active || 0,
      total: overview?.campaigns?.total || 0,
      icon: Megaphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Publishers',
      value: overview?.publishers || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Inventory Items',
      value: overview?.inventory || 0,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Impressions (24h)',
      value: overview?.impressionsLast24h || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your AdTech/MarTech platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {stat.value}
                  {stat.total && (
                    <span className="text-lg text-gray-500 ml-2">
                      / {stat.total}
                    </span>
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-primary">
            Create Campaign
          </button>
          <button className="btn btn-secondary">
            Add Inventory
          </button>
          <button className="btn btn-secondary">
            Create Audience
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Platform Overview
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Total Customers</span>
            <span className="font-semibold">{overview?.customers || 0}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Active Campaigns</span>
            <span className="font-semibold">{overview?.campaigns?.active || 0}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Recent Impressions</span>
            <span className="font-semibold">{overview?.impressionsLast24h || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
