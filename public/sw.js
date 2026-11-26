// Service worker mínimo da Taverna O Lobby.
// Não guarda dados em cache: o site sempre busca a versão atual (dados em tempo real).
// Existe para tornar o app instalável no celular.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Deixa o navegador tratar todas as requisições normalmente.
});
