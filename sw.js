// Writer Bro no longer uses a service worker. This file only self-disables older registrations.
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.registration.unregister().then(() => self.clients.matchAll()).then(cs => Promise.all(cs.map(c => c.navigate(c.url))))));
