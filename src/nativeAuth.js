// nativeAuth.js
// Handles the OAuth "return to app" step on native Android (Capacitor).
//
// On the web, Supabase reads the access token straight from the browser's URL bar
// (detectSessionInUrl: true). Inside a Capacitor WebView there is no URL bar — instead,
// after Google sign-in completes, Android hands control back to the app via a custom
// URL scheme deep link (com.dafnadoula.bloom://callback). This file listens for that
// deep link and exchanges it for a real Supabase session.
//
// This only runs on native platforms. On web, it does nothing (safe no-op import).

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { supabase } from './supabaseClient';

export const isNative = Capacitor.isNativePlatform();

// The exact redirect Supabase should send the user back to after auth.
// Must be added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs.
export const NATIVE_REDIRECT_URL = 'com.dafnadoula.bloom://callback';

export function getAuthRedirectUrl() {
  return isNative ? NATIVE_REDIRECT_URL : window.location.origin;
}

let listenerAttached = false;

export function initNativeAuthListener(onRecovery) {
  if (!isNative || listenerAttached) return;
  listenerAttached = true;

  CapApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url || url.indexOf(NATIVE_REDIRECT_URL) !== 0) return;
    try {
      const isRecovery = url.indexOf('type=recovery') !== -1;
      // Supabase-js v2 uses the PKCE flow for OAuth by default — the deep link
      // contains a `code` param that must be exchanged for a session.
      if (url.indexOf('code=') !== -1) {
        await supabase.auth.exchangeCodeForSession(url);
      } else {
        // Fallback for older/implicit flow links that carry the tokens directly
        // in the fragment (#access_token=...&refresh_token=...&type=recovery).
        const hash = url.split('#')[1];
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
      }
      if (isRecovery && onRecovery) onRecovery();
    } catch (e) {
      console.error('[Bloom] Native OAuth callback failed:', e);
    }
  });
}
