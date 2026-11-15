# Instrucciones de desarrollo

## Calidad del código

- Escribe código limpio, legible y coherente con las convenciones existentes del proyecto.
- Aplica SOLID con criterio: asigna una responsabilidad clara a cada módulo, conserva dependencias explícitas y permite ampliar el comportamiento sin duplicar lógica. Introduce interfaces o abstracciones cuando resuelvan acoplamiento real; evita capas y patrones innecesarios.
- Prefiere funciones pequeñas con nombres descriptivos y tipos concretos. Evita `any`, estados duplicados y lógica de negocio mezclada con presentación o acceso a datos.
- Mantén los cambios acotados al objetivo solicitado; no hagas refactorizaciones ajenas a la tarea.
- Valida datos que lleguen de formularios, almacenamiento o servicios externos antes de usarlos. Mantén las claves y llamadas privilegiadas en el servidor.
- Cuando cambies comportamiento, conserva o actualiza los tipos y mensajes de error relacionados.
- Cada inserción o modificación de comportamiento debe incluir o actualizar tests automatizados que cubran el caso nuevo y sus límites relevantes. No dejes cambios de comportamiento sin pruebas; si una parte no se puede probar de forma razonable, explica el motivo y cubre la lógica circundante.

## Herramientas

- Usa Prettier al guardar los archivos en VS Code; el formato de este repositorio usa comillas simples, sin punto y coma y sin comas finales.
- Ejecuta `npm test` para correr la suite automatizada.
- Antes de entregar cambios de código, ejecuta los tests relacionados y `npm run lint` y `npm run typecheck` cuando los cambios puedan afectar TypeScript o el comportamiento de la aplicación.
