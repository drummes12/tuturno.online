-- =============================================================================
-- 02400: Instrucciones de reserva personalizables por negocio
--
-- Permite que cada negocio configure instrucciones en Markdown que el cliente
-- ve antes de enviar su solicitud de reserva (pasos de abono, validación 1:1,
-- contacto por WhatsApp, etc.).
--
-- Límite de 1000 caracteres para mantener el contenido conciso y legible en móvil.
-- =============================================================================

alter table public.businesses
  add column if not exists reservation_instructions_md text
  check (reservation_instructions_md is null
         or char_length(reservation_instructions_md) <= 1000);

comment on column public.businesses.reservation_instructions_md is
  'Instrucciones en Markdown (máx 1000 caracteres) que el cliente ve antes de reservar. Pasos manuales de abono/confirmación.';
