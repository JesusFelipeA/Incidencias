import { encode } from 'base64-arraybuffer';
import { revisarConfiguracion } from '../src/lib/configuracion';

const URL_OK = 'https://abc.supabase.co';
const jwt = (rol: string) => {
  const carga = Uint8Array.from(JSON.stringify({ role: rol }), c => c.charCodeAt(0));
  return `aaa.${encode(carga.buffer).replace(/[=]+$/, '')}.bbb`;
};

test('acepta una clave publicable y la anon heredada', () => {
  expect(revisarConfiguracion(URL_OK, 'sb_publishable_abc')).toBeNull();
  expect(revisarConfiguracion(URL_OK, jwt('anon'))).toBeNull();
});

test('rechaza credenciales administrativas', () => {
  expect(revisarConfiguracion(URL_OK, 'sb_secret_abc')).toMatch('administrativa');
  expect(revisarConfiguracion(URL_OK, jwt('service_role'))).toMatch('administrativa');
});

test('rechaza datos de ejemplo y HTTP sin cifrar', () => {
  expect(revisarConfiguracion('https://TU-PROYECTO.supabase.co', 'x')).toMatch('URL');
  expect(revisarConfiguracion('http://abc.supabase.co', 'x')).toMatch('URL');
  expect(revisarConfiguracion(URL_OK, 'sb_publishable_TU_CLAVE')).toMatch('clave');
});
