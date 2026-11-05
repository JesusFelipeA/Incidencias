import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FotoRemota } from '../components/FotoRemota';
import { color, Encabezado } from '../components/ui';
import { Incidencia } from '../services/incidencias';
import { formatearBytes } from '../services/validacionImagen';

function Dato({
  etiqueta,
  valor,
  seleccionable,
}: {
  etiqueta: string;
  valor: string;
  seleccionable?: boolean;
}) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text selectable={seleccionable} style={estilos.valor}>
        {valor}
      </Text>
    </View>
  );
}

export function PantallaDetalle({
  incidencia,
  alVolver,
}: {
  incidencia: Incidencia;
  alVolver: () => void;
}) {
  return (
    <View style={estilos.raiz}>
      <Encabezado alVolver={alVolver} titulo="Detalle" />
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.titulo}>{incidencia.titulo}</Text>
        <FotoRemota ruta={incidencia.imagen_path} />
        <Dato etiqueta="Ubicación" valor={incidencia.ubicacion} />
        <Dato etiqueta="Descripción" valor={incidencia.descripcion} />
        <Dato etiqueta="Prioridad" valor={incidencia.prioridad} />
        <Dato
          etiqueta="Registrada"
          valor={new Date(incidencia.creada_en).toLocaleString('es-MX')}
        />
        <Dato
          etiqueta="Archivo"
          valor={`${incidencia.imagen_mime} · ${formatearBytes(
            incidencia.imagen_bytes,
          )}`}
        />
        <Dato
          etiqueta="Referencia en el bucket"
          seleccionable
          valor={incidencia.imagen_path}
        />
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { gap: 14, padding: 16, paddingBottom: 32 },
  titulo: { color: color.tinta, fontSize: 24, fontWeight: '800' },
  dato: { gap: 3 },
  etiqueta: { color: color.suave, fontSize: 13, fontWeight: '600' },
  valor: { color: color.tinta, fontSize: 16, lineHeight: 22 },
});
