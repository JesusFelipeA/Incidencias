import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, Boton, Campo, color, Encabezado } from '../components/ui';
import {
  ejecutarComprobaciones,
  ResultadoComprobacion,
} from '../services/comprobaciones';

const PRESENTACION = {
  correcto: { etiqueta: 'Correcto', color: color.exito },
  fallido: { etiqueta: 'Fallido', color: color.error },
  inconcluso: { etiqueta: 'Inconcluso', color: color.alerta },
};

export function PantallaSeguridad({
  usuarioId,
  token,
  alVolver,
}: {
  usuarioId: string;
  token: string;
  alVolver: () => void;
}) {
  const [rutaOtroUsuario, setRutaOtroUsuario] = useState('');
  const [resultados, setResultados] = useState<ResultadoComprobacion[]>();
  const [ejecutando, setEjecutando] = useState(false);

  async function ejecutar() {
    setEjecutando(true);
    setResultados(undefined);
    setResultados(
      await ejecutarComprobaciones({ usuarioId, token, rutaOtroUsuario }),
    );
    setEjecutando(false);
  }

  const correctos = resultados?.filter(r => r.estado === 'correcto').length;

  return (
    <View style={estilos.raiz}>
      <Encabezado
        alVolver={ejecutando ? undefined : alVolver}
        titulo="Seguridad"
      />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={estilos.texto}>
          Estas pruebas intentan acciones no autorizadas contra tu proyecto real
          y limpian sus archivos al terminar.
        </Text>
        <Campo
          autoCapitalize="none"
          autoCorrect={false}
          etiqueta="Referencia de otra cuenta (opcional)"
          onChangeText={setRutaOtroUsuario}
          placeholder="uuid/aaaa-mm/archivo.jpg"
          value={rutaOtroUsuario}
        />
        <Boton
          alPresionar={ejecutar}
          cargando={ejecutando}
          titulo="Ejecutar comprobaciones"
        />
        {resultados ? (
          <Aviso
            tono={correctos === resultados.length ? 'exito' : 'alerta'}
          >{`${correctos} de ${resultados.length} correctas`}</Aviso>
        ) : null}
        {resultados?.map(resultado => (
          <View key={resultado.nombre} style={estilos.fila}>
            <Text
              style={[
                estilos.estado,
                { color: PRESENTACION[resultado.estado].color },
              ]}
            >
              {PRESENTACION[resultado.estado].etiqueta}
            </Text>
            <Text style={estilos.nombre}>{resultado.nombre}</Text>
            <Text style={estilos.texto}>{resultado.detalle}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { gap: 12, padding: 16, paddingBottom: 32 },
  fila: {
    gap: 3,
    padding: 12,
    borderRadius: 10,
    backgroundColor: color.superficie,
  },
  estado: { fontSize: 13, fontWeight: '800' },
  nombre: { color: color.tinta, fontSize: 15, fontWeight: '600' },
  texto: { color: color.suave, fontSize: 14, lineHeight: 20 },
});
