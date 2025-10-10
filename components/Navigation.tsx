'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hasActiveRestaurant, setHasActiveRestaurant] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('activeRestaurantId');
    }
    return false;
  });
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeRestaurantRole');
    }
    return null;
  });

  useEffect(() => {
    // Check if there's an active restaurant in localStorage
    const restaurantId = localStorage.getItem('activeRestaurantId');
    setHasActiveRestaurant(!!restaurantId);

    // Get user role from localStorage (set when selecting restaurant)
    const role = localStorage.getItem('activeRestaurantRole');
    setUserRole(role);
  }, [pathname]); // Re-check on route change

  const handleLogout = () => {
    logout();
    router.push('/signin');
  };

  const switchRestaurant = () => {
    localStorage.removeItem('activeRestaurantId');
    localStorage.removeItem('activeRestaurantRole');
    router.push('/restaurants');
  };

  // Define links based on user role
  const links = [];

  // Everyone can see Orders
  links.push({ href: '/orders', label: 'Orders' });

  // Managers and Owners can see Menu
  if (userRole === 'manager' || userRole === 'owner') {
    links.push({ href: '/menu', label: 'Menu' });
  }

  // Managers and Owners can see Staff
  if (userRole === 'manager' || userRole === 'owner') {
    links.push({ href: '/staff', label: 'Staff' });
  }

  // Everyone can see Settings (but managers will have limited access)
  links.push({ href: '/settings', label: 'Settings' });

  return (
    <nav className="glass border-b border-opacity-20 shadow-lg" style={{ borderColor: '#F2E4D6' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 sm:space-x-8">
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2" style={{ color: '#F2E4D6' }}>
              <img src="/icons/bell-light.png" alt="" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="hidden sm:inline">Counter Bell</span>
            </h1>

            {/* Back to Restaurants */}
            {hasActiveRestaurant && (
              <button
                onClick={switchRestaurant}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-opacity-20"
                style={{ backgroundColor: 'rgba(242, 228, 214, 0.1)', color: '#F2E4D6' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.1)';
                }}
                title="Back to restaurants"
              >
                ←
              </button>
            )}
            <div className="hidden md:flex space-x-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    pathname === link.href
                      ? 'shadow-lg'
                      : 'hover:bg-opacity-20'
                  }`}
                  style={pathname === link.href
                    ? { backgroundColor: '#FFB975', color: '#174D5A' }
                    : { color: '#F2E4D6' }
                  }
                  onMouseEnter={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {/* Mobile Navigation */}
            <div className="flex md:hidden space-x-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    pathname === link.href
                      ? 'shadow-lg'
                      : 'hover:bg-opacity-20'
                  }`}
                  style={pathname === link.href
                    ? { backgroundColor: '#FFB975', color: '#174D5A' }
                    : { color: '#F2E4D6' }
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold" style={{ color: '#F2E4D6' }}>
                    {user.name}
                  </p>
                  <p className="text-xs" style={{ color: '#FFB975' }}>
                    {user.email || user.phone}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-opacity-20 cursor-pointer"
                  style={{ backgroundColor: 'rgba(242, 228, 214, 0.1)', color: '#F2E4D6' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.1)';
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
