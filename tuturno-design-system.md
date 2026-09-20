# TuTurno — Rediseño de identidad visual y UI

## 1. Dirección general

TuTurno debe transmitir:

- Organización
- Confianza
- Simplicidad
- Modernidad
- Cercanía
- Eficiencia

La aplicación debe sentirse como una herramienta **SaaS profesional para gestionar turnos y reservas**, pero sin verse corporativa, fría o excesivamente tecnológica.

La identidad visual gira alrededor del concepto:

> **Más que turnos, son oportunidades.**

El diseño debe priorizar **claridad, jerarquía visual y facilidad de uso** sobre decoración.

---

# 2. Logo

## Logo principal

Utilizar como símbolo principal un:

**Calendario + reloj**

El calendario representa:

- Organización
- Agenda
- Turnos
- Reservas

El reloj representa:

- Tiempo
- Puntualidad
- Disponibilidad
- Gestión eficiente

El símbolo debe ser reconocible incluso sin el texto `TuTurno`.

### Composición

```text
[ ICONO ]  TuTurno
```

El wordmark debe utilizar una tipografía sans-serif moderna, pesada y ligeramente redondeada.

El logo no debe utilizar:

- sombras excesivas
- efectos 3D
- demasiados degradados
- detalles pequeños
- elementos decorativos innecesarios

Debe funcionar perfectamente en:

- 24px
- 32px
- 48px
- 96px
- 192px
- 512px
- 1024px

---

# 3. Icono de aplicación

El icono debe ser el elemento visual principal de la marca.

### Forma

Usar un cuadrado con esquinas redondeadas.

**Border radius recomendado: `1.25rem`**

No utilizar un círculo como contenedor principal.

La forma cuadrada redondeada debe mantenerse consistente con la UI de la aplicación.

### Icono

Representación simplificada de:

**Calendario + reloj**

---

# 4. Sistema de bordes

Esta es una regla importante para toda la aplicación.

## Border radius base

```css
--radius: 1.25rem;
```

como radio principal.

Pero **no significa que absolutamente todo tenga `1.25rem`**.

Crear una escala:

```css
--radius-sm: 0.5rem;
--radius-md: 0.75rem;
--radius-lg: 1rem;
--radius-xl: 1.25rem;
--radius-2xl: 1.5rem;
```

### Uso recomendado

| Elemento | Radius |
|---|---:|
| Inputs pequeños | `0.75rem` |
| Badges | `9999px` |
| Buttons | `0.75rem` – `1rem` |
| Cards | `1.25rem` |
| Modales | `1.25rem` – `1.5rem` |
| Bottom navigation | `1.5rem` |
| App icon | `1.25rem` |
| Contenedores principales | `1.25rem` |

### Regla

No utilizar `9999px` para todos los componentes.

Los elementos tipo **pill** sí deben ser completamente redondeados:

```text
[  EN VIVO  ]
[  LIBRE    ]
[  3 DISPONIBLES ]
```

Pero una card debe conservar su estructura rectangular.

Esto genera una jerarquía visual mucho más fuerte.

---

# 5. Filosofía de las formas

La identidad combina:

### Formas rectangulares redondeadas

Para:

- cards
- modales
- contenedores
- navegación
- inputs

### Pills

Para:

- estados
- filtros
- disponibilidad
- etiquetas
- indicadores

### Círculos

Reservarlos para:

- iconos
- avatars
- indicadores
- botones flotantes

No convertir toda la UI en pills.

---

# 6. Paleta de colores

## Light mode

### Primary

```text
#0F7A4A
```

Uso:

- acciones principales
- botones
- navegación activa
- estados seleccionados
- branding

### Primary Light

```text
#34D399
```

Uso:

- highlights
- estados positivos
- elementos secundarios
- indicadores

### Background

```text
#F7FAF8
```

El fondo debe ser ligeramente verdoso, no blanco puro.

### Surface

```text
#FFFFFF
```

Para:

- cards
- dialogs
- sheets
- navegación

### Surface Secondary

```text
#EEF5F1
```

Para:

- áreas secundarias
- filtros
- estados suaves
- backgrounds de iconos

### Text Primary

```text
#0B1F17
```

### Text Secondary

```text
#5F7168
```

### Border

```text
#DCE7E1
```

---

# 7. Dark mode

El dark mode **no debe ser simplemente invertir los colores**.

Debe mantener el carácter verde de la marca.

### Background

```text
#071510
```

### Surface

```text
#0D2119
```

### Surface Secondary

```text
#143326
```

### Primary

```text
#34D399
```

### Primary Strong

```text
#22B978
```

### Text Primary

```text
#F2F8F5
```

### Text Secondary

```text
#9BAFA5
```

### Border

```text
#244136
```

---

# 8. Degradados

Los degradados deben ser **un recurso de branding**, no algo presente en todos los componentes.

Ejemplo:

```css
background: linear-gradient(
  135deg,
  #34D399,
  #0F7A4A
);
```

Usarlos principalmente en:

- logo
- app icon
- hero
- elementos de marketing
- estados especiales

Evitar degradados en:

- cada botón
- cada card
- cada badge
- cada sección

---

# 9. Tipografía

Utilizar:

**Inter**

como familia tipográfica principal.

### Display

```text
font-weight: 700 / 800
```

Para títulos principales.

### Heading

```text
font-weight: 700
```

### Body

```text
font-weight: 400 / 500
```

### Labels

```text
font-weight: 500 / 600
```

---

# 10. Iconografía

Los iconos deben compartir un mismo lenguaje visual.

Preferencia:

- outline
- stroke consistente
- esquinas ligeramente redondeadas
- formas simples

Evitar mezclar:

```text
outline + filled + 3D + duotone
```

dentro de la misma pantalla.

Los iconos deben sentirse parte del mismo sistema.

---

# 11. Espaciado

Utilizar un sistema basado en múltiplos de `4px`.

```text
4
8
12
16
20
24
32
40
48
64
```

La mayoría de componentes deberían trabajar alrededor de:

```text
16px
20px
24px
32px
```

Evitar márgenes arbitrarios.

---

# 12. Cards

Las cards deben ser:

- blancas en light
- ligeramente elevadas respecto al background
- radius `1.25rem`
- border sutil
- sombra muy ligera

La profundidad debe venir principalmente de:

**background + border + contraste**, no de `box-shadow`.

No utilizar sombras fuertes.

---

# 13. Estados

Los estados deben ser inmediatamente reconocibles.

### Disponible

```text
● LIBRE
```

Color:

```text
#0F7A4A
```

### Ocupado

Utilizar un estado neutro, evitando rojo intenso si no representa un error.

```text
OCUPADO
```

### Error

Rojo únicamente para:

- errores
- acciones destructivas
- problemas reales

No usar rojo simplemente porque una reserva esté ocupada.

---

# 14. Información pública

La aplicación tiene dos contextos:

### Público

El usuario puede consultar disponibilidad y reservar.

No mostrar:

- nombres de otros clientes
- teléfonos
- información personal
- información de pago
- datos internos del negocio

La información pública debe limitarse a:

```text
Hora
Disponibilidad
Cancha / recurso
Duración
Acción de reserva
```

---

# 15. Reservas

Como inicialmente todos los turnos tienen la misma duración:

**No repetir la duración en cada slot.**

En lugar de:

```text
15:00
60 min
Libre

16:00
60 min
Libre
```

mostrar:

```text
Cancha A
Turnos de 1 hora

15:00                         Libre
16:00                         Libre
17:00                         Libre
```

La duración se comunica una sola vez.

Esto reduce ruido visual.

---

# 16. Pantalla pública de disponibilidad

La jerarquía debería ser:

```text
Nombre del negocio

Fecha

Días disponibles

Recurso seleccionado

Duración del turno

Disponibilidad

Acción
```

Ejemplo:

```text
Canchas El Parque

Sábado 19 de septiembre

[ HOY 19 ] [ DOM 20 ] [ LUN 21 ]

[ Cancha A ] [ Cancha B ]

Turnos de 1 hora

TARDE                         3 LIBRES

15:00                         Libre
16:00                         Libre
17:00                         Libre

NOCHE                         2 LIBRES

18:00                         Libre
19:00                         Ocupado
```

---

# 17. Navegación

La navegación inferior debe utilizar el mismo lenguaje de formas.

No hacer que cada item tenga un contenedor independiente.

Usar una única superficie para toda la navegación:

```text
╭──────────────────────────────────────╮
│                                      │
│  Operación   Reservas   Recursos ... │
│                                      │
╰──────────────────────────────────────╯
```

El elemento activo debe identificarse principalmente mediante:

- color
- icono
- pequeño indicador inferior

No mediante demasiados backgrounds.

---

# 18. Floating Action Button

El botón flotante puede ser circular.

A diferencia de las cards, aquí sí tiene sentido.

Utilizar `Primary`.

Debe representar una acción contextual importante.

---

# 19. Logo en navegación

En espacios pequeños utilizar solamente:

```text
[ TuTurno ICON ]
```

En espacios donde exista suficiente espacio:

```text
[ICON] TuTurno
```

No reducir el wordmark hasta hacerlo ilegible.

---

# 20. Slogan

### Slogan principal

> **Más que turnos, son oportunidades.**

Debe utilizarse principalmente en:

- landing page
- OG image
- onboarding
- presentación comercial
- materiales de marketing

No necesariamente en el dashboard.

---

# 21. Messaging de marca

La marca debe hablar de:

**Resultado**, no solamente de funcionalidad.

En lugar de:

> Gestiona tus turnos.

Preferir:

> Organiza tus turnos y haz crecer tu negocio.

En lugar de:

> Sistema de reservas.

Preferir:

> Todo tu negocio, organizado en un solo lugar.

En lugar de:

> Reserva online.

Preferir:

> Dale a tus clientes una forma simple de reservar.

---

# 22. OG Image

Crear una imagen:

```text
1200 × 630 px
```

Composición recomendada:

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│   [ ICON ]                                      │
│                                                 │
│   TuTurno                                       │
│   Más que turnos,                               │
│   son oportunidades.                            │
│                                                 │
│                              elementos verdes   │
│                              abstractos         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Background

Utilizar:

```text
#071510
```

o un verde oscuro de branding.

### Logo

Icono + `TuTurno`

### Headline

> Más que turnos, son oportunidades.

### Supporting text

> Gestiona tus reservas de forma simple, rápida y eficiente.

No colocar demasiada información.

La OG debe poder entenderse en **1–2 segundos**.

---

# 23. Metadata

```ts
export const metadata = {
  title: 'TuTurno | Turnos y reservas para tu negocio',

  description:
    'Gestiona tus turnos y reservas de forma simple, rápida y eficiente.',

  openGraph: {
    title: 'TuTurno | Turnos y reservas para tu negocio',

    description:
      'Más que turnos, son oportunidades.',

    type: 'website',

    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TuTurno — Más que turnos, son oportunidades.',
      },
    ],
  },
};
```

---

# 24. Favicon / PWA

Utilizar **únicamente el símbolo calendario + reloj**.

No utilizar `TuTurno` dentro del favicon.

Versiones necesarias:

```text
favicon.svg
favicon.ico
apple-touch-icon.png
icon-192.png
icon-512.png
```

Para PWA:

```text
icon-192.png
icon-512.png
```

deben utilizar el mismo icono principal.

---

# 25. Regla más importante del nuevo diseño

La UI debe seguir esta jerarquía:

> **Contenido → Estado → Acción → Decoración**

No:

> Decoración → Cards → Pills → Sombras → Contenido

Cada elemento visual debe ayudar al usuario a entender:

- ¿Dónde estoy?
- ¿Qué puedo hacer?
- ¿Qué está disponible?
- ¿Qué ocurrirá si toco esto?

---

# Resumen para el dev

```text
TuTurno
│
├── Identidad
│   ├── Calendario + reloj
│   ├── Verde como color principal
│   ├── Inter
│   └── "Más que turnos, son oportunidades."
│
├── Shapes
│   ├── Cards: 1.25rem
│   ├── Containers: 1.25rem
│   ├── Buttons: 0.75–1rem
│   ├── Pills: 9999px
│   └── FAB: circular
│
├── UI
│   ├── Menos sombras
│   ├── Menos pills innecesarias
│   ├── Más jerarquía
│   ├── Más whitespace
│   └── Información más compacta
│
├── Público
│   ├── Solo disponibilidad
│   ├── Sin datos de otros clientes
│   └── Sin información financiera
│
└── Branding
    ├── Logo
    ├── App icon
    ├── Favicon
    ├── PWA icons
    ├── OG 1200×630
    └── Dark / Light
```

## Principio final

**No alinear toda la aplicación con `1.25rem` literalmente.**

Alinear el **lenguaje visual** con `1.25rem`.

Una card puede tener `1.25rem`, un botón `0.75rem`, un badge `9999px` y un FAB circular. La variación controlada es lo que crea jerarquía y hace que la interfaz se sienta diseñada como un sistema coherente.
