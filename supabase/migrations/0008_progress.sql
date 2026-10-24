-- Progreso: mediciones y fotos privadas. El plan debe incluir 'progress'; las fotos exigen consentimiento.
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,1) check (weight_kg between 20 and 400),
  waist_cm numeric(5,1) check (waist_cm between 10 and 300),
  hip_cm numeric(5,1) check (hip_cm between 10 and 300),
  chest_cm numeric(5,1) check (chest_cm between 10 and 300),
  arm_cm numeric(5,1) check (arm_cm between 5 and 150),
  thigh_cm numeric(5,1) check (thigh_cm between 10 and 200),
  recorded_by text not null default 'client' check (recorded_by in ('client','coach')),
  created_at timestamptz not null default now(),
  unique (client_id, measured_on),
  check (weight_kg is not null or waist_cm is not null or hip_cm is not null or chest_cm is not null or arm_cm is not null or thigh_cm is not null)
);
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  taken_on date not null default current_date,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index on public.measurements (client_id, measured_on desc);
create index on public.progress_photos (client_id, taken_on desc);
alter table public.measurements enable row level security;
alter table public.progress_photos enable row level security;

create function public.client_has_consent() returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.clients where profile_id = auth.uid() and image_consent_at is not null) $$;
create function public.give_image_consent() returns void language sql security definer set search_path = public
as $$ update public.clients set image_consent_at = now() where profile_id = auth.uid() and image_consent_at is null $$;

create policy me_coach on public.measurements for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy me_client_read on public.measurements for select using (client_id = public.my_client_id());
create policy me_client_ins on public.measurements for insert with check (client_id = public.my_client_id() and recorded_by = 'client' and public.client_has_feature('progress'));
create policy me_client_upd on public.measurements for update using (client_id = public.my_client_id() and public.client_has_feature('progress')) with check (recorded_by = 'client');
create policy ph_coach_read on public.progress_photos for select using (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy ph_client_read on public.progress_photos for select using (client_id = public.my_client_id());
create policy ph_client_ins on public.progress_photos for insert with check (client_id = public.my_client_id() and public.client_has_feature('progress') and public.client_has_consent());
create policy ph_client_del on public.progress_photos for delete using (client_id = public.my_client_id());

-- Almacenamiento PRIVADO. Ruta: <workspace>/<cliente>/<archivo>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg','image/webp']) on conflict (id) do nothing;
create policy "fotos: el cliente sube a su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[2] = public.my_client_id()::text and public.client_has_feature('progress') and public.client_has_consent());
create policy "fotos: el cliente ve y borra las suyas" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[2] = public.my_client_id()::text);
create policy "fotos: el cliente borra las suyas" on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[2] = public.my_client_id()::text);
create policy "fotos: el coach ve las de su espacio" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach');
