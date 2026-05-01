// ── Controle de Cartões — Service Worker ──
const CACHE = 'cartoes-v1';

// Arquivos para cache offline
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// Instalar: faz cache dos assets principais
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(cache=>{
      return cache.addAll(ASSETS).catch(()=>{
        // Se algum asset externo falhar (ex: Google Fonts offline), ignora
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// Ativar: limpa caches antigos
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para Firebase/APIs, cache-first para assets locais
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);

  // Deixa Firebase e APIs externas sempre irem para a rede
  if(url.hostname.includes('firebase') ||
     url.hostname.includes('google') ||
     url.hostname.includes('gstatic') ||
     url.hostname.includes('googleapis')){
    return; // fetch normal sem interceptar
  }

  // Para assets locais: network-first com fallback para cache
  e.respondWith(
    fetch(e.request)
      .then(res=>{
        // Atualiza cache com versão mais recente
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(cache=>cache.put(e.request, clone));
        }
        return res;
      })
      .catch(()=>{
        // Offline: serve do cache
        return caches.match(e.request)
          .then(cached=>cached || caches.match('./index.html'));
      })
  );
});
