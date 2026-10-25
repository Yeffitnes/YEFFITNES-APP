-- Pruebas de ataque del Onboarding. Ejecutar DESPUÉS de rls_nutrition.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cc uuid; n int; bad text:=''; t timestamptz;
begin
  select id into ca from public.clients where profile_id=a; select id into cc from public.clients where profile_id=c;
  perform pg_temp.reset(); update public.clients set status='active' where id=ca; update public.clients set status='pending' where id=cc;
  perform pg_temp.as_user(a);
  begin update public.clients set onboarded_at = now() where id = ca; exception when others then null; end;
  select onboarded_at into t from public.clients where id=ca; if t is not null then bad:=bad||' [cliente escribió onboarded_at directo]'; end if;
  perform public.complete_onboarding(); select onboarded_at into t from public.clients where id=ca; assert t is not null, 'debe quedar marcado';
  perform public.complete_onboarding();   -- repetir no falla ni cambia la fecha
  perform pg_temp.as_user(c);   -- pendiente
  if not pg_temp.fails('select public.complete_onboarding()') then bad:=bad||' [cliente pendiente completó onboarding]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails('select public.complete_onboarding()') then bad:=bad||' [coach usó complete_onboarding]'; end if;
  perform pg_temp.as_user(o);
  if not pg_temp.fails('select public.complete_onboarding()') then bad:=bad||' [otro coach usó complete_onboarding]'; end if;
  raise notice 'RESULTADO ATAQUES ONBOARDING: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
