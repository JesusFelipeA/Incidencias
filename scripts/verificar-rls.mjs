// Ejecuta supabase/schema.sql en PostgreSQL (PGlite) con un esquema mínimo que
// imita auth y storage, y prueba las reglas con los roles reales de la API.
// Uso: npm run test:sql
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key);
  insert into auth.users values ('${A}'), ('${B}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('prueba.uid', true), '')::uuid $$;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.extension(name text) returns text language sql immutable as
    $$ select reverse(split_part(reverse(name), '.', 1)) $$;
  grant usage on schema auth, storage to anon, authenticated;
  grant execute on all functions in schema auth, storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant select on storage.buckets to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
`);

const esquema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
await db.exec(esquema);
await db.exec(esquema); // debe poder ejecutarse dos veces

async function como(rol, uid, sql) {
  await db.exec(`reset role; set prueba.uid = '${uid ?? ''}'; set role ${rol};`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role;');
  }
}

let fallos = 0;
function verificar(nombre, ok) {
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}`);
  if (!ok) fallos++;
}
async function permitido(nombre, rol, uid, sql) {
  try { await como(rol, uid, sql); verificar(nombre, true); }
  catch (e) { console.log(e.message); verificar(nombre, false); }
}
async function bloqueado(nombre, rol, uid, sql, patron) {
  try { await como(rol, uid, sql); verificar(nombre, false); }
  catch (e) { verificar(`${nombre} [${e.message}]`, patron.test(e.message)); }
}
const obj = (ruta) => `insert into storage.objects (bucket_id, name) values ('incidencias-fotos', '${ruta}')`;
const fila = (uid, ruta) => `insert into public.incidencias
  (usuario_id, titulo, descripcion, ubicacion, imagen_path, imagen_mime, imagen_bytes)
  values ('${uid}', 'Fuga', 'Fuga de agua', 'Piso 2', '${ruta}', 'image/jpeg', 1024)`;

const bucket = (await db.query(`select * from storage.buckets`)).rows[0];
verificar('El bucket es privado', bucket.public === false);
verificar('El bucket limita a 5 MB', Number(bucket.file_size_limit) === 5242880);
verificar('El bucket sólo admite jpeg, png y webp', bucket.allowed_mime_types.length === 3);

const RLS = /row-level security/;
await permitido('A sube a su carpeta', 'authenticated', A, obj(`${A}/2026-11/a.jpg`));
await bloqueado('A no sube a la carpeta de B', 'authenticated', A, obj(`${B}/2026-11/x.jpg`), RLS);
await bloqueado('A no sube un archivo .exe', 'authenticated', A, obj(`${A}/2026-11/x.exe`), RLS);
await bloqueado('Sin sesión no se sube', 'anon', null, obj(`${A}/2026-11/y.jpg`), RLS);

let r = await como('authenticated', A, `select name from storage.objects`);
verificar('A ve su archivo', r.rows.length === 1);
r = await como('authenticated', B, `select name from storage.objects`);
verificar('B no ve el archivo de A', r.rows.length === 0);
r = await como('anon', null, `select name from storage.objects`);
verificar('Sin sesión no se ve ningún archivo', r.rows.length === 0);
r = await como('authenticated', B, `delete from storage.objects returning id`);
verificar('B no borra el archivo de A', r.rows.length === 0);
r = await como('authenticated', A, `update storage.objects set name = name returning id`);
verificar('Nadie sobrescribe archivos (sin política UPDATE)', r.rows.length === 0);

await permitido('A registra su incidencia', 'authenticated', A, fila(A, `${A}/2026-11/a.jpg`));
await bloqueado('A no registra a nombre de B', 'authenticated', A, fila(B, `${B}/2026-11/b.jpg`), RLS);
await bloqueado('La ruta debe estar en la carpeta del usuario', 'authenticated', A, fila(A, `${B}/2026-11/b.jpg`), /imagen_en_carpeta_del_usuario/);
await bloqueado('Sin sesión no se consulta la tabla', 'anon', null, `select * from public.incidencias`, /permission denied/);
await bloqueado('No se permite modificar registros', 'authenticated', A, `update public.incidencias set titulo = 'x'`, /permission denied/);
r = await como('authenticated', B, `select * from public.incidencias`);
verificar('B no ve las incidencias de A', r.rows.length === 0);
r = await como('authenticated', A, `select * from public.incidencias`);
verificar('A ve su incidencia', r.rows.length === 1);
r = await como('authenticated', A, `delete from storage.objects returning id`);
verificar('A puede retirar su archivo', r.rows.length === 1);

console.log(fallos ? `\n${fallos} comprobación(es) fallida(s)` : '\nTodas las comprobaciones pasaron');
process.exit(fallos ? 1 : 0);
