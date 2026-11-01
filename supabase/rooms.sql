-- Execute uma vez no SQL Editor do Supabase. Não modifica as fichas existentes.
begin;
create table public.salas (
 id uuid primary key default gen_random_uuid(),
 codigo text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 nome text not null check (char_length(nome) between 1 and 80),
 mestre_id uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.sala_membros (
 sala_id uuid not null references public.salas(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 apelido text not null default 'Investigador' check (char_length(apelido) between 1 and 60),
 ficha jsonb check (ficha is null or (jsonb_typeof(ficha)='object' and octet_length(ficha::text)<32768 and ficha - array['name','job','hp','hpMax','san','sanMax','root','skills','ppTotal'] = '{}'::jsonb)),
 updated_at timestamptz not null default now(),
 primary key(sala_id,user_id)
);
create function public.sala_participante(p_sala uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.salas where id=p_sala and mestre_id=auth.uid()) or exists(select 1 from public.sala_membros where sala_id=p_sala and user_id=auth.uid());
$$;
create function public.sala_mestre(p_sala uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.salas where id=p_sala and mestre_id=auth.uid());
$$;
revoke all on function public.sala_participante(uuid),public.sala_mestre(uuid) from public;
grant execute on function public.sala_participante(uuid),public.sala_mestre(uuid) to authenticated;
create function public.entrar_sala(p_codigo text,p_apelido text default 'Investigador') returns public.salas language plpgsql security definer set search_path=public,pg_temp as $$
declare sala public.salas;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta';end if;
 select * into sala from public.salas where codigo=upper(trim(p_codigo));
 if not found then raise exception 'Sala não encontrada';end if;
 insert into public.sala_membros(sala_id,user_id,apelido) values(sala.id,auth.uid(),left(coalesce(nullif(trim(p_apelido),''),'Investigador'),60)) on conflict(sala_id,user_id) do nothing;
 return sala;
end;$$;
revoke all on function public.entrar_sala(text,text) from public;
grant execute on function public.entrar_sala(text,text) to authenticated;
create table public.sala_rolagens (
 id uuid primary key default gen_random_uuid(),
 sala_id uuid not null references public.salas(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id),
 nome text not null check(char_length(nome) between 1 and 60),
 habilidade text not null check(char_length(habilidade) between 1 and 40),
 a smallint not null check(a between 1 and 6),b smallint not null check(b between 1 and 6),
 nivel smallint not null check(nivel between 0 and 5),modificador smallint not null check(modificador between -3 and 3),
 alvo smallint not null check(alvo in (9,12,15)),
 total integer generated always as (a+b+nivel+modificador) stored,
 created_at timestamptz not null default now()
);
create table public.sala_documentos (
 id uuid primary key,
 sala_id uuid not null references public.salas(id) on delete cascade,
 autor_id uuid not null default auth.uid() references auth.users(id),
 titulo text not null check(char_length(titulo) between 1 and 100),
 texto text not null default '' check(char_length(texto)<=10000),
 tipo text not null check(tipo in ('nota','imagem','arquivo')),
 caminho text unique,
 x integer not null default 20 check(x between 0 and 2400),y integer not null default 20 check(y between 0 and 1800),
 revisao integer not null default 1,
 check((tipo='nota' and caminho is null) or (tipo in ('imagem','arquivo') and caminho like sala_id::text||'/'||id::text||'.%'))
);
create index on public.sala_rolagens(sala_id,created_at desc);
create index on public.sala_documentos(sala_id);
alter table public.salas enable row level security;
alter table public.sala_membros enable row level security;
alter table public.sala_rolagens enable row level security;
alter table public.sala_documentos enable row level security;
revoke all on public.salas,public.sala_membros,public.sala_rolagens,public.sala_documentos from anon,authenticated;
grant select,insert on public.salas to authenticated;
grant select,delete on public.sala_membros to authenticated;
grant update(apelido,ficha,updated_at) on public.sala_membros to authenticated;
grant select,insert on public.sala_rolagens to authenticated;
grant select,insert,delete on public.sala_documentos to authenticated;
grant update(titulo,texto,x,y,revisao) on public.sala_documentos to authenticated;
create policy salas_ler on public.salas for select to authenticated using(mestre_id=auth.uid() or public.sala_participante(id));
create policy salas_criar on public.salas for insert to authenticated with check(mestre_id=auth.uid());
create policy membros_ler on public.sala_membros for select to authenticated using(public.sala_participante(sala_id));
create policy membros_editar on public.sala_membros for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy membros_sair on public.sala_membros for delete to authenticated using(user_id=auth.uid());
create policy rolagens_ler on public.sala_rolagens for select to authenticated using(public.sala_participante(sala_id));
create policy rolagens_enviar on public.sala_rolagens for insert to authenticated with check(user_id=auth.uid() and public.sala_participante(sala_id));
create policy documentos_ler on public.sala_documentos for select to authenticated using(public.sala_participante(sala_id));
create policy documentos_criar on public.sala_documentos for insert to authenticated with check(autor_id=auth.uid() and public.sala_participante(sala_id));
create policy documentos_editar on public.sala_documentos for update to authenticated using(public.sala_participante(sala_id)) with check(public.sala_participante(sala_id));
create policy documentos_apagar on public.sala_documentos for delete to authenticated using(public.sala_participante(sala_id) and (autor_id=auth.uid() or public.sala_mestre(sala_id)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mesa-documentos','mesa-documentos',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy arquivos_ler on storage.objects for select to authenticated using(bucket_id='mesa-documentos' and public.sala_participante(((storage.foldername(name))[1])::uuid) and (owner_id=auth.uid()::text or exists(select 1 from public.sala_documentos d where d.caminho=name)));
create policy arquivos_enviar on storage.objects for insert to authenticated with check(bucket_id='mesa-documentos' and public.sala_participante(((storage.foldername(name))[1])::uuid));
create policy arquivos_apagar on storage.objects for delete to authenticated using(bucket_id='mesa-documentos' and (owner_id=auth.uid()::text or public.sala_mestre(((storage.foldername(name))[1])::uuid)));
commit;
