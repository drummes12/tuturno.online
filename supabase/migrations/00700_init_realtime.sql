-- =============================================================================
-- 7. Realtime — publicar cambios relevantes
-- =============================================================================

alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.resources;
