import { API_BASE_URL, readToken } from '@/lib/api';
import { ingestPusherPayload } from './liveRatesStore';

const AUTH_URL = import.meta.env.VITE_BROADCAST_AUTH_URL || `${API_BASE_URL}/broadcasting/auth`;

/**
 * Signs private channels with the token current at subscribe time. The
 * connection is opened for prices before sign-in, so headers fixed when Echo
 * was created would carry no token (or the previous user's).
 */
const authorizer = (channel) => ({
  authorize: (socketId, callback) => {
    fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${readToken() || ''}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`auth ${response.status}`))))
      .then((data) => callback(null, data))
      .catch((error) => callback(error, null));
  },
});

/**
 * One Echo connection and one subscription to the public `currencies`
 * channel, for the lifetime of the page.
 *
 * The channel is never torn down when a component unmounts — only the
 * callback is removed. React's Strict Mode mounts, unmounts and remounts
 * every component in development, and a subscription that unsubscribed on
 * cleanup would leave the price feed dead after the first remount.
 */

const CHANNEL = 'currencies';
const EVENT = 'CurrencyRateUpdated';

const debug = (...args) => {
  if (import.meta.env.DEV && localStorage.getItem('debugSocket') === '1') {
    console.log('[socket]', ...args);
  }
};

class SocketManager {
  constructor() {
    this.echo = null;
    this.callbacks = new Set();
    this.isConnected = false;
    this.channelBound = false;
    this.initPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 8;
    this.lastEventAt = null;
    this.onlineUserId = null;
    this.onlineJoined = null;
  }

  async initialize() {
    if (this.echo) return true;
    if (this.initPromise) return this.initPromise;

    const key = import.meta.env.VITE_PUSHER_KEY;
    if (!key) {
      console.warn('[socket] VITE_PUSHER_KEY is not set — live prices are disabled.');
      return false;
    }

    this.initPromise = (async () => {
      try {
        // Imported lazily so the Pusher client is not in the bundle that the
        // login screen has to download.
        const { default: Echo } = await import('laravel-echo');
        const Pusher = await import('pusher-js');
        window.Pusher = Pusher.default;

        this.echo = new Echo({
          broadcaster: 'pusher',
          key,
          cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'eu',
          forceTLS: true,
          enabledTransports: ['ws', 'wss'],
          authorizer,
        });

        const pusher = this.echo.connector?.pusher;
        if (pusher) {
          pusher.connection.bind('state_change', (states) => {
            this.isConnected = states?.current === 'connected';
            debug('state', states);
          });
          pusher.connection.bind('error', (error) => console.warn('[socket] pusher error', error));
        }

        this.isConnected = true;
        this.reconnectAttempts = 0;
        return true;
      } catch (error) {
        console.warn('[socket] init failed', error);
        this.echo = null;
        this.isConnected = false;
        this.scheduleReconnect();
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30000);
    setTimeout(async () => {
      this.channelBound = false;
      this.onlineJoined = null;
      if (await this.initialize()) {
        this.ensureChannelBound();
        this.ensureOnlineChannel();
      }
    }, delay);
  }

  /**
   * `private-online.{id}` exists only so Pusher can tell the backend this
   * client is connected (webhook occupied / vacated drives the CRM's online
   * status). Nothing is listened to on it. Several tabs share one channel;
   * the client goes offline when the last one closes.
   */
  ensureOnlineChannel() {
    if (!this.echo || this.onlineJoined === this.onlineUserId) return;
    if (this.onlineJoined != null) this.echo.leave(`online.${this.onlineJoined}`);
    if (this.onlineUserId != null) this.echo.private(`online.${this.onlineUserId}`);
    this.onlineJoined = this.onlineUserId;
    debug('online channel', this.onlineJoined);
  }

  async joinOnline(userId) {
    this.onlineUserId = userId ?? null;
    if (await this.initialize()) this.ensureOnlineChannel();
  }

  leaveOnline() {
    this.onlineUserId = null;
    this.ensureOnlineChannel();
  }

  /** leave the price channel (tab hidden / client idle): Pusher stops sending, and billing, to this tab */
  pauseRates() {
    this.ratesPaused = true;
    if (this.echo && this.channelBound) {
      try {
        this.echo.leave(CHANNEL);
      } catch {
        // already left
      }
    }
    this.channelBound = false;
    debug('price channel paused');
  }

  async resumeRates() {
    this.ratesPaused = false;
    if (await this.initialize()) this.ensureChannelBound();
    debug('price channel resumed');
  }

  ensureChannelBound() {
    if (!this.echo || this.channelBound || this.ratesPaused) return;

    const channel = this.echo.channel(CHANNEL);

    const onRateEvent = (payload) => {
      this.lastEventAt = Date.now();
      ingestPusherPayload(payload);
      this.callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.warn('[socket] subscriber threw', error);
        }
      });
    };

    // Laravel's broadcastAs() prefixes the event with a dot. Both forms are
    // bound because the backend has shipped it each way.
    channel.listen(`.${EVENT}`, onRateEvent);
    channel.listen(EVENT, onRateEvent);

    this.channelBound = true;
    debug('bound to', CHANNEL);
  }

  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    this.callbacks.add(callback);

    (async () => {
      if (await this.initialize()) this.ensureChannelBound();
    })();

    // Only the callback goes. The channel stays.
    return () => this.callbacks.delete(callback);
  }

  disconnect() {
    this.callbacks.clear();
    this.channelBound = false;
    this.onlineUserId = null;
    this.onlineJoined = null;
    if (this.echo) {
      try {
        this.echo.leave(CHANNEL);
        this.echo.disconnect();
      } catch {
        // Already gone.
      }
      this.echo = null;
    }
    this.isConnected = false;
  }

  status() {
    return {
      connected: this.isConnected,
      bound: this.channelBound,
      subscribers: this.callbacks.size,
      secondsSinceLastEvent: this.lastEventAt ? Math.round((Date.now() - this.lastEventAt) / 1000) : null,
    };
  }
}

const socketManager = new SocketManager();

/** Open the feed without registering a subscriber. */
export const keepCurrencyChannelAlive = () => {
  (async () => {
    if (await socketManager.initialize()) socketManager.ensureChannelBound();
  })();
};

/** Mark the signed-in client online for as long as this page is connected. */
export const joinOnlineChannel = (userId) => socketManager.joinOnline(userId);
export const leaveOnlineChannel = () => socketManager.leaveOnline();

export const pauseCurrencyRates = () => socketManager.pauseRates();
export const resumeCurrencyRates = () => socketManager.resumeRates();

export const subscribeToCurrencyRates = (callback) => socketManager.subscribe(callback);
export const disconnectSocket = () => socketManager.disconnect();
export const getSocketStatus = () => socketManager.status();

export default socketManager;
