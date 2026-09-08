# Roadmap: Mi Receta - alertas por limite de solicitudes pendientes
**Date**: 2026-09-08
**PM**: Agent PM
**Status**: APPROVED FOR IMPLEMENTATION

---

## Milestones

### M1: Alertas operativas de WhatsApp
**Description**: Permitir que administradores configuren un umbral de solicitudes pendientes y los telefonos que reciben la alerta.
**Stories**: US-001

---

## User Stories

### US-001: Configurar alertas por cola pendiente (M1)
**As** administrador de un tenant
**I want** configurar telefonos administrativos y un limite de solicitudes pendientes
**So that** administradores y colaboradores reciban una alerta de WhatsApp cuando la cola operativa supere ese limite
**Summary**: Agrega configuracion, validacion y envio de la plantilla Meta `limite_solicitudes` en idioma `es_AR` al cruzar el umbral.
**Complexity**: M

---

## Out of Scope

- Crear o aprobar la plantilla en Meta Business Manager.
- Enviar alertas por email u otros canales.
- Modificar solicitudes o pagos existentes.

---

## DevOps Notes
**DevOps Required: NO**

El esquema existente de configuracion ya admite ajustes flexibles y no requiere migracion.
