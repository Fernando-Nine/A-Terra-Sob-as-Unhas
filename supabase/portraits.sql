-- Execute no SQL Editor para permitir retratos no resumo compartilhado.
-- Pode ser executado novamente. Não apaga nem altera fichas ou documentos.
begin;
alter table public.sala_membros drop constraint if exists sala_membros_ficha_check;
alter table public.sala_membros add constraint sala_membros_ficha_check check (
 ficha is null or (
  jsonb_typeof(ficha)='object' and octet_length(ficha::text)<262144
  and ficha - array['name','job','hp','hpMax','san','sanMax','root','skills','ppTotal','portrait'] = '{}'::jsonb
  and (not (ficha ? 'portrait') or (
   jsonb_typeof(ficha->'portrait')='string'
   and length(ficha->>'portrait')<=60000
   and (ficha->>'portrait') ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$'
  ))
 )
);
commit;
