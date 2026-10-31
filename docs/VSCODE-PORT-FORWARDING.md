# Visual Studio Code: preview local y URL compartida

Agency AI OS incluye una tarea de VS Code y un servidor de preview local de solo lectura.

## Requisitos

- Visual Studio Code actualizado.
- Node.js 22 o superior (el proyecto ya usa módulos ESM).
- Repositorio abierto como carpeta en VS Code.

## Iniciar la preview

1. Abre la carpeta raíz del repositorio en VS Code.
2. Ejecuta **Terminal → Run Task… → Agency AI OS: iniciar preview seguro**.
3. La terminal debe mostrar `Agency AI OS preview listening on http://127.0.0.1:8000`.
4. Abre la vista **Ports** (Terminal → Ports). Si el puerto 8000 no aparece, selecciona **Forward a Port** e introduce `8000`.
5. Conserva la visibilidad **Private** para tu propio dispositivo/cuenta. VS Code mostrará una URL de reenvío.
6. Para compartir con terceros, cambia la visibilidad del puerto a **Public** solo durante la revisión, copia la URL generada por VS Code y vuelve a **Private** o detén el servidor al terminar.

La URL la genera VS Code/tu sesión de túnel; no se debe construir manualmente ni guardar en el repositorio. El enlace deja de funcionar al cerrar el servidor o el túnel.

## Qué se comparte y qué no

El servidor escucha exclusivamente en `127.0.0.1`, admite GET/HEAD y sirve únicamente archivos web con extensiones permitidas. Rechaza rutas ocultas, `.git`, `.vscode`, `functions`, `tests`, `scripts`, `docs`, archivos Markdown y métodos de escritura. Añade cabeceras no-cache y anti-MIME-sniffing.

**Importante:** Public significa que cualquiera que obtenga la URL puede acceder al contenido servido. No compartas datos reales de clientes, tokens, claves, exportaciones privadas ni capturas con información sensible. Publicar la preview no la convierte en un entorno autenticado.

## Límites funcionales

- Es una preview estática: no ejecuta Cloudflare Pages Functions ni APIs backend. Los formularios/integraciones que dependan de `/api/*` no deben considerarse operativos en esta URL.
- No es un despliegue de producción ni modifica Cloudflare Pages.
- Para probar Pages Functions localmente, usa Wrangler en un entorno separado y con secretos de desarrollo no productivos; no publiques esos puertos sin una capa de autenticación.
- No se instala ni requiere una extensión de Live Server. El servidor incluido aplica una lista de rutas/formatos permitidos.

## Diagnóstico rápido

- Puerto no aparece: comprueba que la tarea sigue ejecutándose y pulsa **Forward a Port → 8000**.
- URL no carga: confirma que el servidor responde en `http://127.0.0.1:8000` en el mismo equipo.
- No se abre el navegador: copia la URL de la vista Ports y ábrela manualmente.
- Detener: usa el botón de detener de la terminal de tarea (o Ctrl+C).

## Pruebas automatizadas

Desde la raíz del repositorio:

```bash
node --test tests/preview-server.test.mjs
```
