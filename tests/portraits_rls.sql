-- Execute após rooms_rls.sql, somente no banco de teste.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
update public.sala_membros set ficha='{"name":"Foto de teste","skills":{},"portrait":"data:image/jpeg;base64,/9j/2Q=="}' where user_id=auth.uid();
do $$begin
 if not exists(select 1 from public.sala_membros where user_id=auth.uid() and ficha ? 'portrait') then raise exception 'Retrato não foi salvo';end if;
 begin update public.sala_membros set ficha='{"portrait":"https://example.com/tracking.jpg"}' where user_id=auth.uid();raise exception 'URL externa aceita';exception when check_violation then null;end;
 begin update public.sala_membros set ficha='{"portrait":"data:image/svg+xml;base64,PHN2Zz4="}' where user_id=auth.uid();raise exception 'SVG aceito';exception when check_violation then null;end;
 begin update public.sala_membros set ficha=jsonb_build_object('portrait','data:image/jpeg;base64,/9j/'||repeat('A',60000)) where user_id=auth.uid();raise exception 'Retrato grande aceito';exception when check_violation then null;end;
 begin update public.sala_membros set ficha='{"portrait":"data:image/jpeg;base64,/9j/2Q==","privateNotes":"segredo"}' where user_id=auth.uid();raise exception 'Anotação privada aceita';exception when check_violation then null;end;
end$$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$begin if not exists(select 1 from public.sala_membros where ficha ? 'portrait') then raise exception 'Mestre não consegue ver retrato';end if;end$$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$begin if exists(select 1 from public.sala_membros) then raise exception 'Retrato vazou para fora da sala';end if;end$$;
reset role;
select 'PASS: retrato visível na sala, conteúdo privado e formatos externos bloqueados';
