-- Planes iniciales (PROPUESTA, editables por el coach). Ejecutar una vez.
insert into public.plans (workspace_id, name, features)
select id, 'Esencial', array['training','daily_report','progress','announcements','education_basic'] from public.workspaces;
insert into public.plans (workspace_id, name, features)
select id, 'Completo', array['training','daily_report','progress','announcements','nutrition','education_basic','education_full'] from public.workspaces;
