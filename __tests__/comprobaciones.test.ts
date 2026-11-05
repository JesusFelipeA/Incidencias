import { ejecutarComprobaciones } from '../src/services/comprobaciones';

const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockFirmar = jest.fn();
const mockInsert = jest.fn();

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrl: mockFirmar,
        getPublicUrl: () => ({ data: { publicUrl: 'https://x/publica' } }),
      }),
    },
    from: () => ({ insert: mockInsert }),
  },
}));

const UID = '11111111-1111-4111-8111-111111111111';
const contexto = { usuarioId: UID, token: 'jwt' };
const respuesta = (status: number) => ({ status } as Response);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: 500 });
  mockRemove.mockResolvedValue({ data: [], error: null });
});
afterEach(() => jest.useRealTimers());

function servicioProtegido() {
  mockUpload.mockImplementation(async (ruta: string, _c, o) => {
    if (o.contentType === 'text/plain') {
      return { error: { statusCode: '415', message: 'mime type not supported' } };
    }
    if (ruta.includes('excedido')) {
      return { error: { statusCode: '413', message: 'exceeded the maximum allowed size' } };
    }
    if (!ruta.startsWith(UID)) {
      return { error: { statusCode: '403', message: 'row-level security' } };
    }
    return { data: { path: ruta }, error: null };
  });
  mockInsert.mockResolvedValue({
    error: { code: '42501', message: 'row-level security' },
  });
  mockFirmar.mockResolvedValue({ data: { signedUrl: 'https://x/firmada' }, error: null });
  let lecturasFirmada = 0;
  globalThis.fetch = jest.fn(async (url: string, opciones?: RequestInit) => {
    const cabeceras = (opciones?.headers ?? {}) as Record<string, string>;
    if (url === 'https://x/firmada') {
      return respuesta(++lecturasFirmada === 1 ? 200 : 400);
    }
    if (url === 'https://x/publica') {
      return respuesta(400);
    }
    return respuesta(cabeceras.Authorization ? 200 : 400);
  }) as unknown as typeof fetch;
}

test('todo pasa cuando el servicio bloquea y el propietario sí accede', async () => {
  servicioProtegido();
  const resultados = await ejecutarComprobaciones(contexto);
  expect(resultados.map(r => [r.nombre, r.estado]).filter(r => r[1] !== 'correcto')).toEqual([]);
  expect(resultados).toHaveLength(9);
});

test('detecta un bucket público', async () => {
  servicioProtegido();
  (globalThis.fetch as jest.Mock).mockImplementation(async () => respuesta(200));
  const resultados = await ejecutarComprobaciones(contexto);
  const publica = resultados.find(r => r.nombre.includes('URL pública'));
  expect(publica?.estado).toBe('fallido');
});

test('detecta que el bucket acepta cualquier formato', async () => {
  servicioProtegido();
  mockUpload.mockResolvedValue({ data: { path: 'x' }, error: null });
  const resultados = await ejecutarComprobaciones(contexto);
  const formato = resultados.find(r => r.nombre.includes('Formato no permitido'));
  expect(formato?.estado).toBe('fallido');
  expect(mockRemove).toHaveBeenCalled();
});

test('sin red ninguna prueba del servidor se da por correcta', async () => {
  mockUpload.mockResolvedValue({ error: { message: 'Network request failed' } });
  mockInsert.mockResolvedValue({ error: { message: 'Network request failed' } });
  const resultados = await ejecutarComprobaciones(contexto);
  const [local, ...servidor] = resultados;
  expect(local.estado).toBe('correcto');
  expect(servidor.every(r => r.estado === 'inconcluso')).toBe(true);
});

test('prueba opcional: niega el archivo de otra cuenta', async () => {
  servicioProtegido();
  mockFirmar.mockImplementation(async (ruta: string) =>
    ruta.startsWith('otra')
      ? { data: null, error: { message: 'Object not found' } }
      : { data: { signedUrl: 'https://x/firmada' }, error: null },
  );
  const resultados = await ejecutarComprobaciones({
    ...contexto,
    rutaOtroUsuario: 'otra/2026-11/a.jpg',
  });
  expect(resultados[resultados.length - 1].estado).toBe('correcto');
});
