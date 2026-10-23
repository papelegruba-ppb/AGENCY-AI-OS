# DESIGN.md — Agency AI OS

## Dirección visual
Interfaz de trabajo luminosa, futurista y cercana a una suite creativa premium. La identidad combina una navegación negra sobria con superficies blancas, lila como acento principal y naranja/amarillo para energía, creatividad y acciones importantes. Evitar el look de “hacker terminal” y los fondos oscuros en todas las pantallas.

## Paleta
- Negro tinta / navegación: `#111116`
- Fondo principal: `#F5F5F9`
- Superficie: `#FFFFFF`
- Lila principal: `#A678FF`
- Lila profundo: `#7542E8`
- Naranja: `#FF8A35`
- Amarillo: `#FFBF36`
- Verde de estado positivo: `#21885C`
- Texto principal: `#17151D`
- Texto secundario: `#696777`
- Bordes: `#E7E6EF`

## Tipografía
Sistema sans-serif moderno con jerarquía clara; encabezados compactos y firmes, cuerpo legible, metadatos monoespaciados solo cuando aporten lectura técnica. No depender de fuentes externas para renderizar correctamente.

## Componentes
- Sidebar negra fija con marca degradada lila-naranja-amarillo y navegación activa lila.
- Barra superior blanca translúcida con breadcrumb y CTA.
- Hero del dashboard en gradiente lila-blanco-naranja.
- Tarjetas blancas, bordes suaves, sombras ligeras y radios de 16–18 px.
- CTA principal con degradado lila a naranja y texto blanco.
- Estados semánticos: verde para éxito, amarillo/naranja para atención, lila para acciones creativas.
- Formularios blancos con bordes de bajo contraste y foco visible.

## Movimiento
Transiciones cortas y discretas en vistas y tarjetas; brillo sutil al hover del CTA. No añadir librerías de animación en esta fase. Respetar `prefers-reduced-motion`.

## Responsive y accesibilidad
Diseño de escritorio con sidebar, navegación móvil desplegable y formularios en una columna en pantallas estrechas. Mantener contraste, estados de foco visibles, HTML semántico y controles utilizables con teclado.

## Principio de producto
Debe sentirse como un espacio personal de trabajo creativo: profesional, expresivo y organizado. La interfaz no debe sacrificar claridad ni rendimiento por el efecto visual.
