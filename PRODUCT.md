# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary (landing conversion target):** owners/managers of sports-court businesses (fútbol, pádel, tenis) in Colombia / LatAm. They currently take bookings by WhatsApp/phone.
- **Secondary:** any business managing bookable spaces (salas, consultorios, mesas) — mentioned as reach, not lead.
- **End users:** clients who check availability and request a turno; they can browse without registering.

## Product Purpose

TuTurno lets a business publish real-time availability and receive reservation requests, with manual confirm/reject by the owner. Success for the landing: a court owner tries the demo or submits a business signup request.

## Positioning

Real-time availability + manual approval flow, mobile-first, in Spanish, with a per-business public page (`/b/{slug}`) and WhatsApp contact. Not a generic scheduling tool: the product is the public availability page plus the admin panel.

## Operating Context

- Spanish-speaking, LatAm market; timezone `America/Bogota`.
- Mobile-first usage; owners manage from their phone.
- Public pages per business: `/b/{slug}`; demo at `/b/demo`.
- Roles: owner, manager, client; platform operator panel at `/plataforma`.
- Signup flow: user registers → submits request at `/crear-negocio` → operator approves.

## Capabilities and Constraints

- Real-time availability grid, day picker, time slots, manual confirm/reject/cancel.
- Email notifications (Resend), WhatsApp FAB, PWA install prompt.
- Multi-resource (multiple courts/spaces), schedules, exceptions/closures.
- Supabase backend; claims must not invent features beyond what exists.
- **Pricing:** undecided. Landing may show a generic "desde $X/mes" placeholder; real number to be confirmed by owner.

## Brand Commitments

- Name: TuTurno. Voice: Spanish, direct, informal-professional (tuteo).
- Existing visual world (app): "cancha nocturna" — pitch green `#0a7d3b` family, chalk surfaces, floodlight yellow `#facc15` accent, Geist/Geist Mono, warm graphite neutrals.
- Logo: calendar-check glyph (see app header / index.html).

## Evidence on Hand

- Live demo at `/b/demo` (2 courts, seeded data) — real product truth for screenshots/comp references.
- Real FAQ and feature list already in `src/pages/landing.tsx` — reusable copy.
- No testimonials, no customer logos, no real pricing — must not be fabricated.

## Product Principles

1. Mobile-first always; 44px touch targets; states as text+icon+color.
2. The demo sells: the landing should push `/b/demo` as primary proof.
3. Persuade surface: court owners first, other verticals as secondary reach.
4. No invented commercial claims (prices, customers, metrics).
