-- 25. WhatsApp link override
-- =============================================================================
-- Some businesses prefer to be contacted via a WhatsApp username/link (wa.me/<username>)
-- rather than a phone number. This column stores that override.
-- When NULL, the FAB falls back to the business phone number.
-- =============================================================================

alter table public.businesses
  add column if not exists whatsapp_link text;
