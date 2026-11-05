# Incidencias · Actividad 20

Aplicación móvil en **React Native CLI** para reportar incidencias con una fotografía. La imagen se guarda en un bucket privado de **Supabase Storage** y la base de datos conserva sólo su referencia.

## Funciones

- Inicio de sesión y registro con correo y contraseña.
- Registro de incidencia con foto desde la galería o la cámara.
- Vista previa y validación de tipo, tamaño y firma real del archivo.
- Carga al servicio en la nube con estado de la transferencia y reintento.
- Consulta posterior de la imagen mediante URL firmada de 10 minutos.
- Pantalla de comprobaciones de seguridad contra el proyecto real.

## 1. Preparar Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Abre **SQL Editor**, pega `supabase/schema.sql` y ejecútalo. Crea el bucket, la tabla y las reglas.
3. Para la demostración, desactiva **Confirm email** en la configuración de Authentication. Si lo dejas activo, cada cuenta debe confirmarse por correo.
4. Copia la **Project URL** y la **Publishable key** (`sb_publishable_...`).

No uses la clave secreta (`sb_secret_...`) ni `service_role`: la app se niega a arrancar con ellas.

## 2. Ejecutar la app

Requiere Node 22.11 o superior y el entorno de Android de React Native.

```bash
npm install
```

Copia `src/config/env.example.ts` como `src/config/env.ts` y coloca tus datos. Ese archivo está en `.gitignore`.

```bash
npm start
npm run android
```

Para iOS, ejecuta antes `bundle install` y `bundle exec pod install` dentro de `ios`.

## 3. Generar las evidencias

| Evidencia | Cómo obtenerla |
|---|---|
| Imagen seleccionada | Nueva incidencia > Galería o Cámara: captura la vista previa. |
| Carga exitosa | Envía la incidencia: captura la pantalla **Carga completada**. |
| Archivo en la nube | Supabase > Storage > `incidencias-fotos`: captura la carpeta con el archivo. |
| Imagen recuperada | Abre el detalle: el texto indica que viene de Supabase Storage. |
| Persistencia | Cierra la app desde recientes, ábrela y vuelve a abrir la incidencia. |
| Registro en base de datos | Supabase > Table Editor > `incidencias`: captura `imagen_path`. |
| Pérdida de conexión | Activa modo avión y envía: el formulario se conserva y aparece **Reintentar envío**. Desactívalo y reintenta. |
| Comprobaciones | Lista > Comprobaciones de seguridad > Ejecutar. Hazlo con conexión estable; envía un archivo de más de 5 MB. |
| Archivo de otra cuenta | Copia la referencia del detalle con la cuenta A, inicia sesión con la cuenta B y pégala en Comprobaciones. La referencia debe existir: si la escribes mal, la prueba no demuestra nada. |

## 4. Pruebas automáticas

```bash
npm test          # lógica de la app (no usa la red)
npm run test:sql  # aplica schema.sql en PostgreSQL local y prueba las reglas
```

`test:sql` usa una imitación mínima de los esquemas `auth` y `storage`. Las reglas del proyecto real se comprueban desde la pantalla de seguridad.

## Estructura

```text
App.tsx                     Sesión y navegación
src/config/                 Límites y configuración
src/lib/                    Cliente Supabase y sesión cifrada
src/services/               Validación, carga, consulta y pruebas de seguridad
src/screens/                Pantallas
supabase/schema.sql         Bucket, tabla y reglas
scripts/verificar-rls.mjs   Prueba de reglas
```

## Decisiones

- **Sin Expo:** se usa `react-native-image-picker` para galería y cámara.
- **Sesión cifrada:** `react-native-keychain` guarda la sesión en Keychain o Keystore.
- **ArrayBuffer:** la librería de Supabase indica no usar `Blob`, `File` ni `FormData` en React Native.
- **Referencia, no URL:** las URL firmadas caducan, así que se guarda la ruta y la URL se genera al consultar.
