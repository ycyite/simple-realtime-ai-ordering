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
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeRestaurantRole');
    }
    return null;
  });
  const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);

  // For sliding indicator animation
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const restaurantMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if there's an active restaurant in localStorage
    const restaurantId = localStorage.getItem('activeRestaurantId');
    const restaurantNameStored = localStorage.getItem('activeRestaurantName');
    setHasActiveRestaurant(!!restaurantId);
    setRestaurantName(restaurantNameStored || '');

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
          opacity: 1, // Make visible after first calculation
        });
      }
    }
  }, [pathname, userRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (restaurantMenuRef.current && !restaurantMenuRef.current.contains(event.target as Node)) {
        setShowRestaurantMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/signin');
  };

  const handleSwitchRestaurant = () => {
    localStorage.removeItem('activeRestaurantId');
    localStorage.removeItem('activeRestaurantName');
    localStorage.removeItem('activeRestaurantRole');
    setShowRestaurantMenu(false);
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

            {/* Restaurant Name Dropdown */}
            {hasActiveRestaurant && restaurantName && (
              <div className="relative" ref={restaurantMenuRef}>
                <button
                  onClick={() => setShowRestaurantMenu(!showRestaurantMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-out cursor-pointer hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(255, 185, 117, 0.2)',
                    color: '#FFB975',
                    border: '1px solid rgba(255, 185, 117, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 185, 117, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 185, 117, 0.3)';
                  }}
                >
                  <span className="hidden sm:inline">{restaurantName}</span>
                  <span className="inline sm:hidden">{restaurantName.substring(0, 10)}{restaurantName.length > 10 ? '...' : ''}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${showRestaurantMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showRestaurantMenu && (
                  <div
                    className="absolute top-full mt-2 left-0 min-w-[200px] rounded-lg shadow-xl z-50 overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(23, 77, 90, 0.95)',
                      border: '1px solid rgba(242, 228, 214, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <button
                      onClick={handleSwitchRestaurant}
                      className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-200 cursor-pointer"
                      style={{ color: '#F2E4D6' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.2)';
                        e.currentTarget.style.color = '#FFB975';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#F2E4D6';
                      }}
                    >
                      🔄 Switch Restaurant
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Navigation with Sliding Indicator */}
            <div className="hidden md:flex relative" ref={navRef}>
              {/* Animated sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 transition-all duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  backgroundColor: '#FFB975',
                  opacity: indicatorStyle.opacity,
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
