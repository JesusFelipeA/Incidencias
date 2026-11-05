import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { TIEMPO_ESPERA_MS } from '../config/constants';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/env';
import { almacenSesion } from './almacenSesion';

export function fetchConTiempoLimite(
  entrada: Parameters<typeof fetch>[0],
  opciones: Parameters<typeof fetch>[1] = {},
): Promise<Response> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_ESPERA_MS);
  opciones.signal?.addEventListener('abort', () => control.abort());
  return fetch(entrada, { ...opciones, signal: control.signal }).finally(() =>
    clearTimeout(temporizador),
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: almacenSesion,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
  global: { fetch: fetchConTiempoLimite },
});

AppState.addEventListener('change', estado => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
