import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Aviso, Boton, color, Encabezado } from '../components/ui';
import { aErrorApp } from '../services/errores';
import { Incidencia, listarIncidencias } from '../services/incidencias';

type Props = {
  correo?: string;
  alNueva: () => void;
  alAbrir: (incidencia: Incidencia) => void;
  alSeguridad: () => void;
  alSalir: () => void;
};

export function PantallaLista({
  correo,
  alNueva,
  alAbrir,
  alSeguridad,
  alSalir,
}: Props) {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string>();

  const cargar = useCallback(async () => {
    setError(undefined);
    try {
      setIncidencias(await listarIncidencias());
    } catch (e) {
      setError(aErrorApp(e).message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <View style={estilos.raiz}>
      <Encabezado titulo="Mis incidencias" />
      <FlatList
        contentContainerStyle={estilos.lista}
        data={incidencias}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator color={color.marca} />
          ) : error ? undefined : (
            <View style={estilos.vacio}>
              <Text style={estilos.vacioTitulo}>Sin incidencias</Text>
              <Text style={estilos.meta}>
                Registra la primera con una fotografía del problema.
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={estilos.cabecera}>
            {correo ? <Text style={estilos.meta}>{correo}</Text> : null}
            {error ? (
              <>
                <Aviso tono="error">{error}</Aviso>
                <Boton
                  alPresionar={cargar}
                  titulo="Reintentar"
                  variante="secundario"
                />
              </>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={estilos.pie}>
            <Boton
              alPresionar={alSeguridad}
              titulo="Comprobaciones de seguridad"
              variante="texto"
            />
            <Boton
              alPresionar={alSalir}
              titulo="Cerrar sesión"
              variante="texto"
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefrescando(true);
              cargar();
            }}
            refreshing={refrescando}
            tintColor={color.marca}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => alAbrir(item)}
            style={estilos.tarjeta}
          >
            {item.urlMiniatura ? (
              <Image
                accessibilityLabel={`Foto de ${item.titulo}`}
                source={{ uri: item.urlMiniatura }}
                style={estilos.miniatura}
              />
            ) : (
              <View style={estilos.miniatura} />
            )}
            <View style={estilos.textos}>
              <Text numberOfLines={2} style={estilos.tituloTarjeta}>
                {item.titulo}
              </Text>
              <Text numberOfLines={1} style={estilos.meta}>
                {item.ubicacion}
              </Text>
              <Text style={estilos.meta}>
                Prioridad {item.prioridad} ·{' '}
                {new Date(item.creada_en).toLocaleDateString('es-MX')}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <View style={estilos.accion}>
        <Boton alPresionar={alNueva} titulo="Nueva incidencia" />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  lista: { flexGrow: 1, gap: 12, padding: 16 },
  cabecera: { gap: 12 },
  pie: { marginTop: 4 },
  accion: {
    padding: 16,
    backgroundColor: color.superficie,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.linea,
  },
  tarjeta: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: color.superficie,
  },
  miniatura: {
    width: 84,
    height: 84,
    borderRadius: 8,
    backgroundColor: color.linea,
  },
  textos: { flex: 1, gap: 3, justifyContent: 'center' },
  tituloTarjeta: { color: color.tinta, fontSize: 16, fontWeight: '700' },
  meta: { color: color.suave, fontSize: 14, lineHeight: 19 },
  vacio: { alignItems: 'center', gap: 6, paddingVertical: 48 },
  vacioTitulo: { color: color.tinta, fontSize: 18, fontWeight: '700' },
});
