import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Aviso, Boton, Campo, color } from '../components/ui';
import { supabase } from '../lib/supabase';
import { aErrorApp, tipoDeError } from '../services/errores';

export function PantallaAcceso() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  async function enviar() {
    setError(undefined);
    setAviso(undefined);
    if (!/^\S+@\S+\.\S+$/.test(correo.trim()) || contrasena.length < 8) {
      setError('Escribe un correo válido y una contraseña de 8 caracteres o más.');
      return;
    }
    setCargando(true);
    try {
      const credenciales = { email: correo.trim(), password: contrasena };
      if (modo === 'entrar') {
        const { error: fallo } = await supabase.auth.signInWithPassword(
          credenciales,
        );
        if (fallo) {
          throw fallo;
        }
      } else {
        const { data, error: fallo } = await supabase.auth.signUp(credenciales);
        if (fallo) {
          throw fallo;
        }
        if (!data.session) {
          setAviso('Cuenta creada. Confirma tu correo y después inicia sesión.');
          setModo('entrar');
        }
      }
    } catch (e) {
      setError(
        tipoDeError(e) === 'conexion'
          ? aErrorApp(e).message
          : 'No se pudo continuar. Revisa tu correo y contraseña.',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.raiz}
    >
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.marca}>
          <Text style={estilos.titulo}>Incidencias</Text>
          <Text style={estilos.subtitulo}>
            Reporta problemas de las instalaciones con evidencia fotográfica.
          </Text>
        </View>
        <Campo
          autoCapitalize="none"
          autoComplete="email"
          etiqueta="Correo"
          keyboardType="email-address"
          onChangeText={setCorreo}
          value={correo}
        />
        <Campo
          autoCapitalize="none"
          etiqueta="Contraseña"
          onChangeText={setContrasena}
          secureTextEntry
          value={contrasena}
        />
        {error ? <Aviso tono="error">{error}</Aviso> : null}
        {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
        <Boton
          alPresionar={enviar}
          cargando={cargando}
          titulo={modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
        />
        <Boton
          alPresionar={() => setModo(modo === 'entrar' ? 'crear' : 'entrar')}
          titulo={
            modo === 'entrar'
              ? 'Crear una cuenta nueva'
              : 'Ya tengo una cuenta'
          }
          variante="texto"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { flexGrow: 1, justifyContent: 'center', gap: 16, padding: 24 },
  marca: { gap: 6, marginBottom: 12 },
  titulo: { color: color.marca, fontSize: 34, fontWeight: '800' },
  subtitulo: { color: color.suave, fontSize: 16, lineHeight: 23 },
});
