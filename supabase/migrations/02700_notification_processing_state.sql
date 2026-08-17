-- =============================================================================
-- 02700: Estado 'processing' en notification_outbox para claim atómico
--
-- La Edge Function send-notifications seleccionaba filas con status='pending'
-- sin bloqueo, así que dos ejecuciones solapadas (cron + manual, o un run que
-- tarda >60s) tomaban las mismas filas y enviaban correos duplicados.
--
-- Solución: la Edge Function hace un UPDATE ... WHERE status='pending'
-- RETURNING * para reclamar filas atómicamente (cambiándolas a 'processing'),
-- las envía, y las marca 'sent' o las devuelve a 'pending' si Resend falla.
-- =============================================================================

do $$ begin
  alter type public.notification_status add value 'processing' after 'pending';
exception
  when duplicate_object then null;
  when duplicate_value then null;
end $$;
