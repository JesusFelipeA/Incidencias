import { decode } from 'base64-arraybuffer';

function rolDelJwt(clave: string): string | null {
  const partes = clave.split('.');
  if (partes.length !== 3) {
    return null;
  }
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const texto = String.fromCharCode(...new Uint8Array(decode(base64)));
    const carga = JSON.parse(texto) as { role?: string };
    return carga.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Impide arrancar la app con datos de ejemplo o con una credencial
 * administrativa. Devuelve el problema encontrado o null si todo es correcto.
 */
export function revisarConfiguracion(url: string, clave: string): string | null {
  if (!/^https:\/\/\S+$/.test(url) || url.includes('TU-PROYECTO')) {
    return 'Falta la URL HTTPS del proyecto en src/config/env.ts.';
  }
  if (!clave || clave.includes('TU_CLAVE')) {
    return 'Falta la clave publicable en src/config/env.ts.';
  }
  if (clave.startsWith('sb_secret_') || rolDelJwt(clave) === 'service_role') {
    return 'La clave configurada es administrativa. Usa la clave publicable.';
  }
  return null;
}
