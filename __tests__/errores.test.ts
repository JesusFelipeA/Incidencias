import { aErrorApp, ErrorApp, tipoDeError } from '../src/services/errores';

describe('tipoDeError', () => {
  test.each([
    [{ message: 'TypeError: Network request failed' }, 'conexion'],
    [{ name: 'AbortError', message: 'Aborted' }, 'conexion'],
    [{ name: 'AuthRetryableFetchError', message: '' }, 'conexion'],
    [{ statusCode: '415', message: 'mime type text/plain is not supported' }, 'formato'],
    [{ status: 400, statusCode: '413', message: 'exceeded the maximum allowed size' }, 'tamano'],
    [{ statusCode: '403', message: 'new row violates row-level security policy' }, 'autorizacion'],
    [{ code: '42501', message: 'new row violates row-level security policy for table' }, 'autorizacion'],
    [{ status: 401, message: 'JWT expired' }, 'sesion'],
    [{ message: 'otra cosa' }, 'desconocido'],
  ])('clasifica %#', (error, esperado) => {
    expect(tipoDeError(error)).toBe(esperado);
  });
});

test('sólo los errores de red o desconocidos admiten reintento', () => {
  expect(aErrorApp({ message: 'Network request failed' }).reintentable).toBe(true);
  expect(aErrorApp({ statusCode: '403' }).reintentable).toBe(false);
});

test('conserva un ErrorApp existente', () => {
  const original = new ErrorApp('formato', 'propio');
  expect(aErrorApp(original)).toBe(original);
});
