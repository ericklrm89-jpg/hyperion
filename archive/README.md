# Hyperion Legacy Archive

Este directorio contiene scripts experimentales, prototipos de automatización DOM ad-hoc y exploraciones heurísticas desarrolladas durante las fases iniciales de investigación y desarrollo de Hyperion.

## 📁 Estructura

- **`facebook-legacy/`**: Scripts de experimentación para navegación, subida de reels, manejo de diálogos y etiquetado sintético en Facebook. Han sido consolidados en la acción modular tipada `facebook-post` (`src/tools/facebook/postToFacebook.ts`).
- **`instagram-legacy/`**: Scripts exploratorios para publicación de stories, posts y reels en Instagram.
- **`tiktok-legacy/`**: Scripts exploratorios de gestión y subida en TikTok Studio.
- **`whatsapp-legacy/`**: Exploraciones de lectura y respuesta en WhatsApp Web.
- **`gemini-legacy/`**: Scripts de interacción con Gemini Web.
- **`exploratory/`**: Pruebas de concepto de capas overlay, bridges CDP y utilidades temporales de migración.

## ⚠️ Propósito y Alcance

1. **No forman parte del runtime activo de npm**: Estos archivos son mantenidos exclusivamente como documentación y registro histórico de patrones DOM y selectores.
2. **Uso en producción**: Las nuevas capacidades deben implementarse como herramientas tipadas con Zod y registrarse en `ActionRegistry` (`src/core/ActionRegistry.ts`), asegurando tipado estricto, tolerancia a fallos, soporte para MCP stdio y trazabilidad completa.
