# Agente 8 — Comparativas personalizadas

- Desde Entregables, pulsa **Preparar comparativa**. Se precargan nombre, sector, color, oferta, público, objetivo y copy del proyecto.
- Los proyectos se leen desde `localStorage` (`agency-ai-os.projects.v1`) si el módulo está en el mismo origen.
- Para otro dispositivo/origen, importa el JSON exportado del proyecto.
- Personaliza Antes/Después, añade capturas (hasta 8 MB por imagen) y etiqueta métricas como medición real, estimación, objetivo o pendiente.
- Exporta `propuesta_interactiva_[cliente].html`: archivo autónomo con CSS, JavaScript del slider y capturas embebidas; sin CDN ni dependencias externas.
- La exportación no inventa métricas. Para comparar PageSpeed registra fuente, URL, fecha, dispositivo y condiciones equivalentes.
- Los borradores locales no se sincronizan entre dispositivos y no se envían datos a un servidor.
