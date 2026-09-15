# Roadmap: Mi Receta - alertas por limite de solicitudes pendientes
**Date**: 2026-09-08
**PM**: Agent PM
**Status**: APPROVED FOR IMPLEMENTATION

---

## Milestones

### M1: Alertas operativas de WhatsApp
**Description**: Permitir que administradores configuren un umbral de solicitudes pendientes y los telefonos que reciben la alerta.
**Stories**: US-001

### M2: Experiencia movil del formulario de medicacion
**Description**: Compactar la seleccion del metodo de carga para aprovechar mejor el ancho disponible en celulares.
**Stories**: US-002

---

## User Stories

### US-001: Configurar alertas por cola pendiente (M1)
**As** administrador de un tenant
**I want** configurar telefonos administrativos y un limite de solicitudes pendientes
**So that** administradores y colaboradores reciban una alerta de WhatsApp cuando la cola operativa supere ese limite
**Summary**: Agrega configuracion, validacion y envio de la plantilla Meta `limite_solicitudes` en idioma `es_AR` al cruzar el umbral.
**Complexity**: M

### US-002: Mostrar metodos de carga en una fila en celulares (M2)
**As** paciente que completa una solicitud desde el celular
**I want** ver las tres alternativas de carga una junto a la otra
**So that** pueda compararlas y elegirlas sin desplazarme verticalmente
**Summary**: Convierte el selector movil en tres tarjetas compactas horizontales, conservando la presentacion amplia en escritorio.
**Complexity**: S

---

## Out of Scope

- Crear o aprobar la plantilla en Meta Business Manager.
- Enviar alertas por email u otros canales.
- Modificar solicitudes o pagos existentes.

---

## DevOps Notes
**DevOps Required: NO**

El esquema existente de configuracion ya admite ajustes flexibles y no requiere migracion.
