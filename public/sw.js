self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
      data: { url: data.url || '/inicio' },
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const destino = event.notification.data?.url;
  const url = typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//') ? destino : '/inicio';
  event.waitUntil(clients.openWindow(url));
});
