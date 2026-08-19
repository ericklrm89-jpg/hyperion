# Hyperion Legacy Archive

Este directorio contiene scripts experimentales, prototipos de automatización DOM ad-hoc y exploraciones heurísticas desarrolladas durante las fases iniciales de investigación y desarrollo de Hyperion.

## 📁 Estructura

- **`facebook-legacy/`**: Scripts de experimentación para navegación, subida de reels, manejo de diálogos y etiquetado sintético en Facebook. Han sido consolidados en la acción modular tipada `facebook-post` (`src/tools/facebook/postToFacebook.ts`) bajo el contrato `VerifiedActionResult` con verificación visual reactiva.
- **`instagram-legacy/`**: Scripts exploratorios para publicación de stories, posts y reels en Instagram. *(Pendiente de migración a `ActionRegistry` con verificación visual `verifyWithVision`)*.
- **`tiktok-legacy/`**: Scripts exploratorios de gestión y subida en TikTok Studio. *(Pendiente de migración a `ActionRegistry` con verificación visual `verifyWithVision`)*.
- **`whatsapp-legacy/`**: Exploraciones de lectura y respuesta en WhatsApp Web. *(Pendiente de migración a `ActionRegistry` con verificación visual `verifyWithVision` confirmando ícono de enviado/entregado)*.
- **`gemini-legacy/`**: Scripts de interacción con Gemini Web.
- **`exploratory/`**: Pruebas de concepto de capas overlay, bridges CDP y utilidades temporales de migración.

## 🛡️ Contrato de Verificación Real (`VerifiedActionResult`)

A partir de Hyperion v0.3.0, **ninguna acción que modifique estado externo** (publicar, enviar mensaje, eliminar o editar) puede reportar `success: true` basado únicamente en timeouts fijos o ejecución ciega de pasos.

El estándar oficial del runtime exige:
```ts
interface VerifiedActionResult {
  success: boolean;
  verified: boolean;          // true SOLO si el motor de visión confirmó el estado real en pantalla
  verificationMethod: 'vision' | 'dom-selector' | 'none';
  evidence?: {
    screenshotBase64?: string;
    visionAnalysis: string;   // Análisis descriptivo generado por el motor de percepción
    timestamp: string;
  };
  error?: string;
}
```

## ⚠️ Propósito y Alcance

1. **No forman parte del runtime activo de npm**: Estos archivos son mantenidos exclusivamente como documentación y registro histórico de patrones DOM y selectores.
2. **Uso en producción**: Las nuevas capacidades deben implementarse como herramientas tipadas con Zod en `src/tools/` y registrarse en `ActionRegistry` (`src/core/ActionRegistry.ts`), asegurando tipado estricto, tolerancia a fallos, soporte para MCP stdio y verificación visual obligatoria mediante `src/core/verifyWithVision.ts`.
