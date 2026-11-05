import {
  CameraOptions,
  ImagePickerResponse,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { ErrorApp } from './errores';
import { FotoValidada, validarFoto } from './validacionImagen';

const OPCIONES: CameraOptions = {
  mediaType: 'photo',
  includeBase64: true,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.7,
  saveToPhotos: false,
};

function procesarRespuesta(respuesta: ImagePickerResponse): FotoValidada | null {
  if (respuesta.didCancel) {
    return null;
  }
  if (respuesta.errorCode) {
    const mensajes: Record<string, string> = {
      camera_unavailable: 'Este dispositivo no tiene una cámara disponible.',
      permission: 'Autoriza el acceso a la cámara o galería en Ajustes.',
    };
    throw new ErrorApp(
      'desconocido',
      mensajes[respuesta.errorCode] ?? 'No se pudo abrir el selector.',
    );
  }
  const archivo = respuesta.assets?.[0];
  return archivo ? validarFoto(archivo) : null;
}

export const elegirDeGaleria = async () =>
  procesarRespuesta(
    await launchImageLibrary({ ...OPCIONES, selectionLimit: 1 }),
  );

export const tomarFoto = async () =>
  procesarRespuesta(await launchCamera(OPCIONES));
