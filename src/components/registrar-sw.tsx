"use client";

import { useEffect } from "react";

/** Registra o service worker (necessário para instalar o app em alguns celulares). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o site continua funcionando normalmente.
    });
  }, []);
  return null;
}
