import api from '@/lib/api';

/**
 * Heartbeat: the CRM shows a client online only while an open tab keeps
 * pinging. Closing the site stops it, and the backend marks them offline a
 * few minutes later even when the Pusher webhook is not set up.
 */
export const PRESENCE_PING_INTERVAL_MS = 20_000;

export const pingPresence = async () => {
  try {
    await api.post('/users/presence/ping');
  } catch {
    // A missed ping is retried on the next tick; never surface it.
  }
};
