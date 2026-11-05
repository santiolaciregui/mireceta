# Recuperación de pagos y visualización — 04/11/2026

## Actualización de frecuencia — 05/11/2026

El usuario requiere revisión cada una hora. El equipo Vercel fue consultado y sigue en plan Hobby, que no admite cron horario. Se preparó `.github/workflows/payment-recovery.yml` con GitHub Actions para ejecutar al minuto 17 de cada hora, sin cambiar el plan. El cron diario de Vercel queda como respaldo.

Para activarlo después de publicar y desplegar el backend:

1. En el repositorio GitHub `santiolaciregui/mireceta`, Settings → Secrets and variables → Actions → Secrets, configurar `PAYMENT_RECOVERY_CRON_SECRET` con el mismo valor de `CRON_SECRET` de Vercel Production. No es `MP_WEBHOOK_SECRET` ni el Access Token. No copiar valores al código ni al chat.
2. En Actions → Variables del mismo repositorio, definir `PAYMENT_RECOVERY_ENABLED=true` únicamente cuando el backend corregido esté desplegado y el secret esté configurado. Sin esa variable el job queda deshabilitado para no invocar prematuramente el backend anterior.
3. El workflow debe estar publicado en la rama predeterminada `main` y GitHub Actions debe estar habilitado. Ejecutar primero una validación controlada desde `workflow_dispatch` cuando esté autorizado aplicar la conciliación real.
4. Revisar el resultado del job y el checkpoint `PAYMENT_RECOVERY_CHECKPOINT` en MongoDB. Verificar luego la primera ejecución programada. Un job omitido no prueba que se haya conciliado.

La frecuencia configurada es horaria; GitHub Actions puede demorar o descartar ejecuciones bajo carga, por lo que no garantiza un máximo estricto de 60 minutos. Se eligió minuto 17 para evitar el pico de inicio de hora. Si se exige una garantía de tiempo, debe usarse un scheduler con ese compromiso operativo.

El job tiene permisos de repositorio vacíos, no descarga código ni instala dependencias, limita concurrencia y duración, rechaza redirecciones de la petición autenticada y solo registra contadores. Reintenta errores HTTP transitorios y de red hasta tres veces. No imprime respuestas que puedan contener datos de pacientes o credenciales. No se activó ni publicó desde este chat.

Referencias: [límites de cron Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing), [programación de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Las menciones a frecuencia diaria debajo documentan el estado del 04/11; la revisión horaria preparada aquí las sustituye como frecuencia requerida. El respaldo nativo sigue siendo diario.

Alcance autorizado: opción 1, ocultar referencias MP-… sin cambiar registros históricos; permitir recuperar pagos aprobados con demora aunque el webhook/guardado falle.

Implementación: formato compartido de operación visible, HTTP reintentable, escritura atómica limitada para todas las fuentes de sincronización, retorno que confirma persistencia, conciliación diaria con cursor persistido en auditlogs existentes y errores diferenciados de búsquedas vacías. Sin nuevos esquemas/colecciones, nuevas operaciones de cobro/devolución, cambios de credenciales ni cambios de la frecuencia del scheduler. No publicar el checkout sucio completo: hay trabajo de analytics ajeno al cambio.

Criterios: un pago aprobado se puede recuperar tras una falla; sin pago se conserva pendiente; firma inválida no confirma recepción; fallos técnicos permiten reintento; retorno fallido no comunica aprobación; reintentos no duplican efectos ni sobrescriben clínica/adjuntos; lotes rotan sin quedar bloqueados por solicitudes antiguas; registros de recuperación no contienen credenciales ni datos clínicos. Cancelaciones/devoluciones y pagos múltiples requieren su propia política: no se incorporan devoluciones automáticas nuevas.

Validación local y validación en producción son evidencias distintas. No se ejecutará conciliación sobre pacientes para probar; los tests usan repositorios y proveedor simulados. El scheduler Hobby actual es diario y puede ejecutarse dentro de la hora prevista, sin garantía de minutos. Operación automática requiere deploy y comprobación de su ejecución real.

## Resultado local

- 502/502 tests del proyecto pasan; 13 regresiones nuevas de recuperación, escritura condicional, HTTP y progreso de lotes.
- TypeScript y build de producción pasan. Se conserva la advertencia existente de tamaño del bundle de Vite.
- Verificación manual del formato: referencia MP-… oculta, operación numérica oficial y transferencia conservadas. El formato se utiliza en el detalle, asistente flotante y su texto copiable; no modifica los campos almacenados.
- No se modificó la generación histórica de IDs ni las fechas de pago: se implementó solamente la opción 1 de visualización.

## Qué hace la recuperación

El webhook devuelve 503 ante errores transitorios y 401 al rechazar una firma. Tanto el reenvío del proveedor como la revisión programada pueden consultar nuevamente el pago. Cada transición se guarda mediante una actualización condicional limitada; un conflicto deja el trabajo reintentable y no modifica el objeto de respuesta como si se hubiera guardado. El retorno tampoco confirma sincronización antes de persistir.

La conciliación conserva el progreso del lote en la colección existente `auditlogs`, acción `PAYMENT_RECOVERY_CHECKPOINT`, tenant técnico `SYSTEM-PAYMENTS`. La escritura del checkpoint no oculta errores. Los lotes continúan desde el último ID revisado y vuelven al principio al alcanzar el final, incluyendo solicitudes históricas. Un pago realmente inexistente sigue pendiente y un error del proveedor se registra por separado; ninguno se convierte en aprobado. La revisión no crea cobros ni devoluciones.

El presupuesto de inicio de nuevos trabajos por lote es 20 segundos; las consultas al proveedor usan timeout de 5 segundos sin reintentos internos del SDK instalado. Una consulta ya iniciada y las escrituras pueden finalizar después de ese presupuesto. Se debe comprobar el tiempo real del endpoint desplegado.

## Activación y límites

No hubo commit, push, despliegue ni modificación de producción. Existen cambios locales de analytics ajenos que deben conservarse y excluirse de una publicación de pagos si no están autorizados.

Después de publicar: verificar `CRON_SECRET` y la programación efectiva, observar una ejecución con checkpoint persistido y efectuar una prueba controlada de pago/falla/reenvío. No ejecutar una conciliación masiva de pacientes solo para obtener evidencia de prueba.

La recuperación automática configurada en el repositorio es diaria, alrededor de las 05:15 Argentina. Una recuperación cada pocos minutos requiere un scheduler con esa capacidad o un cambio del plan; no se configuró ninguno en este trabajo. No hay garantía de plazo si el proveedor/DB sigue caído o si el backlog requiere varios lotes.

No se resuelven en esta entrega todos los puntos de la auditoría previa: por ejemplo, autenticación del retorno, múltiples comercios, doble cobro y políticas de devoluciones. No se debe describir esta corrección acotada como una garantía integral de todos los escenarios financieros.
