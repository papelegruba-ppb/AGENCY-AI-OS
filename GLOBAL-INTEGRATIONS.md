# Conectores globales de Agency AI OS

Ahrefs y Microsoft Clarity se registran como **integraciones generales de la plataforma**, no como propiedades de un proyecto de cliente ni como datos precargados en un briefing.

## Consola
- `integrations.html` es la consola privada global.
- Se accede mediante la sesión de propietario.
- Permite comprobar la configuración y ejecutar consultas manuales para un dominio (Ahrefs) o el proyecto Clarity asociado al token.
- No escribe datos en proyectos, no modifica briefings y no persiste dominios de cliente.

## Secretos globales de Cloudflare Pages
- `AHREFS_API_KEY`: API key de Ahrefs.
- `CLARITY_API_TOKEN`: token Data Export de Microsoft Clarity.
- `AGENCY_KV`: binding requerido para caché y guardia preventiva de Clarity.

## Endpoints privados
- `GET /api/integrations/ahrefs?metric=domain-rating&target=example.com`
- `GET /api/integrations/clarity?numOfDays=1&dimension1=URL`

Ambos endpoints requieren sesión de propietario y same-origin. Los tokens nunca se devuelven al cliente.

## Particularidades y cuotas
### Ahrefs
La API usa `Authorization: Bearer`. El proxy limita los nombres de endpoint a una lista permitida y valida el dominio. Las respuestas se cachean seis horas en KV. El coste/unidades depende del plan Ahrefs.

### Microsoft Clarity
La API oficial admite `numOfDays=1|2|3` y hasta tres dimensiones (`Browser, Device, Country/Region, OS, Source, Medium, Campaign, Channel, URL`). Devuelve datos en UTC, máximo 1.000 filas, sin paginación y limita a 10 llamadas por proyecto y día. El proxy cachea cuatro horas y aplica una guardia preventiva de 8 llamadas/día por despliegue. Cloudflare KV es eventualmente consistente: esta guardia no es un límite atómico ni sustituye la cuota de Microsoft.

**Importante:** Microsoft emite el token desde Settings → Data Export dentro de un proyecto Clarity. El token queda asociado a ese proyecto; el endpoint no acepta un project ID. El conector de Agency AI OS es global, pero el token activo determina qué proyecto de Clarity devuelve datos. Para cambiar el origen, reemplazar el secreto global `CLARITY_API_TOKEN`. No se asocia automáticamente a proyectos de clientes.

## Estado
Backend y consola incorporados en rama de trabajo. Para pruebas reales hay que configurar secretos en Cloudflare Pages, comprobar el binding KV y desplegar la rama.
