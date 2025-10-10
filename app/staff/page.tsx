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
            onClick={() => router.push('/staff/invites')}
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
    </div>
  );
}
