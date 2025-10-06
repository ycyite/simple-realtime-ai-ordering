'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { RestaurantSettings } from '@/types';

const defaultSettings: RestaurantSettings = {
  id: '1',
  name: '',
  phone: '',
  address: '',
  aiPrompt: '',
  welcomeMessage: '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<RestaurantSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(settings);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Settings</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Edit Settings
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Welcome Message
                </label>
                <textarea
                  required
                  value={formData.welcomeMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, welcomeMessage: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What the AI says when answering the phone..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Prompt / Instructions
                </label>
                <textarea
                  required
                  value={formData.aiPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, aiPrompt: e.target.value })
                  }
                  rows={8}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Instructions for how the AI should behave during calls..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  This prompt guides the AI's behavior during phone calls. Be specific about
                  tone, order confirmation process, and how to handle special requests.
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Restaurant Name</dt>
                  <dd className="mt-1 text-lg text-gray-900">{settings.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                  <dd className="mt-1 text-lg text-gray-900">{settings.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-lg text-gray-900">{settings.address}</dd>
                </div>
              </dl>
            </div>

            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                AI Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Welcome Message</dt>
                  <dd className="mt-1 text-gray-900 bg-gray-50 p-3 rounded">
                    {settings.welcomeMessage}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">AI Prompt</dt>
                  <dd className="mt-1 text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {settings.aiPrompt}
                  </dd>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Integration Info
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <span className="font-medium">Restaurant ID:</span> {settings.id}
                </p>
                <p className="text-sm text-blue-700">
                  Use this ID when configuring the backend to link phone calls to this
                  restaurant's settings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
