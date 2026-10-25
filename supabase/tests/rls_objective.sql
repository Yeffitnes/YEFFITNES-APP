-- Pruebas de ataque del Objetivo. Ejecutar DESPUÉS de rls_onboarding.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; n int; bad text:=''; t text;
begin
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.as_user(jeff);
  update public.clients set objective='Bajar grasa manteniendo fuerza', objective_at=now() where id=ca;
  select objective into t from public.clients where id=ca; assert t is not null;
  perform pg_temp.as_user(a);
  select objective into t from public.clients where id=ca; assert t like 'Bajar%', 'A debe ver su objetivo';
  update public.clients set objective='trampa' where id=ca; get diagnostics n = row_count;
  select objective into t from public.clients where id=ca; if t='trampa' then bad:=bad||' [cliente cambió su objetivo]'; end if;
  select count(*) into n from public.clients where id=cb; if n<>0 then bad:=bad||' [A ve la fila de B]'; end if;
  perform pg_temp.as_user(o);
  update public.clients set objective='robado' where id=ca;
  perform pg_temp.reset(); select objective into t from public.clients where id=ca; if t='robado' then bad:=bad||' [otro coach cambió un objetivo]'; end if;
  raise notice 'RESULTADO ATAQUES OBJETIVO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
