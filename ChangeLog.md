# ChangeLog - Sistema de Tutorías (Pilas-Mic2026)

Este documento registra las mejoras y cambios realizados en el sistema de tutorías para optimizar la coordinación entre mentores y alumnos.

## [2026-06-21] - Selección de Insignias, Notificación de Logros y Corrección de Recordatorios con Zona Horaria

### Frontend (Personalización e Insignias)
- **Destacar Insignias (`Profile.jsx` [MODIFY])**:
    - **[AGREGADO]** Funcionalidad para que los usuarios con más de 4 insignias elijan un máximo de 4 para destacar en su perfil mediante un botón de edición y un modal interactivo de selección múltiple.
    - **[AGREGADO]** Banner informativo que invita al usuario a configurar sus insignias destacadas si cumple con el requisito pero aún no ha realizado ninguna selección.
- **Notificación Premium de Medallas (`NotificationContext.jsx` [MODIFY], `Navbar.jsx` [MODIFY], `TopBar.jsx` [MODIFY], `WorkspaceLayout.jsx` [MODIFY])**:
    - **[AGREGADO]** Soporte en el contexto global de notificaciones para mostrar un toast de felicitaciones al ganar una medalla con diseño premium, bordes dorados, fondo degradado y animación de brinco (`bounce`).
    - **[AGREGADO]** Sincronización reactiva del perfil en el navbar y en el cierre/calificación de tutorías, comparando las insignias obtenidas con el `localStorage` para disparar la notificación flotante automáticamente en el momento del logro.

### Backend (Recordatorios y Zona Horaria)
- **Cálculo de Fechas Localizadas (`dateUtils.js` [NEW])**:
    - **[AGREGADO]** Funciones utilitarias `getEcuadorDateTime`, `getEcuadorDateTimeOffset` y `parseAndFormatEcuadorDate` para centralizar y homogeneizar las fechas en el huso horario de Ecuador (`UTC-5` / `America/Guayaquil`).
- **Planificador de Recordatorios de Tutorías (`reminderScheduler.js` [MODIFY], `test-reminders.js` [MODIFY])**:
    - **[ACTUALIZADO]** Se eliminó la dependencia de `NOW()` de base de datos en el scheduler. Ahora el rango de tiempo de recordatorios (24h, 2h, 10m) se calcula en JS con la hora local de Ecuador, resolviendo el desfase de 5 horas a UTC de TiDB Cloud.
    - **[ACTUALIZADO]** Se garantiza el envío simultáneo de las alertas por correo electrónico tanto al Tutor como al Aprendiz.
    - **[ACTUALIZADO]** El script de prueba `test-reminders.js` fue alineado para insertar la tutoría de prueba en hora local de Ecuador.
- **Visualización de Tutorías Próximas (`userController.js` [MODIFY])**:
    - **[CORREGIDO]** Se reemplazó `NOW()` por el string de fecha/hora de Ecuador en la consulta del perfil de usuario, evitando que las tutorías desaparezcan de la sección "Próximas Tutorías" en las 5 horas previas al encuentro.
- **Enriquecimiento e Información de Correos (`emailService.js` [MODIFY], `mentorshipController.js` [MODIFY])**:
    - **[ACTUALIZADO]** Rediseño y adición de campos requeridos en el correo de recordatorios, mostrando explícitamente: Materia, Fecha/Hora (en hora de Ecuador), Modalidad, Lugar de encuentro o Detalles de acceso virtual (Plataforma y Enlace), Solicitante (Aprendiz) y Tutor.
    - **[ACTUALIZADO]** Se modificaron los correos de aceptación de tutoría (`sendMentorshipStatusEmail`) y propuesta de reprogramación (`sendMentorshipReprogramEmail`) para inyectar los mismos bloques estructurados de información de la tutoría en hora local de Ecuador.
    - **[ACTUALIZADO]** La consulta en `updateMentorship` ahora obtiene de forma completa los datos de reunión para enviarlos a los servicios de correos.

### Backend (Aseguramiento de Ciberseguridad y Hardening)
- **Seguridad e Infraestructura (`app.js` [MODIFY])**:
    - **[AGREGADO]** Middleware `helmet` para configurar cabeceras HTTP seguras contra secuestros de click y sniffing.
    - **[AGREGADO]** Middleware `express-rate-limit` con límites de tasa generales (200 reqs / 15m) y limitador estricto para autenticación (20 reqs / 15m) para prevenir fuerza bruta y DoS.
    - **[ACTUALIZADO]** Configuración restrictiva de CORS usando whitelist que incluye dominios oficiales y permite acceso local solo en desarrollo.
- **Autenticación con JWT (`authMiddleware.js` [NEW], `authController.js` [MODIFY])**:
    - **[AGREGADO]** Generación y firma de tokens JWT (`jsonwebtoken`) que encapsulan el id, email y rol del usuario tras un inicio de sesión exitoso.
    - **[AGREGADO]** Middlewares `authenticateToken`, `requireRole`, `verifyProfileOwner` y `verifyMentorshipParticipant` para validar sesiones y controlar accesos basados en roles.
- **Protección contra IDOR / BOLA (`userRoutes.js` [MODIFY], `adminRoutes.js` [MODIFY], `chatRoutes.js` [MODIFY], `repositoryRoutes.js` [MODIFY], `mentorshipRoutes.js` [MODIFY], `ticketRoutes.js` [MODIFY], `rewardRoutes.js` [MODIFY])**:
    - **[ACTUALIZADO]** Protección integral de todas las rutas de la API, requiriendo token JWT y autorizaciones correspondientes.
    - **[CORREGIDO]** Corrección de endpoints en controladores (`repositoryController.js`, `mentorshipController.js`, `ticketController.js`, `rewardController.js`, `adminController.js`) para resolver el ID de usuario autenticado directamente desde `req.user.id` en lugar de confiar en payloads editables del cliente.
    - **[CORREGIDO]** Restricción de `GET /api/admin/tutors/applications` para que usuarios comunes solo consulten sus propias postulaciones, evitando fuga de datos de otros alumnos.

---

## [2026-06-11] - Validación de Correo ESPE y Verificación por Código

### Seguridad y Validación
- **Restricción de Correo Institucional (`authController.js` [MODIFY], `Register.jsx` [MODIFY])**:
    - **[AGREGADO]** Validación estricta tanto en frontend como en backend para permitir únicamente registros con correos que finalicen en `@espe.edu.ec`.
- **Flujo de Verificación por Código (`emailService.js` [MODIFY], `authController.js` [MODIFY], `authRoutes.js` [MODIFY], `VerifyEmail.jsx` [NEW], `App.jsx` [MODIFY], `Login.jsx` [MODIFY])**:
    - **[AGREGADO]** Generación automática de códigos de verificación de 6 dígitos con expiración de 24 horas al registrarse.
    - **[AGREGADO]** Envío automático de correo con el código utilizando la nueva función `sendEmailVerificationEmail` de Nodemailer.
    - **[AGREGADO]** Nuevo endpoint `/verify-email` para validar códigos y activar cuentas (actualizando el estado del usuario de `'PENDIENTE'` a `'ACTIVO'`).
    - **[AGREGADO]** Nuevo endpoint `/resend-verification` para volver a generar y enviar un código de verificación.
    - **[AGREGADO]** Restricción de acceso en el login (`/login`) para cuentas que no han sido verificadas, denegando el acceso y retornando un flag `isNotVerified`.
    - **[AGREGADO]** Nueva pantalla en el frontend `/verify-email` (`VerifyEmail.jsx`) que permite a los usuarios ingresar el código recibido por correo o solicitar un reenvío con temporizador de cooldown (60s).
    - **[AGREGADO]** Redirección inteligente al login tras verificación exitosa, o hacia la pantalla de verificación si el usuario intenta iniciar sesión con una cuenta pendiente de activación.

### Base de Datos
- **Esquema de Usuarios (`migrate.js` [MODIFY])**:
    - **[AGREGADO]** Columnas `verification_code` y `verification_code_expires_at` en la tabla `Users` para persistir los códigos temporales de validación.
    - **[ACTUALIZADO]** El estado por defecto para nuevos registros se maneja como `'PENDIENTE'` en lugar de `'ACTIVO'` para ajustarse al límite de `VARCHAR(20)` de la columna `status` sin desbordamientos de datos.

## [2026-06-04] - Actualización Reactiva de Materias en Edición de Perfil

### Admin Dashboard y Soporte por Tickets
- **Panel de Control de Administrador (`AdminDashboard.jsx` [NEW], `adminRoutes.js` [NEW], `adminController.js` [NEW])**:
    - **[AGREGADO]** Nueva vista administrativa premium `/admin` con panel de navegación lateral (sidebar) para alternar módulos de control.
    - **[AGREGADO]** Módulo de **Estadísticas** con KPIs interactivos en gradientes modernos (Total Usuarios, Tutorías Activas, Calificación Global y Espacio de Repositorio en MB).
    - **[AGREGADO]** Módulo de **Solicitudes a Tutores** que lista las postulaciones de ascenso a tutor con su motivación y materias deseadas, permitiendo aprobarlas (cambiando el rol a MENTOR y poblando `Mentor_Subjects` en lote) o rechazarlas.
    - **[AGREGADO]** Módulo de **Usuarios Registrados** con filtros de búsqueda por nombre/email y filtros de roles, permitiendo bloquear/desbloquear cuentas o eliminarlas con modales de confirmación.
    - **[AGREGADO]** Módulo de **Administración** para configurar variables globales (límite en MB, factor multiplicador de ESPE-Coins) y un visualizador de logs del sistema simulado en tiempo real.
    - **[AGREGADO]** Módulo de **Tickets** que lista los reportes de soporte creados por los estudiantes, permitiendo al administrador redactar respuestas y dar solución de forma inmediata.
    - **[AGREGADO]** Migración automática de base de datos (`create_admin_tables.sql` [NEW]) para crear las tablas de postulaciones y tickets.
    - **[AGREGADO]** Cuenta de administrador por defecto pre-sembrada en base de datos (`admin@pilas.edu.ec` con contraseña encriptada `admin123`).
- **Centro de Soporte Estudiantil (`SoporteTickets.jsx` [NEW], `ticketRoutes.js` [NEW], `ticketController.js` [NEW])**:
    - **[AGREGADO]** Nueva vista para alumnos `/tickets` que les permite reportar inconvenientes o dudas, visualizar el estado del ticket y leer las soluciones del administrador.
- **Control de Seguridad y Autenticación (`authController.js` [MODIFY], `Navbar.jsx` [MODIFY], `App.jsx` [MODIFY], `SeTutor.jsx` [MODIFY])**:
    - **[AGREGADO]** Bloqueo en login para cuentas inhabilitadas por el administrador, denegando el acceso y retornando un código de estado `403 Forbidden`.
    - **[AGREGADO]** Enrutamiento condicional en Navbar que despliega el botón "Panel Admin" para el rol `'ADMIN'`, ocultando las pestañas estudiantiles redundantes.
    - **[AGREGADO]** Enrutamiento protegido para el dashboard administrativo y de soporte en `App.jsx`.
    - **[ACTUALIZADO]** Flujo de ascenso a tutor modificado en `/se-tutor` para ingresar postulaciones en revisión (`PENDING`) en la base de datos en lugar de hacer el ascenso directo, mostrando una interfaz de espera con estado animado.

### Frontend (Materias en Perfil)
- **Materias Impartidas Reactivas (`Profile.jsx` [MODIFY])**:
    - **[AGREGADO]** Hook `useEffect` reactivo para detectar cambios en el semestre y recargar dinámicamente las materias mediante `/api/subjects?semester=X`.
    - **[AGREGADO]** Tarjetas interactivas con hover dinámico y resaltado dorado/oro al seleccionar materias.
    - **[ACTUALIZADO]** Sincronización automática del perfil editado (`bio`, `current_semester`, `materias` y avatar) en `localStorage` y `sessionStorage`.
    - **[ACTUALIZADO]** Filtro de seguridad que remueve del submit asignaturas que superan el semestre final del usuario.
    - **[CORREGIDO]** Bug en `handleUpdate` que enviaba la actualización a `/profile/undefined` en la ruta directa de perfil propio, redireccionando correctamente usando `profileId`.
- **Filtro de Nivel en Ascenso a Tutor (`SeTutor.jsx` [MODIFY])**:
    - **[AGREGADO]** Precarga asíncrona del perfil del usuario para obtener el semestre real y filtrar asignaturas por nivel mediante la consulta `/api/subjects?semester=X`.
    - **[ACTUALIZADO]** Rediseño visual de los checkboxes de asignaturas utilizando bordes estilizados (`border-gray-100`) y estados activos dorados con animaciones suaves de transición.

## [2026-06-02] - Encuesta de Satisfacción y Perfil de Aprendiz ("Sé Tutor")

### Frontend
- **Encuesta de Calificación Interactiva (`WorkspaceLayout.jsx` [MODIFY], `MiTutoria.jsx` [MODIFY])**:
    - Modal de alta fidelidad con 5 estrellas interactivas (SVG vectoriales con animaciones de escala y color dorado) y campo opcional para opiniones.
    - Soporte para posponer la calificación ("Calificar más tarde") que oculta el modal e integra un botón de acceso directo "⭐ Calificar Tutoría" en el banner dinámico del aula inactiva.
    - Actualización reactiva instantánea: el envío de la calificación actualiza el estado local del workspace y oculta el formulario de inmediato.
- **Opiniones de Alumnos y Puntaje Promedio (`Profile.jsx` [MODIFY])**:
    - Nueva sección de opiniones de alumnos exclusiva para tutores (`role === 'MENTOR'`) con burbujas de comentarios elegantes que listan nombres, fechas formateadas, valoraciones individuales y citas de opinión.
    - Avatares dinámicos de iniciales con paleta de colores alegre y alternada.
    - Despliegue del puntaje numérico exacto en la barra de puntuación superior (ej: `Calificación Promedio: 4.8 / 5.0`).
- **Navegación e Integración de Ruta "Sé Tutor" (`Navbar.jsx` [MODIFY], `App.jsx` [MODIFY], `SeTutor.jsx` [NEW])**:
    - Reemplazo condicional: los usuarios de rol `'APRENDIZ'` ahora ven **Sé Tutor** en lugar de *Solicitudes Pendientes* en la barra superior.
    - Remoción del enlace redundante "Hazte Tutor" para mantener la consistencia estética.
    - Nueva página `/se-tutor` con formulario glassmorphic para que los aprendices elijan materias dictables mediante casillas de verificación, expongan su motivación (con contador de caracteres dinámico) y visualicen los beneficios del rol de tutor.
    - Ascenso reactivo instantáneo: el envío de la solicitud actualiza el `localStorage`/`sessionStorage` y actualiza reactivamente el menú de navegación (reemplazando "Sé Tutor" por "Solicitudes Pendientes") sin requerir recarga.

### Backend
- **Calificación de Mentorías (`mentorshipController.js` [MODIFY], `mentorshipRoutes.js` [MODIFY])**:
    - Endpoint `PUT /api/mentorships/:id/rate` para guardar la calificación (`rating`, `rating_comment`, `is_rated = 1`).
    - Validaciones estrictas: restringe que sólo el aprendiz de la tutoría en estado `'COMPLETADA'` y que no haya sido calificada pueda opinar.
- **Ascenso de Rol a Mentor (`userController.js` [MODIFY], `userRoutes.js` [MODIFY])**:
    - Endpoint `PUT /api/users/profile/:id/upgrade` para procesar el ascenso inmediato.
    - Actualiza el rol del usuario a `'MENTOR'`, actualiza su biografía e inserta en lote (bulk insert) sus materias elegidas en la tabla `Mentor_Subjects`.
- **Cálculo Dinámico de Calificaciones (`userController.js` [MODIFY])**:
    - El perfil de usuario calcula en tiempo real la puntuación promedio (`AVG(rating)`) y retorna las últimas 5 opiniones con comentarios no vacíos.
    - El buscador general (`getAllMentors`) calcula el promedio de estrellas directamente vía subquery en la base de datos MySQL (TiDB Cloud) y provee soporte nativo para el ordenamiento por mejor valorados.

## [2026-05-29] - Repositorio de Materiales del Workspace

### Frontend
- **Repositorio de Materiales (`RepositoryView.jsx` [NEW], `WorkspaceLayout.jsx`, `LeftSidebar.jsx`)**:
    - Implementación completa de la sección **Repositorio** dentro del workspace de MiTutoría, inspirada en Moodle, con sistema de vistas diferenciadas por rol:
        - **Vista Mentor (editor)**: Subida de archivos con zona de drag & drop y previsualización, campos de título (obligatorio) y descripción (opcional), barra de progreso de upload con porcentaje, edición inline de título/descripción, reemplazo de archivo manteniendo la metadata, y eliminación con modal de confirmación.
        - **Vista Aprendiz (solo lectura)**: Navegación del catálogo de materiales sin acciones de edición, previsualización directa de imágenes (lightbox) y videos (reproductor embebido con controles), y botón de descarga destacado para documentos.
    - **Barra de almacenamiento visual**: Indicador de progreso que muestra `X MB / 300 MB` con gradiente de color adaptativo (verde → amarillo → rojo) y advertencia automática cuando el espacio supera el 80%.
    - **Sistema de filtrado y búsqueda**: Búsqueda por título en tiempo real, filtros por tipo de archivo (Imágenes, Videos, Documentos), y ordenamiento por fecha, nombre o tamaño.
    - **Grid de materiales con thumbnails**: Tarjetas con previsualización de imágenes inline, íconos por tipo de archivo, badges de categoría, y animaciones de entrada escalonadas.
    - **Estado vacío diferenciado**: Ilustración e instrucciones distintas para mentor (invitación a subir) y aprendiz (aviso de espera).
    - **Skeleton loading**: Animación de carga elegante con placeholders mientras se obtienen los datos.
    - Se actualizó el `WorkspaceLayout.jsx` para renderizar `RepositoryView` cuando se selecciona el módulo "Repositorio" en lugar del placeholder.
    - Se marcó el módulo "Repositorio" como activo en el `LeftSidebar.jsx`, eliminando el badge "Soon".

### Backend
- **Configuración de Cloudinary para Repositorio (`cloudinaryRepository.js` [NEW])**:
    - Nuevo módulo de Multer con almacenamiento en memoria y subida manual a Cloudinary, soportando `resource_type` dinámico (`image`, `video`, `raw`) según la extensión del archivo.
    - Filtro de tipos permitidos: imágenes (jpg, png, gif, webp, svg), videos (mp4, webm, mov), y documentos (pdf, doc, docx, ppt, pptx, xls, xlsx, zip, rar, txt, py, java, js, cpp, c, ts, html, css).
    - Límite de 50MB por archivo individual. Archivos organizados en carpetas `pilas_repository/{mentorshipId}` en Cloudinary.
- **Controlador de Repositorio (`repositoryController.js` [NEW])**:
    - CRUD completo con 6 endpoints: listar materiales, consultar almacenamiento, subir material, editar metadata, reemplazar archivo y eliminar material.
    - Control de acceso basado en roles: solo el mentor de la tutoría puede subir, editar y eliminar; ambos participantes pueden listar y visualizar.
    - Límite de almacenamiento de **300MB por tutoría**, validado antes de cada subida sumando `file_size` en la base de datos.
    - Limpieza automática de assets en Cloudinary al eliminar o reemplazar archivos, usando `cloudinary_public_id` y `cloudinary_resource_type`.
- **Rutas del Repositorio (`repositoryRoutes.js` [NEW])**:
    - `GET /api/repository/:mentorshipId` — Listar materiales de una tutoría.
    - `GET /api/repository/:mentorshipId/storage` — Obtener uso de almacenamiento.
    - `POST /api/repository/:mentorshipId` — Subir nuevo material (multipart/form-data).
    - `PUT /api/repository/material/:materialId` — Editar título y descripción.
    - `PUT /api/repository/material/:materialId/file` — Reemplazar archivo.
    - `DELETE /api/repository/material/:materialId` — Eliminar material.
- **Aplicación (`app.js`)**:
    - Se montaron las rutas del repositorio en `/api/repository`.

### Base de Datos
- **Tabla `Repository_Materials` [NEW] (`create_repository_materials.sql`)**:
    - Campos: `id`, `mentorship_id`, `uploader_id`, `title`, `description`, `file_url`, `file_name`, `file_size`, `file_type`, `mime_type`, `cloudinary_public_id`, `cloudinary_resource_type`, `created_at`, `updated_at`.
    - Índices en `mentorship_id` y `uploader_id` para consultas rápidas.
- **Script de migración (`runMigration.js` [NEW])**:
    - Ejecutor genérico de archivos SQL para aplicar migraciones de esquema.

---

## [2026-05-28] - Calendario, Recompensas Gamificadas, Notificaciones Toast, Selección Múltiple y Corrección de Bugs

### Frontend
- **Validación Estricta de Fecha y Hora Futura (`Profile.jsx`, `Solicitudes.jsx`, `Mensajes.jsx`)**:
    - Se implementó una validación tanto a nivel nativo de HTML como en lógica de JavaScript para impedir la selección de fechas pasadas en la creación de tutorías y reprogramaciones.
    - Se limitó el atributo `min` de los campos `<input type="date">` a la fecha actual para deshabilitar días anteriores en los selectores del navegador.
    - Se incorporaron validaciones de hora en JavaScript que permiten pactar tutorías para el mismo día únicamente si la hora seleccionada es posterior a la hora actual.
- **Centralización de Constantes y Buenas Prácticas (`constants.json` [NEW], `Calendario.jsx`, `Recompensas.jsx`)**:
    - Se creó un archivo de configuración unificado `constants.json` en `frontend/src/config/` para centralizar las constantes de la aplicación por seguridad y mantenibilidad de código (Clean Code).
    - Se extrajeron a la configuración centralizada: la URL base de la API, las plataformas virtuales admitidas, los tiempos de duración elegibles, los nombres de meses y días traducidos, la parametrización de insignias / recompensas académicas y el catálogo completo de cupones de la tienda.
    - Se actualizaron `Calendario.jsx` y `Recompensas.jsx` para leer sus variables dinámicamente desde este archivo JSON, posibilitando despliegues y ediciones en un único punto.
- **Calendario de Tutorías Aceptadas (`Calendario.jsx` [NEW], `App.jsx`)**:
    - Vista premium de grilla mensual interactiva con indicadores dorados para las tutorías confirmadas (`status === 'ACEPTADA'`).
    - Panel lateral de detalles que despliega horarios, asignaturas, objetivos y enlaces virtuales (Meet, Teams, Zoom con soporte de copiado de contraseñas e ID).
- **Tablero de Recompensas Gamificadas (`Recompensas.jsx` [NEW], `App.jsx`)**:
    - Sistema interactivo con saldo de ESPE-Coins, nivel y progreso de XP del usuario.
    - Cuadrícula de insignias con estados desbloqueados y bloqueados en escala de grises.
    - Tienda virtual de beneficios con validación de saldo, popup de código único y notificaciones Toast al canjear cupones de la ESPE.
- **Buscador de Mentores (`BuscarTutor.jsx`)**:
    - Corregido el bug donde el usuario logueado aparecía listado en su propia búsqueda de tutores, extrayendo el ID de sesión híbrida (localStorage o sessionStorage) y agregando filtros en frontend y backend.
- **Enrutamiento y Perfil Estudiantil (`App.jsx` & `Profile.jsx`)**:
    - Agregado soporte para la ruta `/profile` sin parámetro de ID, redirigiendo de manera inteligente al perfil del usuario autenticado (haciendo uso de sessionStorage o localStorage).
- **Tiempo Estimado de Tutoría (`Profile.jsx`, `Solicitudes.jsx`, `Mensajes.jsx`, `Calendario.jsx`)**:
    - Se integró un selector de duración estimada de tutoría en el modal "Pactar Tutoría" de `Profile.jsx` con opciones de rango entre **45 minutos y 2 horas** ("45 min", "1 hora", "1.5 horas", "2 horas").
    - Se agregaron tarjetas e indicadores visuales tipo "píldoras" en la bandeja de notificaciones/solicitudes del mentor (`Solicitudes.jsx`), la bandeja de entrada del aprendiz (`Mensajes.jsx`) y el planificador diario (`Calendario.jsx`) para que ambos participantes puedan visualizar y coordinar la duración esperada.
- **Resolución General de Sesión Estudiantil Híbrida (`Mensajes.jsx`, `Solicitudes.jsx`, `MiTutoria.jsx`, `Calendario.jsx`, `Recompensas.jsx`, `Navbar.jsx`)**:
    - Se corrigió de raíz el error sistémico que causaba que la bandeja de entrada (`/mensajes`), la vista de solicitudes (`/solicitudes`), el espacio de trabajo (`/mi-tutoria`), el calendario (`/calendario`) y la barra de navegación no cargaran información del usuario al iniciar sesión sin tildar "Recordarme" (sesión guardada en `sessionStorage` en lugar de `localStorage`).
    - Todos los componentes ahora resuelven el `currentUser` consultando ambos espacios de almacenamiento de forma segura.
    - Se optimizaron y reactivaron los hooks `useEffect` para depender de `currentUser.id`, asegurando cargas precisas de datos y previniendo llamadas fallidas con valores `undefined`.
- **Servicio de Notificación Toast Premium (`NotificationContext.jsx` [NEW], `App.jsx` & `index.css`)**:
    - Creación de un sistema global de alertas flotantes en pantalla (`useNotification`) con diseño glassmorphism adaptativo y soporte para cuatro estados visuales: éxito, error, advertencia e información.
    - Definición de fotogramas clave `@keyframes slide-in` y clase CSS de animación en `index.css`.
    - Eliminación absoluta de las llamadas nativas e intrusivas a `alert()` de todo el proyecto, sustituyéndolas por toasts modernos en `Profile.jsx`, `Register.jsx`, `Solicitudes.jsx`, `Mensajes.jsx` y `TopBar.jsx`.

### Backend
- **Notificaciones por Correo de Reprogramación (`emailService.js`, `mentorshipController.js`)**:
    - Se creó la función `sendMentorshipReprogramEmail` en `emailService.js` para despachar correos electrónicos estilizados informando sobre una propuesta de reprogramación.
    - El correo notifica la nueva fecha/hora propuesta de forma formateada, la materia en cuestión y el motivo justificado del cambio de fecha.
    - Se integró esta alerta en `updateMentorship` para notificar al aprendiz (si el tutor propone reprogramar) o al tutor (si el aprendiz es quien inicia la contrapropuesta).
- **Migración y Estructura de Datos (`migrate.js`, `mentorshipController.js`)**:
    - Creada migración automática en `migrate.js` para añadir la columna `estimated_duration` a la tabla `Mentorships` de TiDB.
    - Modificado `mentorshipController.js` para capturar la duración en la creación de tutorías (`createMentorship`) y retornarla en la lectura de tutorías por usuario (`getMentorshipsByUser`).
- **Bandeja de Mensajes (`Mensajes.jsx`)**:
    - Incorporación de casillas de verificación (checkboxes) individuales y controles de selección masiva ("Todos", "Desmarcar") para posibilitar la eliminación en masa (bulk delete) de notificaciones.
    - Creación de un modal de confirmación de borrado en pantalla con estilo premium que reemplaza el diálogo nativo `window.confirm()`.
- **Buscador de Mentores (`BuscarTutor.jsx`)**:
    - Rediseño general con una interfaz de usuario espectacular (UI/UX): tarjetas interactivas con efectos hover y escala 3D, indicador de disponibilidad en línea, puntuación mediante estrellas y etiquetas estilizadas de materias.
    - Integración de píldoras de filtrado dinámico por semestres (del `1°` al `8°` nivel).
    - Sistema de ordenamiento flexible por semestre (ascendente/descendente), nombre y puntuación.
    - Se agregó un badge flotante `🎓 X° Nivel` en cada tarjeta de tutor.
- **Flujo de Acceso y Persistencia (`Login.jsx` & `App.jsx`)**:
    - Sincronización del checkbox "Recordarme" con el estado interno de React.
    - Implementación de persistencia híbrida: almacenamiento en `localStorage` si se marca "Recordarme" (permanente) o en `sessionStorage` si no se marca (temporal, expira al cerrar la pestaña/navegador).
- **Gestión de Perfil (`Profile.jsx`)**:
    - Se solucionó un bug crítico donde se eliminaban las materias impartidas al guardar cambios, corrigiendo la inicialización de los IDs de materias dictadas.
    - Se resolvió el bug que sobreescribía la foto de perfil del usuario a `null` si este no seleccionaba una nueva imagen en el modal, enviando la URL actual por defecto en el payload.

### Backend
- **Controlador de Usuarios (`userController.js`)**:
    - Corregido el bug `500 (Internal Server Error)` al actualizar la foto de perfil, simplificando la lógica para usar directamente `req.file.path` proveído por el middleware de Cloudinary.
    - Se implementó un fallback de seguridad en la base de datos para recuperar y preservar la foto actual del usuario si no se proporciona una nueva ruta ni se carga un archivo, protegiendo contra pérdida accidental de imágenes.
    - Agregado el campo `u.current_semester` a la consulta de `getAllMentors` para posibilitar el filtrado y ordenado por niveles en el cliente.

---

## [2026-05-27] - Recuperación de Contraseña y Notificaciones por Correo

### Frontend
- **Recuperación de Contraseña (`ForgotPassword.jsx` [NEW], `Login.jsx` & `App.jsx`)**:
    - Implementación de la vista completa para el flujo de recuperación de contraseña en tres pasos: solicitud con correo electrónico, verificación del código de 6 dígitos y restablecimiento seguro.
    - Se añadió el enlace "¿Olvidaste tu contraseña?" en el formulario de inicio de sesión.
    - Configuración de la nueva ruta `/forgot-password` en el enrutamiento de la aplicación.

### Backend
- **Servicio de Correo (`emailService.js` [NEW])**:
    - Integración de `nodemailer` con Gmail para el envío de correos.
    - Función `sendPasswordResetEmail`: Envía correos con plantillas HTML y un código seguro de verificación de 6 dígitos con expiración de 5 minutos.
    - Función `sendMentorshipStatusEmail`: Envía notificaciones por correo electrónico al alumno cuando su solicitud es **ACEPTADA** o **RECHAZADA** por el mentor.
- **Controlador de Autenticación (`authController.js`)**:
    - Nuevas funciones `forgotPassword`, `verifyResetCode` y `resetPassword` para gestionar la generación, expiración y verificación de los códigos de seguridad, así como el restablecimiento con hash de bcrypt.
- **Rutas (`authRoutes.js`)**:
    - Nuevos endpoints para `/forgot-password`, `/verify-reset-code` y `/reset-password`.

### Base de Datos
- **Esquema de Usuarios (`migrate.js`)**:
    - Se añadieron columnas `reset_code` y `reset_code_expires_at` para la gestión temporal de recuperación.

---

## [2026-04-23] - Espacio de Trabajo MiTutoría y Chat en Tiempo Real

### Frontend
- **Espacio de Trabajo MiTutoría (`MiTutoria.jsx` [NEW], `App.jsx`, `Navbar.jsx`)**:
    - Implementación del módulo completo **MiTutoría** con layout tipo Slack/Discord: sidebar izquierdo de navegación modular, área de contenido central dinámica, y panel lateral derecho colapsable de estatus.
    - Flujo inteligente de entrada: si el usuario tiene una sola tutoría aceptada, ingresa directamente al workspace; si tiene varias, se muestra un selector de tarjetas con indicador de estado activo.
    - Estado vacío elegante cuando no hay tutorías aceptadas, con redirección al buscador de mentores.
    - Configuración de la ruta `/mi-tutoria` en el enrutador con supresión del footer y bloqueo de scroll global para la experiencia inmersiva.
- **Layout del Workspace (`WorkspaceLayout.jsx` [NEW])**:
    - Contenedor principal con estructura `[LeftSidebar] | [TopBar + MainCanvas] | [RightSidebar]`.
    - Animación `fadeSlideIn` al cambiar de módulo en el canvas principal.
    - Placeholders configurables para módulos futuros (Repositorio, Tablón de Anuncios, Hoja de Ruta, Retos).
- **Sidebar Izquierdo (`LeftSidebar.jsx` [NEW])**:
    - Barra lateral de navegación con 5 módulos de enfoque: Canal Directo, Repositorio, Tablón de Anuncios, Hoja de Ruta, y Retos.
    - Indicador visual de módulo activo con barra lateral dorada, efectos hover y badges "Soon" para secciones pendientes.
    - Footer con mini-perfil del mentor y estado de conexión.
- **Barra Superior (`TopBar.jsx` [NEW])**:
    - Cabecera dinámica mostrando la materia, nombre del compañero con su rol (Mentor/Aprendiz), barra de progreso simulada (semana X de 16), y botones de acción (Marcar Hito, Finalizar).
- **Panel Lateral Derecho (`RightSidebar.jsx` [NEW])**:
    - Panel colapsable con mini-perfil del usuario, información del compañero, racha de semanas activa con diseño gradiente, y cuadrícula de insignias bloqueadas con tooltips.
- **Placeholder de Secciones (`PlaceholderView.jsx` [NEW])**:
    - Componente reutilizable para módulos en progreso con ícono pulsante, patrón de fondo punteado y badge "En Progreso".
- **Chat en Tiempo Real (`ChatView.jsx` [NEW])**:
    - Chat bidireccional con **Socket.IO** integrado al workspace. Conexión automática a la sala de la tutoría (`room_{mentorshipId}`).
    - Carga de historial completo de mensajes vía REST (`GET /api/chat/:mentorshipId`) al abrir el canal.
    - Burbujas de mensaje estilo iMessage: mensajes propios (azul navy, alineados a la derecha) y del compañero (blanco con borde, alineados a la izquierda) con avatares, nombres y timestamps.
    - Agrupación inteligente de mensajes consecutivos del mismo remitente dentro de ventanas de 5 minutos.
    - Separadores de fecha contextuales ("Hoy", "Ayer", o fecha completa).
    - Input auto-expandible con soporte para `Enter` (enviar) y `Shift+Enter` (nueva línea).
    - Indicador de conexión en tiempo real (punto verde pulsante "Conectado" / rojo "Sin conexión").
    - Auto-scroll suave al último mensaje y estado vacío invitando a iniciar la conversación.

### Backend
- **Backend del Chat en Tiempo Real (`chatSocket.js` [NEW], `chatService.js` [NEW], `ChatMessage.js` [NEW], `chatRoutes.js` [NEW])**:
    - Modelo Mongoose `ChatMessage` almacenado en MongoDB con campos `mentorship_id`, `sender_id`, `message` y timestamps automáticos. Índice en `mentorship_id` para consultas rápidas del historial.
    - Servicio `chatService.js` con funciones `createMessage` (persistir mensaje) y `getChatHistory` (obtener historial ordenado cronológicamente).
    - Socket handler `chatSocket.js` que registra eventos de conexión/desconexión, unión a salas por tutoría (`join_mentorship_room`), y difusión de mensajes (`send_message` → `receive_message`).
    - Endpoint REST `GET /api/chat/:mentorshipId` para obtener el historial de mensajes de una tutoría.
- **Configuración de MongoDB (`mongo.js`)**:
    - Conexión a MongoDB Atlas con soporte de DNS personalizado para resolver URIs `mongodb+srv://` en entornos con restricciones de red.
- **Servidor (`server.js`)**:
    - Integración de `socket.io` con el servidor HTTP de Express. Se registra el handler de chat al inicializar y se configuran las opciones de CORS para WebSockets.
- **Desacoplamiento del backend de chat**:
    - Se refactorizó la lógica de chat separando el socket handler, el servicio de datos y las rutas REST en módulos independientes para mayor mantenibilidad.

### Base de Datos
- **MongoDB (Atlas)**:
    - Colección `chatmessages` con esquema Mongoose indexado por `mentorship_id`.

---

## [2026-04-21] - Reprogramación, Visualización de Tutorías y Gestión de Notificaciones

### Frontend
- **Mensajes (`Mensajes.jsx`)**:
    - Rediseño de la bandeja para mostrar con mayor detalle las citas e interactuar directamente con las opciones de reprogramación y chat.
- **Solicitudes (`Solicitudes.jsx`) y Perfil (`Profile.jsx`)**:
    - Implementación del sistema de **Reprogramación (Re-agendar)**:
        - Permite proponer nuevas fechas, horas, modalidades o lugares con un límite de hasta 2 intentos antes de la cancelación automática.
        - Campo para justificar la razón del cambio (`reprogramming_reason`).
    - Visualización del estado actual de las tutorías.
    - Opción para eliminar/cancelar lógicamente las tutorías agendadas.
- **Barra de Navegación (`Navbar.jsx`)**:
    - Se agregaron contadores dinámicos de notificaciones (solicitudes pendientes para mentores y respuestas no leídas en la bandeja de entrada para alumnos).

### Backend
- **Controlador de Mentorías (`mentorshipController.js`)**:
    - Lógica de negocio para controlar el número de intentos de reprogramación y la asignación automática de estados (e.g., `CANCELADA` si se supera el límite de intentos).
    - Funciones `getNotificationCounts` para contar alertas pendientes y `markAsRead` para marcar mensajes como leídos.
    - Soporte para eliminación lógica (`deleteMentorship`).
- **Rutas (`mentorshipRoutes.js` y `userRoutes.js`)**:
    - Incorporación de los endpoints `/notification-counts/:userId`, `/:id/read` y `DELETE /:id`.

### Base de Datos
- **Esquema de Mentorías (`migrate.js`)**:
    - Se añadieron las columnas `is_deleted` para borrado lógico y `apprentice_notified` para marcar el estado de lectura de la notificación.

---

## [2026-04-19] - Mejoras en el Flujo de Tutorías

### Frontend
- **Gestión de Perfil (`Profile.jsx`)**:
    - Se rediseñó el modal **"Pactar Tutoría"** para incluir la selección de modalidad (**Presencial** u **Online**).
    - Implementación de lógica condicional:
        - Para **Presencial**: Campo para especificar el lugar de reunión.
        - Para **Online**: Selección de plataforma (Meet, Zoom, Teams).
- **Gestión de Solicitudes (`Solicitudes.jsx`)**:
    - Las tarjetas de solicitud ahora muestran la modalidad y el lugar/plataforma propuestos.
    - Se mejoró el proceso de **"Aceptar Tutoría"**:
        - Si es Online, el mentor ahora debe configurar los datos de acceso (Link de reunión, ID de Zoom o contraseña) antes de confirmar.
- **Bandeja de Entrada (`Mensajes.jsx`)**:
    - Se añadió la sección **"Detalles de la Cita"** en la vista del alumno.
    - Los alumnos ahora pueden ver la ubicación física o el link directo para unirse a sesiones virtuales mediante un botón de acceso rápido.

### Backend
- **Controlador de Mentorías (`mentorshipController.js`)**:
    - Se actualizaron las funciones `createMentorship` y `updateMentorship` para soportar los nuevos campos de modalidad y acceso.
    - La función `getMentorshipsByUser` ahora devuelve la información completa de la cita, permitiendo una experiencia más rica en el frontend.

### Base de Datos
- **Actualización de Esquema (`Mentorships`)**:
    - Se añadieron columnas: `modality`, `meeting_place`, `platform`, `meeting_link`, `zoom_code` y `zoom_password`.

---
