'use client';
import { apiFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

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

export default function StaffPage() {
  return (
    <ProtectedRoute>
      <Navigation />
      <StaffContent />
    </ProtectedRoute>
  );
}

function StaffContent() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Codes Modal State
  const [showInviteCodesModal, setShowInviteCodesModal] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
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

    console.log('Fetching staff from /api/staff...');
    apiFetch('/api/staff')
      .then(res => {
        console.log('Staff API response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Staff API data:', data);
        if (Array.isArray(data)) {
          console.log('Setting staff array with', data.length, 'members');
          setStaff(data);
        } else {
          console.error('Staff API did not return an array:', data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load staff:', err);
        setLoading(false);
      });
  }, []);

  const loadStaff = () => {
    apiFetch('/api/staff')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStaff(data);
        }
      })
      .catch(err => {
        console.error('Failed to load staff:', err);
      });
  };

  const deleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to remove ${staffName} from the team?`)) {
      return;
    }

    try {
      const res = await apiFetch('/api/staff', {
        method: 'DELETE',
        body: JSON.stringify({ staffUserId: staffId })
      });

      const data = await res.json();

      if (res.ok) {
        loadStaff();
      } else {
        alert(data.error || 'Failed to remove staff member');
      }
    } catch (err) {
      console.error('Failed to delete staff:', err);
      alert('Failed to remove staff member');
    }
  };

  // Invite Codes Functions
  const loadInviteCodes = () => {
    setLoadingInvites(true);
    apiFetch('/api/invite-codes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInviteCodes(data);
        }
        setLoadingInvites(false);
      })
      .catch(err => {
        console.error('Failed to load invite codes:', err);
        setLoadingInvites(false);
      });
  };

  const handleOpenInviteCodesModal = () => {
    setShowInviteCodesModal(true);
    loadInviteCodes();
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
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInviteRoleBadgeColor = (role: string) => {
    return role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-white">Loading staff members...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Staff Management</h1>
            <div className="text-sm text-white mt-1">
              {staff.length} team {staff.length === 1 ? 'member' : 'members'}
            </div>
          </div>
          <button
            onClick={handleOpenInviteCodesModal}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ease-out hover:scale-105 cursor-pointer whitespace-nowrap"
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
            Manage Invite Codes
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {member.name}
                    </div>
                    <div className="md:hidden text-xs text-gray-500 mt-1">{member.email}</div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(member.joinedAt)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteStaff(member.id, member.name)}
                      className="px-3 py-1.5 text-sm font-semibold rounded transition-colors cursor-pointer"
                      style={{ color: '#EF4444' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {staff.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No staff members found
            </div>
          )}
        </div>
      </div>

      {/* Invite Codes Modal */}
      {showInviteCodesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-50 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Invite Codes</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-2">Manage one-time invite codes for your team</p>
              </div>
              <button
                onClick={() => setShowInviteCodesModal(false)}
                className="p-2 rounded-lg transition-colors cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="mb-6 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ease-out hover:scale-105 cursor-pointer"
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

            {loadingInvites ? (
              <div className="text-center py-12 text-gray-600">Loading invite codes...</div>
            ) : inviteCodes.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center text-gray-500">
                No active invite codes. Create one to invite team members!
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inviteCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <code className="text-xs sm:text-sm font-mono bg-gray-100 px-2 py-1 rounded break-all">{code.code}</code>
                            <button
                              onClick={() => copyToClipboard(code.code)}
                              className="px-2 py-1 text-xs font-semibold rounded transition-colors cursor-pointer self-start sm:self-auto"
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
                          <div className="sm:hidden mt-2 space-y-1">
                            <div>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInviteRoleBadgeColor(code.role)}`}>
                                {code.role}
                              </span>
                            </div>
                            <div className="md:hidden text-xs text-gray-500">
                              By: {code.created_by.name}
                            </div>
                            <div className="lg:hidden text-xs text-gray-500">
                              Expires: {code.expires_at ? formatDate(code.expires_at) : 'Never'}
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInviteRoleBadgeColor(code.role)}`}>
                            {code.role}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{code.created_by.name}</div>
                          <div className="text-xs text-gray-500">{code.created_by.email}</div>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {code.expires_at ? formatDate(code.expires_at) : 'Never'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
          </div>
        </div>
      )}

      {/* Create Invite Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
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
  );
}
