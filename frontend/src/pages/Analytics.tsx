import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-600">
          Platform performance and insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Campaign Performance
          </h3>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Chart will render here</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trends
          </h3>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Chart will render here</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Key Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">$0</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Impressions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average CTR</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average CPM</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">$0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
