import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { Aviso, color } from './src/components/ui';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './src/config/env';
import { revisarConfiguracion } from './src/lib/configuracion';
import { supabase } from './src/lib/supabase';
import { PantallaAcceso } from './src/screens/PantallaAcceso';
import { PantallaDetalle } from './src/screens/PantallaDetalle';
import { PantallaLista } from './src/screens/PantallaLista';
import { PantallaNueva } from './src/screens/PantallaNueva';
import { PantallaSeguridad } from './src/screens/PantallaSeguridad';
import { Incidencia } from './src/services/incidencias';

type Ruta =
  | { pantalla: 'lista' }
  | { pantalla: 'nueva' }
  | { pantalla: 'seguridad' }
  | { pantalla: 'detalle'; incidencia: Incidencia };

const problemaConfiguracion = revisarConfiguracion(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

function Aplicacion() {
  const [sesion, setSesion] = useState<Session | null>();
  const [ruta, setRuta] = useState<Ruta>({ pantalla: 'lista' });

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSesion(data.session))
      .catch(() => setSesion(null));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva);
      if (!nueva) {
        setRuta({ pantalla: 'lista' });
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (ruta.pantalla === 'lista') {
          return false;
        }
        setRuta({ pantalla: 'lista' });
        return true;
      },
    );
    return () => suscripcion.remove();
  }, [ruta]);

  if (sesion === undefined) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={color.marca} />
      </View>
    );
  }
  if (!sesion) {
    return <PantallaAcceso />;
  }

  const irALista = () => setRuta({ pantalla: 'lista' });
  const abrir = (incidencia: Incidencia) =>
    setRuta({ pantalla: 'detalle', incidencia });

  switch (ruta.pantalla) {
    case 'nueva':
      return (
        <PantallaNueva
          alAbrir={abrir}
          alVolver={irALista}
          usuarioId={sesion.user.id}
        />
      );
    case 'detalle':
      return (
        <PantallaDetalle alVolver={irALista} incidencia={ruta.incidencia} />
      );
    case 'seguridad':
      return (
        <PantallaSeguridad
          alVolver={irALista}
          token={sesion.access_token}
          usuarioId={sesion.user.id}
        />
      );
    default:
      return (
        <PantallaLista
          alAbrir={abrir}
          alNueva={() => setRuta({ pantalla: 'nueva' })}
          alSalir={() => supabase.auth.signOut()}
          alSeguridad={() => setRuta({ pantalla: 'seguridad' })}
          correo={sesion.user.email}
        />
      );
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={estilos.raiz}>
        {problemaConfiguracion ? (
          <View style={estilos.configuracion}>
            <Aviso tono="error">{problemaConfiguracion}</Aviso>
          </View>
        ) : (
          <Aplicacion />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.superficie },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  configuracion: { flex: 1, justifyContent: 'center', padding: 24 },
});
