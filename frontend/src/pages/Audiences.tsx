import { useState } from 'react';
import { Plus, Users } from 'lucide-react';

export default function Audiences() {
  const [audiences] = useState([]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audiences</h1>
          <p className="mt-2 text-gray-600">
            Create and manage customer segments
          </p>
        </div>
        <button className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Create Audience
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audiences.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Audiences Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first audience segment to target specific customer groups
            </p>
            <button className="btn btn-primary">
              Create Your First Audience
            </button>
          </div>
        ) : (
          audiences.map((audience: any) => (
            <div key={audience.id} className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {audience.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {audience.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-600">
                  {audience.size.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">members</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
