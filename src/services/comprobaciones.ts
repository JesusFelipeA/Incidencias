import { encode, decode } from 'base64-arraybuffer';
import { BUCKET, TAMANO_MAXIMO_BYTES } from '../config/constants';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/env';
import { supabase } from '../lib/supabase';
import { tipoDeError, TipoError } from './errores';
import { validarFoto } from './validacionImagen';

export type ResultadoComprobacion = {
  nombre: string;
  estado: 'correcto' | 'fallido' | 'inconcluso';
  detalle: string;
};

type Contexto = {
  usuarioId: string;
  token: string;
  rutaOtroUsuario?: string;
};

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const textoABytes = (texto: string) =>
  Uint8Array.from(texto, letra => letra.charCodeAt(0)).buffer as ArrayBuffer;

const esperar = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const correcto = (nombre: string, detalle: string): ResultadoComprobacion => ({
  nombre,
  estado: 'correcto',
  detalle,
});
const fallido = (nombre: string, detalle: string): ResultadoComprobacion => ({
  nombre,
  estado: 'fallido',
  detalle,
});
const inconcluso = (nombre: string, detalle: string): ResultadoComprobacion => ({
  nombre,
  estado: 'inconcluso',
  detalle,
});

const textoError = (e: unknown) => (e as { message?: string })?.message ?? 'sin detalle';

/** Sólo cuenta como correcto si el rechazo es del tipo esperado. */
function evaluarRechazo(
  nombre: string,
  error: unknown,
  esperado: TipoError,
): ResultadoComprobacion {
  const tipo = tipoDeError(error);
  if (tipo === esperado) {
    return correcto(nombre, `Rechazado: ${textoError(error)}`);
  }
  return inconcluso(nombre, `Respuesta no esperada: ${textoError(error)}`);
}

async function estadoHttp(url: string, cabeceras?: Record<string, string>) {
  const respuesta = await fetch(url, { headers: cabeceras });
  return respuesta.status;
}

function evaluarAccesoBloqueado(nombre: string, estado: number) {
  if (estado === 200) {
    return fallido(nombre, 'El archivo se pudo leer sin autorización.');
  }
  if (estado >= 500) {
    return inconcluso(nombre, `El servicio respondió HTTP ${estado}.`);
  }
  return correcto(nombre, `Acceso denegado con HTTP ${estado}.`);
}

function comprobarArchivoDisfrazado(): ResultadoComprobacion {
  const nombre = 'Texto disfrazado de foto.jpg (validación en la app)';
  try {
    validarFoto({
      uri: 'file:///foto.jpg',
      fileName: 'foto.jpg',
      type: 'image/jpeg',
      base64: encode(textoABytes('no soy una imagen')),
    });
    return fallido(nombre, 'El archivo disfrazado fue aceptado.');
  } catch (error) {
    return evaluarRechazo(nombre, error, 'formato');
  }
}

async function comprobarFormatoEnServidor(usuarioId: string) {
  const nombre = 'Formato no permitido enviado directo al bucket';
  const ruta = `${usuarioId}/pruebas/no-permitido.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, textoABytes('prueba'), {
      contentType: 'text/plain',
    });
  if (!error) {
    await supabase.storage.from(BUCKET).remove([ruta]);
    return fallido(nombre, 'El bucket aceptó text/plain.');
  }
  return evaluarRechazo(nombre, error, 'formato');
}

async function comprobarTamanoEnServidor(usuarioId: string) {
  const nombre = 'Archivo mayor a 5 MB enviado directo al bucket';
  const ruta = `${usuarioId}/pruebas/excedido.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, new ArrayBuffer(TAMANO_MAXIMO_BYTES + 1024), {
      contentType: 'image/jpeg',
    });
  if (!error) {
    await supabase.storage.from(BUCKET).remove([ruta]);
    return fallido(nombre, 'El bucket aceptó un archivo excedido.');
  }
  return evaluarRechazo(nombre, error, 'tamano');
}

async function comprobarCarpetaAjena() {
  const nombre = 'Subir a la carpeta de otro usuario';
  const ajeno = '00000000-0000-4000-8000-000000000000';
  const ruta = `${ajeno}/pruebas/intruso.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, decode(PNG_1X1), { contentType: 'image/png' });
  if (!error) {
    await supabase.storage.from(BUCKET).remove([ruta]);
    return fallido(nombre, 'Se pudo escribir en una carpeta ajena.');
  }
  return evaluarRechazo(nombre, error, 'autorizacion');
}

async function comprobarRegistroAjeno(usuarioId: string) {
  const nombre = 'Crear una incidencia a nombre de otro usuario';
  const ajeno = '00000000-0000-4000-8000-000000000000';
  const { error } = await supabase.from('incidencias').insert({
    usuario_id: ajeno,
    titulo: 'Prueba de seguridad',
    descripcion: 'Registro que debe rechazarse',
    ubicacion: 'Prueba',
    imagen_path: `${ajeno}/pruebas/${usuarioId}.png`,
    imagen_mime: 'image/png',
    imagen_bytes: 1,
  });
  if (!error) {
    return fallido(nombre, 'La tabla aceptó un usuario ajeno.');
  }
  return evaluarRechazo(nombre, error, 'autorizacion');
}

async function comprobarArchivoPrivado(contexto: Contexto) {
  const resultados: ResultadoComprobacion[] = [];
  const ruta = `${contexto.usuarioId}/pruebas/sonda-${Date.now()}.png`;
  const urlAutenticada = `${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${ruta}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, decode(PNG_1X1), { contentType: 'image/png' });
  if (error) {
    return [
      inconcluso(
        'Archivo de prueba privado',
        `No se pudo crear: ${textoError(error)}`,
      ),
    ];
  }

  try {
    const estadoPropietario = await estadoHttp(urlAutenticada, {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${contexto.token}`,
    });
    resultados.push(
      estadoPropietario === 200
        ? correcto('Control: el propietario sí puede leer', 'HTTP 200.')
        : fallido(
            'Control: el propietario sí puede leer',
            `HTTP ${estadoPropietario}.`,
          ),
    );

    const urlPublica = supabase.storage.from(BUCKET).getPublicUrl(ruta).data
      .publicUrl;
    resultados.push(
      evaluarAccesoBloqueado(
        'Leer el archivo con URL pública',
        await estadoHttp(urlPublica),
      ),
    );
    resultados.push(
      evaluarAccesoBloqueado(
        'Leer el archivo sin sesión de usuario',
        await estadoHttp(urlAutenticada, { apikey: SUPABASE_PUBLISHABLE_KEY }),
      ),
    );

    const firmada = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(ruta, 2);
    if (firmada.error) {
      resultados.push(
        inconcluso('URL firmada vencida', textoError(firmada.error)),
      );
    } else {
      const antes = await estadoHttp(firmada.data.signedUrl);
      await esperar(4000);
      const despues = await estadoHttp(firmada.data.signedUrl);
      if (antes !== 200) {
        resultados.push(
          inconcluso('URL firmada vencida', `Vigente respondió HTTP ${antes}.`),
        );
      } else {
        resultados.push(evaluarAccesoBloqueado('URL firmada vencida', despues));
      }
    }
  } finally {
    await supabase.storage.from(BUCKET).remove([ruta]);
  }
  return resultados;
}

async function comprobarRutaAjena(ruta: string) {
  const nombre = 'Abrir el archivo privado de otra cuenta';
  const { error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ruta.trim(), 60);
  if (!error) {
    return fallido(nombre, 'Se obtuvo una URL para un archivo ajeno.');
  }
  const codigo = tipoDeError(error);
  if (codigo === 'conexion') {
    return inconcluso(nombre, textoError(error));
  }
  return correcto(nombre, `Acceso denegado: ${textoError(error)}`);
}

async function protegida(
  nombre: string,
  accion: () => Promise<ResultadoComprobacion | ResultadoComprobacion[]>,
) {
  try {
    const resultado = await accion();
    return Array.isArray(resultado) ? resultado : [resultado];
  } catch (error) {
    return [inconcluso(nombre, `Sin respuesta: ${textoError(error)}`)];
  }
}

/** Ejecuta intentos reales contra el servicio y explica cada resultado. */
export async function ejecutarComprobaciones(contexto: Contexto) {
  const resultados: ResultadoComprobacion[] = [comprobarArchivoDisfrazado()];
  resultados.push(
    ...(await protegida('Formato en el servidor', () =>
      comprobarFormatoEnServidor(contexto.usuarioId),
    )),
    ...(await protegida('Tamaño en el servidor', () =>
      comprobarTamanoEnServidor(contexto.usuarioId),
    )),
    ...(await protegida('Carpeta ajena', comprobarCarpetaAjena)),
    ...(await protegida('Registro ajeno', () =>
      comprobarRegistroAjeno(contexto.usuarioId),
    )),
    ...(await protegida('Archivo privado', () =>
      comprobarArchivoPrivado(contexto),
    )),
  );
  if (contexto.rutaOtroUsuario?.trim()) {
    const ruta = contexto.rutaOtroUsuario;
    resultados.push(
      ...(await protegida('Archivo de otra cuenta', () =>
        comprobarRutaAjena(ruta),
      )),
    );
  }
  return resultados;
}
