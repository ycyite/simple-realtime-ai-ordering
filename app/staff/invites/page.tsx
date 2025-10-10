'use client';
import { apiFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface InviteCode {
  id: string;
  code: string;
  role: string;
  created_at: string;
  expires_at: string | null;
  created_by: {
    name: string;
    email: string;
  };
}

export default function InviteCodesPage() {
  return (
    <ProtectedRoute>
      <Navigation />
      <InviteCodesContent />
    </ProtectedRoute>
  );
}

function InviteCodesContent() {
  const router = useRouter();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCodeRole, setNewCodeRole] = useState('staff');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const restaurantId = localStorage.getItem('activeRestaurantId');
    if (!restaurantId) {
      window.location.href = '/restaurants';
      return;
    }

    loadInviteCodes();
  }, []);

  const loadInviteCodes = () => {
    apiFetch('/api/invite-codes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInviteCodes(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load invite codes:', err);
        setLoading(false);
      });
  };

  const createInviteCode = async () => {
    setCreating(true);
    try {
      const res = await apiFetch('/api/invite-codes', {
        method: 'POST',
        body: JSON.stringify({ role: newCodeRole, expiresInDays })
      });

      if (res.ok) {
        setShowCreateModal(false);
        loadInviteCodes();
      }
    } catch (err) {
      console.error('Failed to create invite code:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteInviteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return;

    try {
      const res = await apiFetch('/api/invite-codes', {
        method: 'DELETE',
        body: JSON.stringify({ codeId })
      });

      if (res.ok) {
        loadInviteCodes();
      }
    } catch (err) {
      console.error('Failed to delete invite code:', err);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Invite Codes</h1>
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Invite Codes</h1>
            <p className="text-gray-600 mt-2">Manage one-time invite codes for your team</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ease-out hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255, 185, 117, 0.9)',
              color: '#174D5A',
              border: '1px solid rgba(255, 185, 117, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.9)';
            }}
          >
            + Create Invite Code
          </button>
        </div>

        {inviteCodes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No active invite codes. Create one to invite team members!
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inviteCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{code.code}</code>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="px-2 py-1 text-xs font-semibold rounded transition-colors cursor-pointer"
                          style={{ color: '#174D5A' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(code.role)}`}>
                        {code.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{code.created_by.name}</div>
                      <div className="text-xs text-gray-500">{code.created_by.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.expires_at ? formatDate(code.expires_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => deleteInviteCode(code.id)}
                        className="px-3 py-1.5 text-sm font-semibold rounded transition-colors cursor-pointer"
                        style={{ color: '#EF4444' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Create Invite Code</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newCodeRole}
                  onChange={(e) => setNewCodeRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Expires In (Days)</label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  min="1"
                  max="90"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for no expiration (not recommended)</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(242, 228, 214, 0.1)',
                    color: '#174D5A',
                    border: '1px solid rgba(242, 228, 214, 0.2)'
                  }}
                  disabled={creating}
                  onMouseEnter={(e) => {
                    if (!creating) {
                      e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createInviteCode}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer"
                  style={{
                    backgroundColor: creating ? 'rgba(255, 185, 117, 0.5)' : 'rgba(255, 185, 117, 0.9)',
                    color: '#174D5A',
                    border: '1px solid rgba(255, 185, 117, 0.3)'
                  }}
                  disabled={creating}
                  onMouseEnter={(e) => {
                    if (!creating) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.9)';
                    }
                  }}
                >
                  {creating ? 'Creating...' : 'Create Code'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
