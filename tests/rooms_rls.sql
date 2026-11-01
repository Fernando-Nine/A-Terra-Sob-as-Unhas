-- Executar apenas em banco de teste preparado conforme tests/README.md.
insert into auth.users(id) values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.salas(id,codigo,nome) values('10000000-0000-0000-0000-000000000001','ABCDEF123456','Teste') returning id;
select public.entrar_sala('ABCDEF123456','Mestre');
insert into public.sala_documentos(id,sala_id,titulo,tipo,texto) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Pista','nota','Conteúdo privado da sala');
insert into storage.objects(bucket_id,name,owner_id) values('mesa-documentos','10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001.pdf','00000000-0000-0000-0000-000000000001');
insert into public.sala_documentos(id,sala_id,titulo,tipo,caminho) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Documento','arquivo','10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001.pdf');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 if exists(select 1 from public.salas) or exists(select 1 from public.sala_documentos) or exists(select 1 from storage.objects) then raise exception 'Vazamento para não participante';end if;
 begin insert into public.sala_rolagens(sala_id,nome,habilidade,a,b,nivel,modificador,alvo) values('10000000-0000-0000-0000-000000000001','Intruso','Força',1,2,0,0,9);raise exception 'Inserção não autorizada';exception when insufficient_privilege then null;end;
end$$;
select public.entrar_sala('ABCDEF123456','Jogador');
do $$begin
 if (select count(*) from public.salas)<>1 or (select count(*) from public.sala_documentos)<>2 or (select count(*) from storage.objects)<>1 then raise exception 'Participante sem acesso';end if;
 if public.sala_mestre('10000000-0000-0000-0000-000000000001') then raise exception 'Jogador virou mestre';end if;
 begin update public.salas set mestre_id=auth.uid();raise exception 'Mudança de mestre permitida';exception when insufficient_privilege then null;end;
 begin update public.sala_membros set user_id='00000000-0000-0000-0000-000000000003';raise exception 'Mudança de identidade permitida';exception when insufficient_privilege then null;end;
 begin update public.sala_membros set ficha='{"privateNotes":"não publicar"}';raise exception 'Diário permitido no resumo';exception when check_violation then null;end;
end$$;
update public.sala_documentos set x=120,y=180,revisao=revisao+1 where id='20000000-0000-0000-0000-000000000001';
do $$declare affected int;begin
 delete from public.sala_documentos where id='20000000-0000-0000-0000-000000000001';get diagnostics affected=row_count;if affected<>0 then raise exception 'Jogador apagou nota do mestre';end if;
 delete from storage.objects;get diagnostics affected=row_count;if affected<>0 then raise exception 'Jogador apagou arquivo do mestre';end if;
end$$;
insert into public.sala_rolagens(sala_id,nome,habilidade,a,b,nivel,modificador,alvo) values('10000000-0000-0000-0000-000000000001','Jogador','Força',4,5,2,-1,9);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$begin if exists(select 1 from public.sala_rolagens) then raise exception 'Rolagem vazou para outra conta';end if;end$$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$begin if (select total from public.sala_rolagens limit 1)<>10 then raise exception 'Soma incorreta';end if;end$$;
delete from storage.objects;
delete from public.sala_documentos;
reset role;
select 'PASS: isolamento, associação, papel mestre, resumos sem diário, edição de notas e arquivos privados';
