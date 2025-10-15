'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalOrderAlert } from '@/contexts/GlobalOrderAlertContext';
import AlertBanner from './AlertBanner';
import { useState, useEffect, useRef } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { undealtCount, dismissAlert } = useGlobalOrderAlert();
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const restaurantMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (restaurantMenuRef.current && !restaurantMenuRef.current.contains(event.target as Node)) {
        setShowRestaurantMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
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
    setShowMobileMenu(false);
    router.push('/restaurants');
  };

  // Define links based on user role
  const links = [];

  // Everyone can see Orders
  links.push({ href: '/orders', label: 'Orders', icon: '📋' });

  // Managers and Owners can see Menu
  if (userRole === 'manager' || userRole === 'owner') {
    links.push({ href: '/menu', label: 'Menu', icon: '📖' });
  }

  // Managers and Owners can see Staff
  if (userRole === 'manager' || userRole === 'owner') {
    links.push({ href: '/staff', label: 'Staff', icon: '👥' });
  }

  // Everyone can see Settings (but managers will have limited access)
  // Only Owners can see Billing
  if (userRole === 'owner') {
    links.push({ href: '/billing', label: 'Billing', icon: '💰' });
  }

  links.push({ href: '/settings', label: 'Settings', icon: '⚙️' });

  return (
    <>
      {/* Global Alert Banner */}
      <AlertBanner undealtCount={undealtCount} onDismiss={dismissAlert} />

      <nav
      className="relative overflow-visible"
      style={{
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgb(24, 73, 83) 0%, rgb(60, 108, 96) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(242, 228, 214, 0.15)'
      }}
    >
      {/* Static Glass Dome Reflection Layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 30%, transparent 70%)',
          opacity: 0.6,
          mixBlendMode: 'overlay'
        }}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 relative" style={{ zIndex: 1 }}>
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo + Desktop Navigation */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2" style={{ color: '#F2E4D6' }}>
              <img src="/icons/bell-light.png" alt="" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span>Counter Bell</span>
            </h1>

            {/* Desktop Navigation - Now on left side */}
            <div className="hidden md:flex space-x-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 ease-out cursor-pointer"
                  style={{
                    color: pathname === link.href ? '#FFB975' : '#F2E4D6',
                    backgroundColor: pathname === link.href ? 'rgba(255, 185, 117, 0.25)' : 'transparent',
                    fontSize: pathname === link.href ? '0.9375rem' : '0.875rem',
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
                      e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.25)';
                    }
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* User Info - Desktop */}
            {user && (
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold" style={{ color: '#F2E4D6' }}>
                  {user.name}
                </p>
                {hasActiveRestaurant && restaurantName && (
                  <div className="relative flex justify-center" ref={restaurantMenuRef}>
                    <button
                      onClick={() => setShowRestaurantMenu(!showRestaurantMenu)}
                      className="flex items-center justify-center gap-1 px-2 py-1 rounded transition-all duration-200 ease-out cursor-pointer hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(255, 185, 117, 0.2)',
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
                      <span className="text-sm font-semibold" style={{ color: '#FFB975' }}>
                        {restaurantName}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${showRestaurantMenu ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: '#FFB975' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showRestaurantMenu && (
                      <div
                        className="absolute top-full mt-2 right-0 min-w-[200px] rounded-lg overflow-hidden animate-fadeIn"
                        style={{
                          background: 'linear-gradient(135deg, rgba(24, 73, 83, 0.98) 0%, rgba(60, 108, 96, 0.95) 100%)',
                          border: '1px solid rgba(242, 228, 214, 0.25)',
                          backdropFilter: 'blur(16px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
                          zIndex: 99999
                        }}
                      >
                        <button
                          onClick={handleSwitchRestaurant}
                          className="w-full px-4 py-3 text-center text-sm font-medium transition-all duration-200 cursor-pointer"
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
                          Switch Restaurant
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Logout - Desktop */}
            {user && (
              <button
                onClick={handleLogout}
                className="hidden md:block px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-out hover:scale-105 cursor-pointer"
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
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden relative" ref={mobileMenuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: 'rgba(242, 228, 214, 0.1)',
                  color: '#F2E4D6'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Mobile Dropdown Menu */}
              {showMobileMenu && (
                <div
                  className="absolute top-full mt-2 right-0 w-72 sm:w-80 rounded-xl overflow-hidden animate-fadeIn"
                  style={{
                    background: 'linear-gradient(135deg, rgba(24, 73, 83, 0.98) 0%, rgba(60, 108, 96, 0.95) 100%)',
                    border: '1px solid rgba(242, 228, 214, 0.25)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    boxShadow: '0 12px 48px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
                    zIndex: 99999,
                    maxHeight: 'calc(100vh - 80px)',
                    overflowY: 'auto'
                  }}
                >
                  {/* Restaurant Name */}
                  {hasActiveRestaurant && restaurantName && (
                    <div className="px-4 py-3 border-b border-opacity-20" style={{ borderColor: '#F2E4D6' }}>
                      <p className="text-xs font-medium" style={{ color: '#FFB975', opacity: 0.8 }}>Current Restaurant</p>
                      <p className="text-sm font-bold" style={{ color: '#FFB975' }}>{restaurantName}</p>
                    </div>
                  )}

                  {/* User Info */}
                  {user && (
                    <div className="px-4 py-3 border-b border-opacity-20" style={{ borderColor: '#F2E4D6' }}>
                      <p className="text-sm font-semibold" style={{ color: '#F2E4D6' }}>{user.name}</p>
                      <p className="text-xs" style={{ color: '#FFB975', opacity: 0.8 }}>{user.email || user.phone}</p>
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="py-2">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{
                          color: pathname === link.href ? '#FFB975' : '#F2E4D6',
                          backgroundColor: pathname === link.href ? 'rgba(255, 185, 117, 0.2)' : 'transparent'
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
                            e.currentTarget.style.backgroundColor = 'rgba(255, 185, 117, 0.2)';
                          }
                        }}
                      >
                        <span className="text-lg">{link.icon}</span>
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="py-2 border-t border-opacity-20" style={{ borderColor: '#F2E4D6' }}>
                    {hasActiveRestaurant && (
                      <button
                        onClick={handleSwitchRestaurant}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
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
                        <span className="text-lg">🔄</span>
                        <span>Switch Restaurant</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all duration-200 cursor-pointer"
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
                      <span className="text-lg">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
      </nav>
    </>
  );
}
