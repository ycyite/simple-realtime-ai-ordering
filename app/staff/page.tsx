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

    apiFetch('/api/staff')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStaff(data);
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
      <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {staff.length} team {staff.length === 1 ? 'member' : 'members'}
            </div>
            <button
              onClick={() => router.push('/staff/invites')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Invite Codes
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {member.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(member.joinedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteStaff(member.id, member.name)}
                      className="text-red-600 hover:text-red-900"
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
}
