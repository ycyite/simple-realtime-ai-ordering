'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/signin');
  };

  const links = [
    { href: '/orders', label: 'Orders' },
    { href: '/menu', label: 'Menu' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="glass border-b border-opacity-20 shadow-lg" style={{ borderColor: '#F2E4D6' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 sm:space-x-8">
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2" style={{ color: '#F2E4D6' }}>
              <img src="/icons/bell-light.png" alt="" className="w-6 h-6 sm:w-8 sm:h-8" />
              Counter Bell
            </h1>
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
