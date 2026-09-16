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

### M3: Correccion de aranceles por cobertura
**Description**: Alinear el cobro de PAMI con IOMA y el resto de las obras sociales.
**Stories**: US-003

### M4: Correccion administrativa de pagos
**Description**: Permitir que colaboradores autorizados corrijan la informacion de pago de una solicitud con validacion y auditoria.
**Stories**: US-004

### M5: Carrito lateral de medicacion
**Description**: Reorganizar la carga de medicacion en escritorio con un resumen lateral similar a un checkout de ecommerce.
**Stories**: US-005

### M6: Orden cronologico de conversaciones
**Description**: Ordenar conversaciones y solicitudes por su actividad efectiva mas reciente, sin priorizar artificialmente los elementos que ya tienen mensajes.
**Stories**: US-006

### M7: Orden cronologico de bandejas de pedidos
**Description**: Mostrar la hora de creacion y ordenar cada bandeja operativa con la solicitud mas nueva arriba.
**Stories**: US-007

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

### US-003: Cobrar arancel a solicitudes PAMI (M3)
**As** paciente con cobertura PAMI
**I want** ver y abonar el arancel administrativo correspondiente
**So that** mi solicitud siga la misma regla de cobro que IOMA y las demas obras sociales
**Summary**: Elimina la exencion automatica por PAMI del calculo, el checkout y las vistas de pago, conservando las bonificaciones explicitas.
**Complexity**: S

### US-004: Editar informacion de pago del paciente (M4)
**As** colaborador
**I want** editar la informacion de pago de una solicitud
**So that** pueda corregir datos administrativos sin alterar el resto de la orden
**Summary**: Agrega edicion inline para metodo, monto, estado, identificador y fecha de pago, con autorizacion backend y trazabilidad.
**Complexity**: M

### US-005: Mostrar el carrito a la derecha en escritorio (M5)
**As** paciente que completa una solicitud
**I want** ver el carrito junto al formulario de medicacion
**So that** pueda revisar lo agregado mientras continuo cargando datos
**Summary**: Convierte el paso de medicacion en dos columnas en escritorio y guia el flujo movil como carga, revision del carrito y continuacion.
**Complexity**: S

### US-006: Corregir el orden del listado de conversaciones (M6)
**As** colaborador o medico
**I want** ver conversaciones y solicitudes ordenadas por la actividad mas reciente
**So that** las novedades actuales no queden debajo de intercambios antiguos
**Summary**: Unifica el criterio cronologico de ambos listados usando la fecha mas reciente entre mensajes, interacciones y creacion de solicitudes.
**Complexity**: S

### US-007: Ordenar bandejas de pedidos por fecha y hora (M7)
**As** colaborador o medico
**I want** ver la fecha y hora de cada solicitud con las mas nuevas primero
**So that** pueda atender los pedidos en el orden cronologico correcto
**Summary**: Ordena todas las categorias de la bandeja del DoctorDashboard por fecha de creacion descendente y muestra fecha y hora.
**Complexity**: S

---

## Out of Scope

- Crear o aprobar la plantilla en Meta Business Manager.
- Enviar alertas por email u otros canales.
- Conciliar automaticamente pagos con Mercado Pago o ejecutar reembolsos.
- Reemplazar comprobantes de transferencia desde esta edicion.
- Cambiar campos, validaciones o logica del carrito y del formulario de medicacion.
- Cambiar filtros, busqueda, contadores de no leidos o contenido de los mensajes del chat.
- Cambiar el orden de mensajes o usar su actividad para reordenar pedidos.

---

## DevOps Notes
**DevOps Required: NO**

El esquema existente de configuracion ya admite ajustes flexibles y no requiere migracion.
