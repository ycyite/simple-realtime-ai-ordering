'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';

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

  // For sliding indicator animation
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if there's an active restaurant in localStorage
    const restaurantId = localStorage.getItem('activeRestaurantId');
    setHasActiveRestaurant(!!restaurantId);

    // Get user role from localStorage (set when selecting restaurant)
    const role = localStorage.getItem('activeRestaurantRole');
    setUserRole(role);
  }, [pathname]); // Re-check on route change

  // Update sliding indicator position when pathname or role changes
  useEffect(() => {
    if (navRef.current) {
      const activeLink = navRef.current.querySelector(`[href="${pathname}"]`) as HTMLElement;
      if (activeLink) {
        setIndicatorStyle({
          left: activeLink.offsetLeft,
          width: activeLink.offsetWidth,
        });
      }
    }
  }, [pathname, userRole]);

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

            {/* Desktop Navigation with Sliding Indicator */}
            <div className="hidden md:flex relative" ref={navRef}>
              {/* Animated sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 transition-all duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  backgroundColor: '#FFB975',
                }}
              />

              <div className="flex space-x-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-out cursor-pointer relative ${
                      pathname === link.href
                        ? 'transform scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      color: pathname === link.href ? '#FFB975' : '#F2E4D6',
                      backgroundColor: pathname === link.href
                        ? 'rgba(255, 185, 117, 0.15)'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (pathname !== link.href) {
                        e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pathname !== link.href) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      } else {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.15)';
                      }
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden space-x-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ease-out cursor-pointer ${
                    pathname === link.href
                      ? 'transform scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    color: pathname === link.href ? '#FFB975' : '#F2E4D6',
                    backgroundColor: pathname === link.href
                      ? 'rgba(255, 185, 117, 0.15)'
                      : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Switch Restaurant Button */}
            {hasActiveRestaurant && (
              <button
                onClick={switchRestaurant}
                className="px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ease-out hover:scale-105"
                style={{
                  backgroundColor: 'rgba(242, 228, 214, 0.1)',
                  color: '#F2E4D6',
                  border: '1px solid rgba(242, 228, 214, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(242, 228, 214, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(242, 228, 214, 0.2)';
                }}
                title="Switch restaurant"
              >
                <span className="hidden sm:inline">Switch</span>
                <span className="inline sm:hidden">⇄</span>
              </button>
            )}

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
                  className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ease-out hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(242, 228, 214, 0.1)',
                    color: '#F2E4D6',
                    border: '1px solid rgba(242, 228, 214, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 185, 117, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(242, 228, 214, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(242, 228, 214, 0.2)';
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
