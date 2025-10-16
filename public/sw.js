// Service Worker for handling background notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  // Focus or open the app window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If no window exists, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow('/orders');
      }
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
