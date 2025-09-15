// Service Worker para SUNCAR PWA
const CACHE_NAME = 'suncar-admin-v1'
const STATIC_CACHE_URLS = [
  '/',
  '/brigadas',
  '/materiales',
  '/trabajadores',
  '/reportes',
  '/clientes',
  '/atencion-cliente',
  '/manifest.json'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error)
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete')
        return self.clients.claim()
      })
  )
})

// Intercepción de peticiones de red
self.addEventListener('fetch', (event) => {
  // Estrategia Network First para las APIs
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es válida, clonamos y guardamos en cache
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          // Si no hay red, intentamos servir desde cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse
              }
              // Si no hay cache, devolvemos una respuesta offline básica
              return new Response(
                JSON.stringify({
                  error: 'Sin conexión',
                  message: 'Esta funcionalidad requiere conexión a internet',
                  offline: true
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              )
            })
        })
    )
  }
  // Estrategia Cache First para recursos estáticos
  else {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(event.request)
            .then((response) => {
              // Si la respuesta es válida, la guardamos en cache
              if (response && response.status === 200) {
                const responseClone = response.clone()
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone)
                  })
              }
              return response
            })
        })
        .catch(() => {
          // Para páginas HTML, servimos una página offline básica
          if (event.request.destination === 'document') {
            return caches.match('/')
          }
          return new Response('Recurso no disponible sin conexión', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
    )
  }
})

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Notificaciones push (para futuras implementaciones)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver detalles',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/icons/icon-96x96.png'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})