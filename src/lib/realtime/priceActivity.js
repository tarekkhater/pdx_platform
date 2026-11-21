/**
 * Live prices only while someone is actually looking.
 *
 * Pusher bills every message once per connected browser, so a tab left open in the background, or a
 * client who walked away, kept costing a message per price update all day. The price channel is left
 * when the tab is hidden or there has been no mouse / keyboard / touch / scroll for IDLE_MS, and joined
 * again on the first sign of activity (the latest prices are re-read straight away at that point).
 * The online-presence channel is separate and is not touched.
 */

export const IDLE_MS = 2 * 60 * 1000;
const CHECK_MS = 5 * 1000;
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'];

export const startPriceActivityWatch = ({ onPause, onResume }) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let lastActivity = Date.now();
  let running = true;

  const shouldRun = () => document.visibilityState === 'visible' && Date.now() - lastActivity < IDLE_MS;

  const update = () => {
    const next = shouldRun();
    if (next === running) return;
    running = next;
    if (next) onResume?.();
    else onPause?.();
  };

  // activity: cheap timestamp; resume at once if we were paused
  const onActivity = () => {
    lastActivity = Date.now();
    if (!running) update();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') lastActivity = Date.now();
    update();
  };

  EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
  document.addEventListener('visibilitychange', onVisibility);
  const timer = setInterval(update, CHECK_MS);

  return () => {
    EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(timer);
  };
};
