import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

export const color = {
  fondo: '#F3F5F4',
  superficie: '#FFFFFF',
  tinta: '#16211F',
  suave: '#5B6865',
  linea: '#D6DDDA',
  marca: '#0F5C53',
  marcaSuave: '#E0EFEC',
  exito: '#1B7A47',
  exitoSuave: '#E2F3E9',
  alerta: '#96610A',
  alertaSuave: '#FBF0DB',
  error: '#B3261E',
  errorSuave: '#FBE6E4',
};

type BotonProps = {
  titulo: string;
  alPresionar: () => void;
  variante?: 'principal' | 'secundario' | 'texto';
  cargando?: boolean;
  deshabilitado?: boolean;
};

export function Boton({
  titulo,
  alPresionar,
  variante = 'principal',
  cargando,
  deshabilitado,
}: BotonProps) {
  const inactivo = cargando || deshabilitado;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo }}
      disabled={inactivo}
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.boton,
        variante === 'principal' && estilos.botonPrincipal,
        variante === 'secundario' && estilos.botonSecundario,
        variante === 'texto' && estilos.botonTexto,
        (pressed || inactivo) && estilos.botonApagado,
      ]}
    >
      {cargando ? (
        <ActivityIndicator
          color={variante === 'principal' ? '#FFFFFF' : color.marca}
        />
      ) : (
        <Text
          style={[
            estilos.botonEtiqueta,
            variante !== 'principal' && estilos.botonEtiquetaMarca,
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

export function Campo({
  etiqueta,
  ...props
}: TextInputProps & { etiqueta: string }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor="#7E8A87"
        style={[estilos.entrada, props.multiline && estilos.entradaLarga]}
        {...props}
      />
    </View>
  );
}

type Tono = 'exito' | 'error' | 'alerta' | 'info';

const TONOS: Record<Tono, { fondo: string; texto: string }> = {
  exito: { fondo: color.exitoSuave, texto: color.exito },
  error: { fondo: color.errorSuave, texto: color.error },
  alerta: { fondo: color.alertaSuave, texto: color.alerta },
  info: { fondo: color.marcaSuave, texto: color.marca },
};

export function Aviso({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[estilos.aviso, { backgroundColor: TONOS[tono].fondo }]}
    >
      <Text style={[estilos.avisoTexto, { color: TONOS[tono].texto }]}>
        {children}
      </Text>
    </View>
  );
}

export function Encabezado({
  titulo,
  alVolver,
  accion,
}: {
  titulo: string;
  alVolver?: () => void;
  accion?: ReactNode;
}) {
  return (
    <View style={estilos.encabezado}>
      {alVolver ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={12}
          onPress={alVolver}
        >
          <Text style={estilos.volver}>‹ Volver</Text>
        </Pressable>
      ) : null}
      <Text numberOfLines={1} style={estilos.encabezadoTitulo}>
        {titulo}
      </Text>
      {accion}
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPrincipal: { backgroundColor: color.marca },
  botonSecundario: {
    borderWidth: 1,
    borderColor: color.marca,
    backgroundColor: color.superficie,
  },
  botonTexto: { minHeight: 44 },
  botonApagado: { opacity: 0.6 },
  botonEtiqueta: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  botonEtiquetaMarca: { color: color.marca },
  campo: { gap: 6 },
  etiqueta: { color: color.tinta, fontSize: 14, fontWeight: '600' },
  entrada: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.linea,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: color.superficie,
    color: color.tinta,
    fontSize: 16,
  },
  entradaLarga: { minHeight: 104, paddingTop: 12, textAlignVertical: 'top' },
  aviso: { borderRadius: 10, padding: 12 },
  avisoTexto: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  encabezado: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: color.superficie,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.linea,
  },
  encabezadoTitulo: {
    flex: 1,
    color: color.tinta,
    fontSize: 19,
    fontWeight: '700',
  },
  volver: { color: color.marca, fontSize: 16, fontWeight: '600' },
});
