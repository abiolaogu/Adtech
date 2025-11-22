import { useQuery } from '@tanstack/react-query';
import { campaignsAPI } from '../lib/api';
import { Plus, Play, Pause, Edit } from 'lucide-react';

export default function Campaigns() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.list().then(res => res.data)
  });

  if (isLoading) {
    return <div>Loading campaigns...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-2 text-gray-600">
            Manage your advertising campaigns
          </p>
        </div>
        <button className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Create Campaign
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Campaign Name
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Budget
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Spent
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Impressions
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  CTR
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns?.map((campaign: any) => {
                const ctr = campaign.impressions > 0
                  ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                  : '0.00';

                return (
                  <tr key={campaign.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{campaign.name}</td>
                    <td className="py-3 px-4">{campaign.type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">${campaign.budget.toFixed(2)}</td>
                    <td className="py-3 px-4">${campaign.spent.toFixed(2)}</td>
                    <td className="py-3 px-4">{campaign.impressions.toLocaleString()}</td>
                    <td className="py-3 px-4">{ctr}%</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          {campaign.status === 'ACTIVE' ? (
                            <Pause className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Play className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {campaigns?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No campaigns yet. Create your first campaign!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
