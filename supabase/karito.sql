-- Ejecutar en SQL Editor de Supabase. No contiene la contraseña compartida.
begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists karito_private;
revoke all on schema karito_private from public, anon, authenticated;

create table if not exists karito_private.config (
  id boolean primary key default true check (id),
  password_hash text not null
);
alter table karito_private.config enable row level security;
revoke all on karito_private.config from public, anon, authenticated;

create table if not exists public.karito_mensajes (
  id text primary key check (char_length(id) between 1 and 100),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  texto text not null check (char_length(btrim(texto)) between 1 and 10000),
  fecha timestamptz not null default now(),
  autor text not null default 'Karito' check (autor in ('Karito', 'Tu Amor')),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists karito_mensajes_fecha_idx on public.karito_mensajes (fecha desc, id desc);
alter table public.karito_mensajes enable row level security;
revoke all on public.karito_mensajes from public, anon, authenticated;
grant select on public.karito_mensajes to anon, authenticated;
drop policy if exists karito_lectura on public.karito_mensajes;
create policy karito_lectura on public.karito_mensajes for select to anon, authenticated using (true);

-- Solo las funciones autorizadas pueden modificar mensajes.
create or replace function karito_private.authorize(p_password text)
returns void language plpgsql set search_path = '' as $$
declare stored_hash text;
begin
  select password_hash into stored_hash from karito_private.config where id = true;
  if stored_hash is null then
    raise exception 'KARITO_NOT_CONFIGURED';
  end if;
  if p_password is null or octet_length(p_password) > 72 or
     extensions.crypt(p_password, stored_hash) is distinct from stored_hash then
    raise exception 'KARITO_PASSWORD' using errcode = '28000';
  end if;
end;
$$;
revoke all on function karito_private.authorize(text) from public, anon, authenticated;

create or replace function public.karito_guardar(p_password text, p_message jsonb, p_expected timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.karito_mensajes;
begin
  perform karito_private.authorize(p_password);
  if p_expected is null then
    insert into public.karito_mensajes (id, titulo, texto, autor)
    values (p_message->>'id', btrim(p_message->>'titulo'), btrim(p_message->>'texto'), p_message->>'autor')
    on conflict (id) do nothing returning * into saved;
  else
    update public.karito_mensajes
    set titulo = btrim(p_message->>'titulo'), texto = btrim(p_message->>'texto'),
        autor = p_message->>'autor', updated_at = clock_timestamp()
    where id = p_message->>'id' and updated_at = p_expected
    returning * into saved;
  end if;
  if saved.id is null then
    -- Reintentar una petición ya guardada es seguro; nunca sobrescribir otra versión.
    select * into saved from public.karito_mensajes where id = p_message->>'id';
    if saved.id is null or saved.titulo is distinct from btrim(p_message->>'titulo') or
       saved.texto is distinct from btrim(p_message->>'texto') or saved.autor is distinct from p_message->>'autor' then
      raise exception 'KARITO_CONFLICT';
    end if;
  end if;
  return to_jsonb(saved);
end;
$$;

create or replace function public.karito_eliminar(p_password text, p_id text, p_expected timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform karito_private.authorize(p_password);
  delete from public.karito_mensajes where id = p_id and updated_at = p_expected;
  if not found and exists (select 1 from public.karito_mensajes where id = p_id) then
    raise exception 'KARITO_CONFLICT';
  end if;
end;
$$;

create or replace function public.karito_importar(p_password text, p_messages jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare added integer;
begin
  perform karito_private.authorize(p_password);
  if jsonb_typeof(p_messages) is distinct from 'array' then
    raise exception 'KARITO_INVALID';
  end if;
  if jsonb_array_length(p_messages) > 1000 then
    raise exception 'KARITO_INVALID';
  end if;
  insert into public.karito_mensajes (id, titulo, texto, fecha, autor)
  select item->>'id', btrim(item->>'titulo'), btrim(item->>'texto'),
         (item->>'fecha')::timestamptz, coalesce(item->>'autor', 'Karito')
  from jsonb_array_elements(p_messages) as entries(item)
  on conflict (id) do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;

revoke all on function public.karito_guardar(text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.karito_eliminar(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.karito_importar(text, jsonb) from public, anon, authenticated;
grant execute on function public.karito_guardar(text, jsonb, timestamptz) to anon, authenticated;
grant execute on function public.karito_eliminar(text, text, timestamptz) to anon, authenticated;
grant execute on function public.karito_importar(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
