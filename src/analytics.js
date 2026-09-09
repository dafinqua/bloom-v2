// analytics.js
// Minimal, anonymous usage analytics for Bloom. No PII, no medical data, ever.
//
// What is collected: an anonymous_id (random, device-local, not linked to any account),
// a session_id (random, in-memory only, new every app launch), an event_name
// ('app_open' or 'screen_view'), a screen id (from a closed whitelist below), and platform.
// That is the entire payload. Nothing else is ever sent.

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

const ANON_ID_KEY = 'bloom_anonymous_id';

// Closed whitelist of screen ids — matches the app's internal tab ids exactly.
// trackScreen() silently ignores anything not in this list, so no dynamic/user
// content can ever be sent as a "screen name" by accident.
const ALLOWED_SCREENS = new Set([
  'home','cat_pregnancy','cat_birth','cat_postbirth','w','c','stages','water','warning',
  'triage','spinning','bp','bf','bf_trouble','bf_food','bf_guide','induction',
  'induction_methods','rights','cl','cx','postpartum','postpartum_emotions','baby',
  'baby_reflex','baby_tracking','baby_pee','tools','wallet','postterm','nightchat',
  'booking','names','coupons','birthtypes','hospitals','birthtools','birthtools_oils',
  'birthtools_massage','birthtools_pressure','birthprep','j','ai'
]);

const platform = Capacitor.isNativePlatform() ? 'android' : 'web';

// session_id: new random value per app launch, kept in memory only (never persisted).
const sessionId = crypto.randomUUID();

let anonymousIdPromise = null;

async function getAnonymousId() {
  if (anonymousIdPromise) return anonymousIdPromise;
  anonymousIdPromise = (async () => {
    try {
      const { value } = await Preferences.get({ key: ANON_ID_KEY });
      if (value) return value;
      const fresh = crypto.randomUUID();
      await Preferences.set({ key: ANON_ID_KEY, value: fresh });
      return fresh;
    } catch (e) {
      // Storage unavailable for some reason — fall back to an in-memory-only id
      // rather than failing analytics entirely. Worst case: undercounts unique users.
      return crypto.randomUUID();
    }
  })();
  return anonymousIdPromise;
}

async function logEvent(event_name, screen) {
  try {
    const anonymous_id = await getAnonymousId();
    await supabase.from('analytics_events').insert({
      anonymous_id,
      session_id: sessionId,
      event_name,
      screen: screen || null,
      platform,
    });
  } catch (e) {
    // Analytics must never break the app or surface errors to the user.
    console.error('[Bloom analytics] failed to log event', e);
  }
}

let appOpenLogged = false;
export function logAppOpen() {
  if (appOpenLogged) return; // once per app launch only
  appOpenLogged = true;
  logEvent('app_open');
}

let lastScreen = null;
export function trackScreen(screenId) {
  if (!ALLOWED_SCREENS.has(screenId)) return; // silently ignore anything not whitelisted
  if (screenId === lastScreen) return; // don't double-log the same screen twice in a row
  lastScreen = screenId;
  logEvent('screen_view', screenId);
}
