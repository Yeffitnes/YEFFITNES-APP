-- Pruebas de 0060: avisos a Yeff cuando un cliente reserva o cancela. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; sid uuid; bid uuid; n int; bad text:='';
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a;
  update public.clients set status = 'active' where id = ca;
  update public.bookings set status = 'cancelled', cancelled_at = now() - interval '1 day', cancelled_by = 'client' where client_id = ca and status = 'confirmed';   -- una reserva futura a la vez
  insert into public.push_subscriptions values ('https://push.example/jeff-bk', jeff, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;
  insert into public.availability_slots (workspace_id, starts_at, kind) values (ws, date_trunc('hour', now()) + interval '6 days 3 hours', 'followup') returning id into sid;
  -- 1) A reserva: un aviso para Yeff, y no se repite
  perform pg_temp.as_user(a);
  bid := public.book_slot(sid);
  select count(*) into n from public.booking_coach_targets(bid, 'booked') where endpoint like 'https://push.example/jeff%'; if n < 1 then bad:=bad||' [no avisó la reserva]'; end if;
  select count(*) into n from public.booking_coach_targets(bid, 'booked'); if n <> 0 then bad:=bad||' [avisó dos veces la reserva]'; end if;
  select count(*) into n from public.booking_coach_targets(bid, 'cancelled'); if n <> 0 then bad:=bad||' [avisó una cancelación que no hubo]'; end if;
  -- 2) Nadie más puede pedir el aviso de esa reserva
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.booking_coach_targets(bid, 'cancelled'); if n <> 0 then bad:=bad||' [el coach pidió el aviso]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.booking_coach_targets(bid, 'booked'); if n <> 0 then bad:=bad||' [otro coach pidió el aviso]'; end if;
  -- 3) A cancela: un aviso, una vez
  perform pg_temp.as_user(a);
  perform public.cancel_booking(bid);
  select count(*) into n from public.booking_coach_targets(bid, 'cancelled') where endpoint like 'https://push.example/jeff%'; if n < 1 then bad:=bad||' [no avisó la cancelación]'; end if;
  select count(*) into n from public.booking_coach_targets(bid, 'cancelled'); if n <> 0 then bad:=bad||' [avisó dos veces la cancelación]'; end if;
  -- 4) Si la cancela el coach, el cliente no dispara aviso al coach
  perform pg_temp.reset();
  update public.bookings set status = 'confirmed', cancelled_at = null, cancelled_by = null, coach_cancel_notified_at = null where id = bid;
  perform pg_temp.as_user(jeff); perform public.cancel_booking(bid);
  perform pg_temp.as_user(a);
  select count(*) into n from public.booking_coach_targets(bid, 'cancelled'); if n <> 0 then bad:=bad||' [avisó al coach su propia cancelación]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES AVISOS DE RESERVAS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
