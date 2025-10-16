'use client';

interface NotificationPermissionBannerProps {
  onRequestPermission: () => void;
}

export default function NotificationPermissionBanner({ onRequestPermission }: NotificationPermissionBannerProps) {
  return (
    <div className="bg-yellow-600 text-white px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center space-x-3">
        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="font-semibold text-sm sm:text-base">
          Enable notifications to receive alerts when new orders arrive, even when this page is in the background
        </span>
      </div>
      <button
        onClick={onRequestPermission}
        className="px-4 py-2 bg-white text-yellow-600 rounded hover:bg-gray-100 transition font-medium text-sm sm:text-base whitespace-nowrap self-stretch sm:self-auto"
      >
        Enable Notifications
      </button>
    </div>
  );
}
