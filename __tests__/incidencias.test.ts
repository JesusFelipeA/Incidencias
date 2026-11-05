import { crearRuta, obtenerUrlFirmada } from '../src/services/almacenamiento';
import { crearIncidencia, listarIncidencias } from '../src/services/incidencias';
import { FotoValidada } from '../src/services/validacionImagen';

const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockFirmar = jest.fn();
const mockFirmarVarias = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockLimit = jest.fn();

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrl: mockFirmar,
        createSignedUrls: mockFirmarVarias,
      }),
    },
    from: () => ({
      insert: mockInsert,
      select: () => ({ order: () => ({ limit: mockLimit }) }),
    }),
  },
}));

const UID = '11111111-1111-4111-8111-111111111111';
const foto: FotoValidada = {
  uri: 'file:///f.jpg',
  contenido: new ArrayBuffer(4),
  mime: 'image/jpeg',
  extension: 'jpg',
  bytes: 4,
};
const datos = {
  titulo: 'Fuga de agua',
  descripcion: 'Sale agua del lavabo',
  ubicacion: 'Piso 2',
  prioridad: 'alta' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRemove.mockResolvedValue({ data: [], error: null });
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
});

test('la ruta queda dentro de la carpeta del usuario', () => {
  const ruta = crearRuta(UID, 'jpg', new Date('2026-11-05T12:00:00Z'));
  expect(ruta).toMatch(new RegExp(`^${UID}/2026-11/\\d+-\\w+\\.jpg$`));
});

test('sube la foto y guarda sólo su referencia, no una URL', async () => {
  mockUpload.mockImplementation(async ruta => ({ data: { path: ruta }, error: null }));
  mockSingle.mockResolvedValue({ data: { id: '1' }, error: null });
  const etapas: string[] = [];

  await crearIncidencia(datos, foto, UID, e => etapas.push(e));

  expect(etapas).toEqual(['subiendo', 'guardando']);
  const [ruta, cuerpo, opciones] = mockUpload.mock.calls[0];
  expect(cuerpo).toBeInstanceOf(ArrayBuffer);
  expect(opciones).toMatchObject({ contentType: 'image/jpeg', upsert: false });
  const fila = mockInsert.mock.calls[0][0];
  expect(fila.imagen_path).toBe(ruta);
  expect(JSON.stringify(fila)).not.toMatch(/https?:/);
});

test('sin conexión no crea registro y conserva un error reintentable', async () => {
  mockUpload.mockResolvedValue({
    data: null,
    error: { message: 'Network request failed' },
  });
  await expect(crearIncidencia(datos, foto, UID)).rejects.toMatchObject({
    tipo: 'conexion',
    reintentable: true,
  });
  expect(mockInsert).not.toHaveBeenCalled();
});

test('retira el archivo si falla el registro', async () => {
  mockUpload.mockResolvedValue({ data: { path: `${UID}/f.jpg` }, error: null });
  mockSingle.mockResolvedValue({
    data: null,
    error: { code: '42501', message: 'row-level security' },
  });
  await expect(crearIncidencia(datos, foto, UID)).rejects.toMatchObject({
    tipo: 'autorizacion',
  });
  expect(mockRemove).toHaveBeenCalledWith([`${UID}/f.jpg`]);
});

test('no sube nada si el formulario es inválido', async () => {
  await expect(
    crearIncidencia({ ...datos, titulo: 'x' }, foto, UID),
  ).rejects.toThrow('título');
  expect(mockUpload).not.toHaveBeenCalled();
});

test('la lista agrega URLs firmadas recién generadas', async () => {
  mockLimit.mockResolvedValue({
    data: [{ id: '1', imagen_path: 'a.jpg' }],
    error: null,
  });
  mockFirmarVarias.mockResolvedValue({
    data: [{ path: 'a.jpg', signedUrl: 'https://x/firmada', error: null }],
    error: null,
  });
  const [incidencia] = await listarIncidencias();
  expect(incidencia.urlMiniatura).toBe('https://x/firmada');
});

test('la URL firmada informa su vencimiento', async () => {
  mockFirmar.mockResolvedValue({ data: { signedUrl: 'https://x/f' }, error: null });
  const { vence } = await obtenerUrlFirmada('a.jpg');
  expect(vence.getTime()).toBeGreaterThan(Date.now());
});
