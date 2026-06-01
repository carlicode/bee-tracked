import { useEffect, useRef } from 'react';
import axios from 'axios';
import { storage } from '../services/storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function authHeaders(): Record<string, string> {
  const token = storage.getToken();
  const sessionId = storage.getSessionId();
  const username = storage.getUsername();
  const headers: Record<string, string> = {};
  if (token && token !== 'demo-token') headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-Id'] = sessionId;
  if (username) headers['X-User-Id'] = username;
  return headers;
}

/**
 * Solicita permiso y registra suscripción push (best-effort, no bloquea UI).
 */
export function usePushSubscription(enabled: boolean) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!enabled || subscribed.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!API_BASE) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await axios.get<{ success: boolean; publicKey?: string }>(
          `${API_BASE}/api/push/vapid-public-key`,
          { timeout: 10000 }
        );
        if (cancelled || !data.success || !data.publicKey) return;

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        const permission = existing
          ? Notification.permission
          : await Notification.requestPermission();
        if (permission !== 'granted') return;

        const subscription =
          existing ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
          }));

        await axios.post(
          `${API_BASE}/api/push/subscribe`,
          { subscription: subscription.toJSON() },
          { headers: authHeaders(), timeout: 10000 }
        );

        if (!cancelled) subscribed.current = true;
      } catch (err) {
        console.warn('[push] Suscripción falló (non-critical):', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
