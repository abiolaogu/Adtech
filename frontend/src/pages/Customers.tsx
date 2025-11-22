import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function Customers() {
  const [customers] = useState([]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-gray-600">
            Customer Data Platform - Unified customer profiles
          </p>
        </div>
        <button className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-600">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Active (30d)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">New (7d)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Avg Engagement</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">0%</p>
        </div>
      </div>

      <div className="card">
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No customers yet. Track your first customer event!
            </p>
            <button className="btn btn-primary mt-4">
              View Integration Guide
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Events</th>
                  <th className="text-left py-3 px-4">Last Seen</th>
                  <th className="text-left py-3 px-4">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {/* Customer rows will go here */}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
