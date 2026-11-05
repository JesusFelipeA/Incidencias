import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { obtenerUrlFirmada } from '../services/almacenamiento';
import { aErrorApp } from '../services/errores';
import { Aviso, Boton, color } from './ui';

/** Muestra la foto desde el bucket usando una URL firmada recién generada. */
export function FotoRemota({ ruta }: { ruta: string }) {
  const [url, setUrl] = useState<string>();
  const [vence, setVence] = useState<Date>();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(undefined);
    try {
      const firmada = await obtenerUrlFirmada(ruta);
      setUrl(firmada.url);
      setVence(firmada.vence);
    } catch (e) {
      setError(aErrorApp(e).message);
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) {
    return (
      <View style={estilos.grupo}>
        <Aviso tono="error">{error}</Aviso>
        <Boton titulo="Reintentar" variante="secundario" alPresionar={cargar} />
      </View>
    );
  }

  return (
    <View style={estilos.grupo}>
      <View style={estilos.marco}>
        {url ? (
          <Image
            accessibilityLabel="Fotografía de la incidencia"
            onError={() => setError('No se pudo descargar la imagen.')}
            resizeMode="cover"
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {cargando ? <ActivityIndicator color={color.marca} /> : null}
      </View>
      {vence ? (
        <Text style={estilos.nota}>
          Cargada desde Supabase Storage. Enlace temporal vigente hasta las{' '}
          {vence.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 8 },
  marco: {
    aspectRatio: 4 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.linea,
  },
  nota: { color: color.suave, fontSize: 13, lineHeight: 18 },
});
