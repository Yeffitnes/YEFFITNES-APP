-- Objetivo actual del cliente: lo define el coach y el cliente lo ve en "Hoy". El cliente no puede escribirlo (clients solo tiene política de lectura para él).
alter table public.clients add column objective text check (objective is null or length(objective) <= 500), add column objective_at timestamptz;
