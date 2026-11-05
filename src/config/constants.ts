export const BUCKET = 'incidencias-fotos';

/** Deben coincidir con la configuración del bucket en supabase/schema.sql. */
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export const FORMATOS_PERMITIDOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type MimePermitido = keyof typeof FORMATOS_PERMITIDOS;

/** Vigencia de cada URL firmada, en segundos. */
export const VIGENCIA_URL_SEGUNDOS = 600;

/** Tiempo máximo de espera de una petición de red. */
export const TIEMPO_ESPERA_MS = 45000;
