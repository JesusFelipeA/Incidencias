import { BUCKET, VIGENCIA_URL_SEGUNDOS } from '../config/constants';
import { supabase } from '../lib/supabase';
import { aErrorApp } from './errores';
import { FotoValidada } from './validacionImagen';

/** Nombre único para el archivo. La protección la da RLS, no el nombre. */
export function crearRuta(usuarioId: string, extension: string, fecha = new Date()) {
  const mes = fecha.toISOString().slice(0, 7);
  const sufijo = Math.random().toString(36).slice(2, 10);
  return `${usuarioId}/${mes}/${fecha.getTime()}-${sufijo}.${extension}`;
}

export async function subirFoto(foto: FotoValidada, usuarioId: string) {
  const ruta = crearRuta(usuarioId, foto.extension);
  // La librería indica usar ArrayBuffer en React Native, no Blob ni FormData.
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, foto.contenido, {
      contentType: foto.mime,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    throw aErrorApp(error);
  }
  return data.path;
}

export async function eliminarFoto(ruta: string) {
  await supabase.storage.from(BUCKET).remove([ruta]);
}

export async function obtenerUrlFirmada(ruta: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ruta, VIGENCIA_URL_SEGUNDOS);
  if (error) {
    throw aErrorApp(error);
  }
  return {
    url: data.signedUrl,
    vence: new Date(Date.now() + VIGENCIA_URL_SEGUNDOS * 1000),
  };
}

export async function obtenerUrlsFirmadas(rutas: string[]) {
  if (rutas.length === 0) {
    return new Map<string, string>();
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rutas, VIGENCIA_URL_SEGUNDOS);
  if (error) {
    throw aErrorApp(error);
  }
  const urls = new Map<string, string>();
  data.forEach(item => {
    if (item.path && item.signedUrl) {
      urls.set(item.path, item.signedUrl);
    }
  });
  return urls;
}
