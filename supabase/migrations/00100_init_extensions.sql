-- =============================================================================
-- 1. Extensiones y tipos
-- =============================================================================
create extension if not exists "pgcrypto";

-- Tipo enum para estados de reserva
do $$ begin
  create type reservation_status as enum (
    'pending',
    'confirmed',
    'rejected',
    'cancelled_by_client',
    'cancelled_by_business',
    'expired',
    'completed'
  );
exception when duplicate_object then null; end $$;

-- Tipo enum para roles de miembro
do $$ begin
  create type business_role as enum ('owner', 'manager');
exception when duplicate_object then null; end $$;

-- Tipo enum para tipo de excepción
do $$ begin
  create type exception_type as enum ('closed', 'blocked');
exception when duplicate_object then null; end $$;

-- Tipo enum para estado de notificación
do $$ begin
  create type notification_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;
