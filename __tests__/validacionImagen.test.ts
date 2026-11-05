import { encode } from 'base64-arraybuffer';
import { TAMANO_MAXIMO_BYTES } from '../src/config/constants';
import {
  detectarFormato,
  validarFoto,
} from '../src/services/validacionImagen';

const bytes = (...valores: number[]) => Uint8Array.from(valores).buffer;
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

const archivo = (contenido: ArrayBuffer, type: string) => ({
  uri: 'file:///foto',
  base64: encode(contenido),
  type,
});

describe('detectarFormato', () => {
  test.each([
    [JPEG, 'image/jpeg'],
    [PNG, 'image/png'],
    [WEBP, 'image/webp'],
    [GIF, null],
  ])('identifica la firma %#', (contenido, esperado) => {
    expect(detectarFormato(contenido)).toBe(esperado);
  });
});

describe('validarFoto', () => {
  test('acepta una imagen permitida', () => {
    const foto = validarFoto(archivo(JPEG, 'image/jpeg'));
    expect(foto).toMatchObject({ mime: 'image/jpeg', extension: 'jpg', bytes: 6 });
  });

  test('rechaza un tipo no permitido', () => {
    expect(() => validarFoto(archivo(GIF, 'image/gif'))).toThrow(
      'Formato no permitido',
    );
  });

  test('rechaza texto disfrazado de JPG', () => {
    const texto = bytes(...Array.from('no soy imagen', c => c.charCodeAt(0)));
    expect(() => validarFoto(archivo(texto, 'image/jpeg'))).toThrow(
      'no coincide',
    );
  });

  test('rechaza un PNG declarado como JPG', () => {
    expect(() => validarFoto(archivo(PNG, 'image/jpeg'))).toThrow('no coincide');
  });

  test('rechaza una imagen mayor a 5 MB', () => {
    const grande = new Uint8Array(TAMANO_MAXIMO_BYTES + 1);
    grande.set([0xff, 0xd8, 0xff]);
    expect(() => validarFoto(archivo(grande.buffer, 'image/jpeg'))).toThrow(
      'El máximo',
    );
  });

  test('rechaza un archivo sin contenido legible', () => {
    expect(() => validarFoto({ uri: 'file:///x', type: 'image/png' })).toThrow(
      'No se pudo leer',
    );
  });
});
