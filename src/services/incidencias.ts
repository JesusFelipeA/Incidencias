import { supabase } from '../lib/supabase';
import { eliminarFoto, obtenerUrlsFirmadas, subirFoto } from './almacenamiento';
import { aErrorApp, ErrorApp } from './errores';
import { FotoValidada } from './validacionImagen';

export type Prioridad = 'baja' | 'media' | 'alta';

export type DatosIncidencia = {
  titulo: string;
  descripcion: string;
  ubicacion: string;
  prioridad: Prioridad;
};

export type Incidencia = DatosIncidencia & {
  id: string;
  estado: string;
  imagen_path: string;
  imagen_mime: string;
  imagen_bytes: number;
  creada_en: string;
  urlMiniatura?: string;
};

export type EtapaCarga = 'subiendo' | 'guardando';

export function validarDatos(datos: DatosIncidencia): string | null {
  if (datos.titulo.trim().length < 3) {
    return 'El título debe tener al menos 3 caracteres.';
  }
  if (datos.ubicacion.trim().length < 2) {
    return 'Indica la ubicación de la incidencia.';
  }
  if (datos.descripcion.trim().length < 5) {
    return 'Describe el problema con al menos 5 caracteres.';
  }
  return null;
}

export async function crearIncidencia(
  datos: DatosIncidencia,
  foto: FotoValidada,
  usuarioId: string,
  alCambiarEtapa: (etapa: EtapaCarga) => void = () => {},
): Promise<Incidencia> {
  const problema = validarDatos(datos);
  if (problema) {
    throw new ErrorApp('desconocido', problema);
  }

  alCambiarEtapa('subiendo');
  const ruta = await subirFoto(foto, usuarioId);

  alCambiarEtapa('guardando');
  const { data, error } = await supabase
    .from('incidencias')
    .insert({
      usuario_id: usuarioId,
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      ubicacion: datos.ubicacion.trim(),
      prioridad: datos.prioridad,
      imagen_path: ruta,
      imagen_mime: foto.mime,
      imagen_bytes: foto.bytes,
      imagen_ancho: foto.ancho,
      imagen_alto: foto.alto,
    })
    .select()
    .single();

  if (error) {
    // Sin registro, el archivo quedaría huérfano en el bucket.
    await eliminarFoto(ruta).catch(() => undefined);
    throw aErrorApp(error);
  }
  return data as Incidencia;
}

export async function listarIncidencias(): Promise<Incidencia[]> {
  const { data, error } = await supabase
    .from('incidencias')
    .select(
      'id, titulo, descripcion, ubicacion, prioridad, estado, imagen_path, imagen_mime, imagen_bytes, creada_en',
    )
    .order('creada_en', { ascending: false })
    .limit(50);
  if (error) {
    throw aErrorApp(error);
  }
  const incidencias = (data ?? []) as Incidencia[];
  const urls = await obtenerUrlsFirmadas(incidencias.map(i => i.imagen_path));
  return incidencias.map(i => ({
    ...i,
    urlMiniatura: urls.get(i.imagen_path),
  }));
}
