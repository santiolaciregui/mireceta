# RCTA: archivo o enlace (2026-10-21)

El colaborador o médico puede elegir Archivo o Enlace al emitir una receta RCTA.
Archivo conserva la carga múltiple existente. Enlace exige una URL absoluta HTTP(S),
sin credenciales, de hasta 8192 caracteres, y se guarda como un único elemento
recipeFiles con kind=link y nombre Enlace a receta. No se mezclan ambos modos.
La selección se restaura al abrir el pedido y no se pierde por polling.
El enlace público existente redirige al destino; nunca se descarga ni analiza
el recurso externo en el servidor. La vista del paciente abre el enlace en una
pestaña nueva sin forzar descarga. Emisión y reenvío incluyen un enlace en el chat,
sin adjuntarlo como PDF. PAMI/IOMA y recetas históricas conservan su comportamiento.
Sin dependencias, migraciones, modificaciones de datos históricos ni despliegue.
Validación: tests de URL, persistencia y emisión/reenvío; TypeScript y build.
