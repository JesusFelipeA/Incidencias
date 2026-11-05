import { decode } from 'base64-arraybuffer';
import {
  FORMATOS_PERMITIDOS,
  MimePermitido,
  TAMANO_MAXIMO_BYTES,
} from '../config/constants';
import { ErrorApp } from './errores';

export type ArchivoSeleccionado = {
  uri?: string;
  base64?: string;
  type?: string;
  fileName?: string;
  width?: number;
  height?: number;
};

export type FotoValidada = {
  uri: string;
  contenido: ArrayBuffer;
  mime: MimePermitido;
  extension: string;
  bytes: number;
  ancho?: number;
  alto?: number;
};

/** Identifica el formato real por los primeros bytes del archivo. */
export function detectarFormato(contenido: ArrayBuffer): string | null {
  const b = new Uint8Array(contenido.slice(0, 12));
  const coincide = (firma: number[], desde = 0) =>
    firma.every((valor, i) => b[desde + i] === valor);

  if (coincide([0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (coincide([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    coincide([0x52, 0x49, 0x46, 0x46]) &&
    coincide([0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
}

const esPermitido = (mime: string): mime is MimePermitido =>
  Object.prototype.hasOwnProperty.call(FORMATOS_PERMITIDOS, mime);

export function validarFoto(archivo: ArchivoSeleccionado): FotoValidada {
  if (!archivo.uri || !archivo.base64) {
    throw new ErrorApp('formato', 'No se pudo leer el archivo seleccionado.');
  }

  const declarado = (archivo.type ?? '').toLowerCase();
  if (!esPermitido(declarado)) {
    throw new ErrorApp(
      'formato',
      `Formato no permitido${
        declarado ? ` (${declarado})` : ''
      }. Usa JPG, PNG o WebP.`,
    );
  }

  const contenido = decode(archivo.base64);
  if (contenido.byteLength === 0) {
    throw new ErrorApp('formato', 'El archivo está vacío.');
  }
  if (contenido.byteLength > TAMANO_MAXIMO_BYTES) {
    throw new ErrorApp(
      'tamano',
      `La imagen pesa ${formatearBytes(
        contenido.byteLength,
      )}. El máximo es ${formatearBytes(TAMANO_MAXIMO_BYTES)}.`,
    );
  }
  if (detectarFormato(contenido) !== declarado) {
    throw new ErrorApp(
      'formato',
      'El contenido del archivo no coincide con una imagen permitida.',
    );
  }

  return {
    uri: archivo.uri,
    contenido,
    mime: declarado,
    extension: FORMATOS_PERMITIDOS[declarado],
    bytes: contenido.byteLength,
    ancho: archivo.width,
    alto: archivo.height,
  };
}

export function formatearBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
