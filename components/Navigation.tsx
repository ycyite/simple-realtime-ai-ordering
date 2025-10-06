'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/orders', label: 'Orders' },
    { href: '/menu', label: 'Menu' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="glass border-b border-opacity-20 shadow-lg" style={{ borderColor: '#F2E4D6' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold" style={{ color: '#F2E4D6' }}>🍔 Restaurant Portal</h1>
            <div className="flex space-x-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
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
          </div>
        </div>
      </div>
    </nav>
  );
}
