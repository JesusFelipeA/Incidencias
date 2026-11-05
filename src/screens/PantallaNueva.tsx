import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FotoRemota } from '../components/FotoRemota';
import { Aviso, Boton, Campo, color, Encabezado } from '../components/ui';
import { aErrorApp, ErrorApp } from '../services/errores';
import {
  crearIncidencia,
  DatosIncidencia,
  EtapaCarga,
  Incidencia,
  Prioridad,
  validarDatos,
} from '../services/incidencias';
import { elegirDeGaleria, tomarFoto } from '../services/selectorFotos';
import { formatearBytes, FotoValidada } from '../services/validacionImagen';

const DATOS_INICIALES: DatosIncidencia = {
  titulo: '',
  descripcion: '',
  ubicacion: '',
  prioridad: 'media',
};

const PRIORIDADES: Prioridad[] = ['baja', 'media', 'alta'];

const TEXTO_ETAPA: Record<EtapaCarga, string> = {
  subiendo: 'Transfiriendo la foto al servicio en la nube...',
  guardando: 'Guardando la referencia de la foto...',
};

type Props = {
  usuarioId: string;
  alVolver: () => void;
  alAbrir: (incidencia: Incidencia) => void;
};

export function PantallaNueva({ usuarioId, alVolver, alAbrir }: Props) {
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [foto, setFoto] = useState<FotoValidada>();
  const [etapa, setEtapa] = useState<EtapaCarga>();
  const [error, setError] = useState<ErrorApp>();
  const [creada, setCreada] = useState<Incidencia>();

  const actualizar = (cambio: Partial<DatosIncidencia>) =>
    setDatos(actuales => ({ ...actuales, ...cambio }));

  async function seleccionar(origen: typeof tomarFoto) {
    setError(undefined);
    try {
      const seleccionada = await origen();
      if (seleccionada) {
        setFoto(seleccionada);
      }
    } catch (e) {
      setFoto(undefined);
      setError(aErrorApp(e));
    }
  }

  async function enviar() {
    setError(undefined);
    const problema = validarDatos(datos);
    if (problema || !foto) {
      setError(
        new ErrorApp('formato', problema ?? 'Agrega una foto de la incidencia.'),
      );
      return;
    }
    try {
      setCreada(await crearIncidencia(datos, foto, usuarioId, setEtapa));
    } catch (e) {
      setError(aErrorApp(e));
    } finally {
      setEtapa(undefined);
    }
  }

  if (creada) {
    return (
      <View style={estilos.raiz}>
        <Encabezado titulo="Carga completada" />
        <ScrollView contentContainerStyle={estilos.contenido}>
          <Aviso tono="exito">
            La foto se transfirió correctamente y la incidencia quedó
            registrada.
          </Aviso>
          <FotoRemota ruta={creada.imagen_path} />
          <View style={estilos.dato}>
            <Text style={estilos.etiqueta}>Referencia guardada</Text>
            <Text selectable style={estilos.valor}>
              {creada.imagen_path}
            </Text>
          </View>
          <Boton alPresionar={() => alAbrir(creada)} titulo="Ver incidencia" />
          <Boton
            alPresionar={alVolver}
            titulo="Volver a la lista"
            variante="secundario"
          />
        </ScrollView>
      </View>
    );
  }

  const ocupado = !!etapa;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.raiz}
    >
      <Encabezado alVolver={ocupado ? undefined : alVolver} titulo="Nueva incidencia" />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Campo
          etiqueta="Título"
          maxLength={120}
          onChangeText={titulo => actualizar({ titulo })}
          placeholder="Ej. Fuga en el baño del segundo piso"
          value={datos.titulo}
        />
        <Campo
          etiqueta="Ubicación"
          maxLength={120}
          onChangeText={ubicacion => actualizar({ ubicacion })}
          placeholder="Edificio, piso o área"
          value={datos.ubicacion}
        />
        <Campo
          etiqueta="Descripción"
          maxLength={1000}
          multiline
          onChangeText={descripcion => actualizar({ descripcion })}
          placeholder="¿Qué ocurre?"
          value={datos.descripcion}
        />
        <View style={estilos.grupo}>
          <Text style={estilos.etiqueta}>Prioridad</Text>
          <View style={estilos.opciones}>
            {PRIORIDADES.map(prioridad => {
              const activa = datos.prioridad === prioridad;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa }}
                  key={prioridad}
                  onPress={() => actualizar({ prioridad })}
                  style={[estilos.opcion, activa && estilos.opcionActiva]}
                >
                  <Text
                    style={[
                      estilos.opcionTexto,
                      activa && estilos.opcionTextoActiva,
                    ]}
                  >
                    {prioridad[0].toUpperCase() + prioridad.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={estilos.grupo}>
          <Text style={estilos.etiqueta}>Fotografía</Text>
          {foto ? (
            <>
              <Image
                accessibilityLabel="Vista previa de la foto seleccionada"
                resizeMode="cover"
                source={{ uri: foto.uri }}
                style={estilos.vistaPrevia}
              />
              <Text style={estilos.nota}>
                Vista previa · {foto.mime} · {formatearBytes(foto.bytes)}
              </Text>
            </>
          ) : (
            <Text style={estilos.nota}>
              JPG, PNG o WebP, hasta 5 MB. Se envía a un bucket privado.
            </Text>
          )}
          <View style={estilos.opciones}>
            <View style={estilos.mitad}>
              <Boton
                alPresionar={() => seleccionar(elegirDeGaleria)}
                deshabilitado={ocupado}
                titulo="Galería"
                variante="secundario"
              />
            </View>
            <View style={estilos.mitad}>
              <Boton
                alPresionar={() => seleccionar(tomarFoto)}
                deshabilitado={ocupado}
                titulo="Cámara"
                variante="secundario"
              />
            </View>
          </View>
        </View>

        {etapa ? <Aviso tono="info">{TEXTO_ETAPA[etapa]}</Aviso> : null}
        {error ? <Aviso tono="error">{error.message}</Aviso> : null}
        <Boton
          alPresionar={enviar}
          cargando={ocupado}
          titulo={error?.reintentable ? 'Reintentar envío' : 'Enviar incidencia'}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { gap: 16, padding: 16, paddingBottom: 32 },
  grupo: { gap: 8 },
  etiqueta: { color: color.tinta, fontSize: 14, fontWeight: '600' },
  nota: { color: color.suave, fontSize: 14, lineHeight: 20 },
  vistaPrevia: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: color.linea,
  },
  opciones: { flexDirection: 'row', gap: 8 },
  opcion: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.linea,
    borderRadius: 10,
    backgroundColor: color.superficie,
  },
  opcionActiva: { borderColor: color.marca, backgroundColor: color.marcaSuave },
  opcionTexto: { color: color.suave, fontSize: 15, fontWeight: '600' },
  opcionTextoActiva: { color: color.marca },
  mitad: { flex: 1 },
  dato: { gap: 4 },
  valor: { color: color.tinta, fontSize: 13, lineHeight: 19 },
});
