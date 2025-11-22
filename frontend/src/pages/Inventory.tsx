import { useQuery } from '@tanstack/react-query';
import { inventoryAPI } from '../lib/api';
import { Plus, TrendingUp } from 'lucide-react';

export default function Inventory() {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', 'available'],
    queryFn: () => inventoryAPI.available({}).then(res => res.data)
  });

  if (isLoading) {
    return <div>Loading inventory...</div>;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return 'bg-blue-100 text-blue-800';
      case 'MOVIE':
      case 'VIDEO':
        return 'bg-purple-100 text-purple-800';
      case 'DISPLAY':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-2 text-gray-600">
            Manage your ad inventory (email lists, movie placements, etc.)
          </p>
        </div>
        <button className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory?.map((item: any) => (
          <div key={item.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.name}
                </h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getTypeColor(item.type)}`}>
                  {item.type}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {item.description && (
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Slots</span>
                <span className="font-medium">{item.totalSlots}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Available</span>
                <span className="font-medium text-green-600">
                  {item.availableSlots}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Floor Price</span>
                <span className="font-medium">
                  ${item.floorPrice} {item.currency}
                </span>
              </div>

              {item.type === 'EMAIL' && item.emailListSize && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">List Size</span>
                  <span className="font-medium">
                    {item.emailListSize.toLocaleString()}
                  </span>
                </div>
              )}

              {item.publisher && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600">Publisher</span>
                  <span className="font-medium">{item.publisher.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button className="w-full btn btn-secondary text-sm">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {inventory?.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            No inventory available. Add your first inventory item!
          </p>
        </div>
      )}
    </div>
  );
}
