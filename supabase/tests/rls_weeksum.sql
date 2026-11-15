-- Pruebas de ataque de 0053: resumen de la semana. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; sid uuid; sid2 uuid; n int; bad text:=''; today date := (now() at time zone 'America/Bogota')::date; t text;
begin
  perform pg_temp.reset(); select id into ca from public.clients where profile_id=a;
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.send_week_summary(%L, 1, %L, %L)', ca, today - 10, 'yo')) then bad:=bad||' [el cliente se envió un resumen]'; end if;
  perform pg_temp.as_user(o);
  if not pg_temp.fails(format('select public.send_week_summary(%L, 1, %L, null)', ca, today - 10)) then bad:=bad||' [otro coach envió a un cliente ajeno]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails(format('select public.send_week_summary(%L, 1, %L, null)', ca, today - 3)) then bad:=bad||' [envió una semana sin terminar]'; end if;
  if not pg_temp.fails(format('select public.send_week_summary(%L, 1, %L, %L)', ca, today - 10, repeat('x', 1001))) then bad:=bad||' [comentario de más de 1000]'; end if;
  sid := public.send_week_summary(ca, 1, today - 10, 'Gran semana');
  select body into t from public.messages where id = (select message_id from public.week_summaries where id = sid);
  if t not like 'Gran semana%resumen de tu semana 1%' then bad:=bad||' [el mensaje no salió bien: '||coalesce(t,'-')||']'; end if;
  sid2 := public.send_week_summary(ca, 1, today - 10, 'Otra vez');
  if sid2 <> sid then bad:=bad||' [reenviar creó otro resumen]'; end if;
  perform pg_temp.as_user(b);
  select count(*) into n from public.week_summaries; if n > 0 then bad:=bad||' [el cliente B ve el resumen de A]'; end if;
  perform public.see_week_summary(sid);
  perform pg_temp.reset(); if (select seen_at from public.week_summaries where id = sid) is not null then bad:=bad||' [B lo marcó visto]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.week_summaries; if n <> 1 then bad:=bad||' [el cliente no ve su resumen]'; end if;
  if not pg_temp.fails(format('update public.week_summaries set note = %L where id = %L', 'hack', sid)) then
    if (select note from public.week_summaries where id = sid) = 'hack' then bad:=bad||' [el cliente cambió el comentario]'; end if; end if;
  perform public.see_week_summary(sid);
  perform pg_temp.reset(); if (select seen_at from public.week_summaries where id = sid) is null then bad:=bad||' [no quedó visto]'; end if;
  if (select read_at from public.messages where id = (select message_id from public.week_summaries where id = sid)) is null then bad:=bad||' [el mensaje no quedó leído]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.week_summaries; if n > 0 then bad:=bad||' [otro coach ve resúmenes de Jeff]'; end if;
  perform pg_temp.reset(); delete from public.week_summaries; delete from public.messages where body like '%resumen de tu semana%';
  raise notice 'RESULTADO ATAQUES RESUMEN SEMANAL: %', coalesce(nullif(bad,''),'ninguno');
end $$;
