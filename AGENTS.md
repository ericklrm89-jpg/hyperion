# AGENTS.md — Reglas Globales del Agente Antigravity

> Estas reglas aplican a TODAS las conversaciones y proyectos.

---

## PROYECTO FAIRDRAW — REGLAS ABSOLUTAS

### Identidad del Proyecto
- **Nombre:** FairDraw
- **URL:** https://fairdrawapp.com (SOLO WEB — sin App Store / Google Play aun)
- **Logo:** C:\FairDraw\fairdraw-social\assets\logos\logo_real.png
- **Slogan:** "Giveaways you can trust"
- **Prioridad de redes:** Instagram > TikTok > Facebook

### Reglas de Imagen/Contenido
1. SIEMPRE pasar el logo como ImagePaths al generar imagenes — NUNCA describir el logo de memoria.
2. El CTA es fairdrawapp.com — NUNCA mencionar App Store, Google Play ni "download".
3. Formato de posts: vertical 9:16.
4. Idioma principal de posts: ingles.
5. Si el logo generado no es fiel -> usar Gemini Web para la generacion.

### Reglas de Publicacion en Redes
- Scripts en: C:\hyperion\scripts\ (instagram/, tiktok/, facebook/)
- Chrome CDP puerto 9222. Arrancar: C:\hyperion\launch-chrome-debug.bat
- NO borrar posts automaticos del sistema de Facebook (updated profile picture)

---

## SISTEMA HYPERION — REGLAS DE AUTOMATIZACION WEB

### Ley Absoluta #1 — Capa Manus SIEMPRE primero
Antes de hacer clic, escribir o inyectar archivos en el navegador:
1. Inyectar la capa de overlay con badges numericos [1..N]
2. Verificar banner: CAPA ACTIVA: [NOMBRE] [N ELEMENTOS]
3. La capa debe tener bucle dinamico de repintado (250ms) — NUNCA estatica

### Ley #2 — Scripts CDP
- Usar siempre WebSocket sobre CDP (puerto 9222)
- Preferir element.click() nativo DOM sobre coordenadas CDP fisicas
- Para inputs de archivo: usar DOM.setFileInputFiles — NUNCA Input.dispatchMouseEvent
- Esperar minimo 3-6 segundos despues de cada accion critica

---

## LECCIONES APRENDIDAS (Actualizado Agosto 2026)

### Generacion de imagenes y videos
- CORRECTO: Pasar logo como ImagePaths mejora drasticamente la fidelidad
- CORRECTO: Poner "no app store badges" y "ONE single logo only. NO double logo" en el prompt
- CORRECTO: Especificar posicion exacta del logo ("large and centered in the upper half")
- INCORRECTO: Describir el logo solo con texto genera logos genericos
- CRITICO EN VIDEOS: Si las plantillas de diapositivas ya contienen el logo de FairDraw embebido, DESACTIVAR el overlay de watermark (`use_logo_watermark = False`) para evitar renderizar doble logo.

### Publicacion en Facebook Reels
- El flujo de publicacion en Reels consta de 3 etapas: `Subida -> Edit reel (Next) -> Reel settings (Post)`.
- Si el boton "Post" aparece deshabilitado / en gris, Facebook EXIGE activar el toggle **"Add AI label"** para videos con elementos sinteticos.
- En la barra inferior final: Boton izquierdo = "Save" / Guardar borrador (~x=143). Boton derecho = "Post" / Publicar (~x=315, boton azul). NUNCA hacer clic en Save por error.
- Enviar siempre `Escape` doble tras ingresar el caption con hashtags para cerrar el dropdown de sugerencias que bloquea los botones de accion.

### Automatizacion e Higiene de Procesos CDP
- NUNCA usar browser subagents cuando ya existan scripts directos Node CDP sobre el puerto 9222.
- Si una conexion CDP se queda colgada o en timeout, limpiar procesos Node huerfanos con `Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force` antes de reconectar.
- Usar siempre IPv4 `127.0.0.1:9222` (NUNCA `localhost` en Windows).

### Borrado de posts en redes sociales
- Posts automaticos de sistema en Facebook NO se pueden borrar (no tienen "Move to trash")
- En TikTok, borrar videos requiere perfil logueado (no el publico)
- En Instagram, verificar que la pestana este completamente cargada antes de ejecutar scripts

### Orden de trabajo segun Fabro
1. Eliminar material sin calidad
2. Actualizar perfiles con logo real
3. Generar imagenes con subtitulos y locucion
4. Publicar (prioridad Instagram)
