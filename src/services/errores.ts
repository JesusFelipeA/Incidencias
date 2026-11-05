export type TipoError =
  | 'conexion'
  | 'sesion'
  | 'autorizacion'
  | 'formato'
  | 'tamano'
  | 'desconocido';

export class ErrorApp extends Error {
  constructor(public tipo: TipoError, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorApp';
  }

  get reintentable(): boolean {
    return this.tipo === 'conexion' || this.tipo === 'desconocido';
  }
}

type ErrorCrudo = {
  message?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
};

const MENSAJES: Record<TipoError, string> = {
  conexion:
    'No hay conexión con el servicio. Tu reporte sigue aquí: revisa la red y reintenta.',
  sesion: 'Tu sesión venció. Inicia sesión de nuevo.',
  autorizacion: 'No tienes permiso para realizar esta operación.',
  formato: 'El servicio rechazó el formato del archivo.',
  tamano: 'El archivo supera el tamaño máximo permitido.',
  desconocido: 'Ocurrió un error inesperado. Intenta de nuevo.',
};

export function tipoDeError(error: unknown): TipoError {
  if (error instanceof ErrorApp) {
    return error.tipo;
  }
  const crudo = (error ?? {}) as ErrorCrudo;
  const texto = `${crudo.name ?? ''} ${crudo.message ?? ''}`.toLowerCase();
  const codigos = [crudo.statusCode, crudo.status, crudo.code].map(String);
  const hay = (...valores: string[]) =>
    valores.some(valor => codigos.includes(valor));

  if (
    /network request failed|failed to fetch|abort|timeout|retryablefetch/.test(
      texto,
    )
  ) {
    return 'conexion';
  }
  if (hay('415') || /mime|invalid_mime_type/.test(texto)) {
    return 'formato';
  }
  if (hay('413') || /exceeded the maximum|too large|entitytoolarge/.test(texto)) {
    return 'tamano';
  }
  if (hay('401') || /jwt expired|invalid jwt/.test(texto)) {
    return 'sesion';
  }
  if (hay('403', '42501') || /row-level security|unauthorized/.test(texto)) {
    return 'autorizacion';
  }
  return 'desconocido';
}

export function aErrorApp(error: unknown): ErrorApp {
  if (error instanceof ErrorApp) {
    return error;
  }
  const tipo = tipoDeError(error);
  return new ErrorApp(tipo, MENSAJES[tipo]);
}
