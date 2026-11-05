-- Actividad 20 · Almacenamiento en la nube para archivos multimedia
-- Ejecutar completo en: Supabase > SQL Editor. Se puede ejecutar más de una vez.
--
-- Decisión de diseño: la imagen vive en Storage y la base de datos sólo guarda
-- su referencia (bucket + ruta). No se guarda la URL firmada porque caduca.

-- ---------------------------------------------------------------------------
-- 1. Bucket privado con restricciones del lado del servidor
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incidencias-fotos',
  'incidencias-fotos',
  false,                                         -- privado: sin URL pública
  5242880,                                       -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Reglas de acceso a los archivos
--    Estructura de ruta: <id_del_usuario>/<aaaa-mm>/<archivo>
--    Cada usuario sólo puede operar dentro de su propia carpeta.
-- ---------------------------------------------------------------------------
drop policy if exists "fotos_leer_propias" on storage.objects;
create policy "fotos_leer_propias"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'incidencias-fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "fotos_subir_propias" on storage.objects;
create policy "fotos_subir_propias"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'incidencias-fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Necesaria para retirar el archivo si falla el registro de la incidencia.
drop policy if exists "fotos_borrar_propias" on storage.objects;
create policy "fotos_borrar_propias"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'incidencias-fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- No se crea política UPDATE: un archivo subido no se puede sobrescribir.

-- ---------------------------------------------------------------------------
-- 3. Tabla que relaciona cada imagen con su incidencia
-- ---------------------------------------------------------------------------
create table if not exists public.incidencias (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  titulo        text not null check (char_length(titulo) between 3 and 120),
  descripcion   text not null check (char_length(descripcion) between 5 and 1000),
  ubicacion     text not null check (char_length(ubicacion) between 2 and 120),
  prioridad     text not null default 'media'
                check (prioridad in ('baja', 'media', 'alta')),
  estado        text not null default 'abierta'
                check (estado in ('abierta', 'en_proceso', 'cerrada')),
  imagen_bucket text not null default 'incidencias-fotos'
                check (imagen_bucket = 'incidencias-fotos'),
  imagen_path   text not null unique,
  imagen_mime   text not null
                check (imagen_mime in ('image/jpeg', 'image/png', 'image/webp')),
  imagen_bytes  integer not null check (imagen_bytes between 1 and 5242880),
  imagen_ancho  integer check (imagen_ancho > 0),
  imagen_alto   integer check (imagen_alto > 0),
  creada_en     timestamptz not null default now(),
  constraint imagen_en_carpeta_del_usuario
    check (split_part(imagen_path, '/', 1) = usuario_id::text)
);

create index if not exists incidencias_usuario_fecha_idx
  on public.incidencias (usuario_id, creada_en desc);

-- ---------------------------------------------------------------------------
-- 4. Seguridad a nivel de fila: cada usuario sólo ve y crea lo suyo
-- ---------------------------------------------------------------------------
alter table public.incidencias enable row level security;

revoke all on public.incidencias from anon;
revoke all on public.incidencias from authenticated;
grant select, insert on public.incidencias to authenticated;

drop policy if exists "incidencias_leer_propias" on public.incidencias;
create policy "incidencias_leer_propias"
  on public.incidencias for select
  to authenticated
  using (usuario_id = (select auth.uid()));

drop policy if exists "incidencias_crear_propias" on public.incidencias;
create policy "incidencias_crear_propias"
  on public.incidencias for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));
