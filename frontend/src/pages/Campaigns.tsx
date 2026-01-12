import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsAPI } from '../lib/api';
import { Plus, Play, Pause, Edit, X } from 'lucide-react';

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    budget: 1000,
    type: 'DISPLAY',
    objective: 'AWARENESS',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.list().then(res => res.data)
  });

  const createMutation = useMutation({
    mutationFn: campaignsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setIsModalOpen(false);
      setNewCampaign({
        name: '',
        budget: 1000,
        type: 'DISPLAY',
        objective: 'AWARENESS',
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...newCampaign,
      advertiserId: 'demo-advertiser', // Hardcoded for demo
      userId: 'demo-user', // Hardcoded for demo
      status: 'ACTIVE',
      targeting: {
        geo: ['US'],
        devices: ['mobile', 'desktop']
      }
    });
  };

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
        <button
          className="btn btn-primary flex items-center"
          onClick={() => setIsModalOpen(true)}
        >
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

      {/* Create Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Campaign</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  className="input w-full border p-2 rounded"
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                <input
                  type="number"
                  className="input w-full border p-2 rounded"
                  value={newCampaign.budget}
                  onChange={e => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="input w-full border p-2 rounded"
                  value={newCampaign.type}
                  onChange={e => setNewCampaign({ ...newCampaign, type: e.target.value })}
                >
                  <option value="DISPLAY">Display</option>
                  <option value="VIDEO">Video</option>
                  <option value="NATIVE">Native</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="input w-full border p-2 rounded"
                  value={newCampaign.startDate}
                  onChange={e => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary bg-blue-600 text-white px-4 py-2 rounded"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
