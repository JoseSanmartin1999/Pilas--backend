# Pilas! - Backend

Este repositorio contiene el backend de **Pilas!**, una plataforma de tutorías entre pares para los estudiantes de la ESPE. Está desarrollado en Node.js utilizando Express, WebSockets y una arquitectura con múltiples bases de datos.

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalado:
* **Node.js** (versión 18 o superior recomendada)
* **npm** o tu gestor de paquetes favorito

El backend se conecta a los siguientes servicios (configurados a través del archivo `.env`):
1. **Base de Datos Relacional**: TiDB Cloud (MySQL compatible)
2. **Caché y Rankings**: Redis (Upstash)
3. **Persistencia del Chat**: MongoDB
4. **Almacenamiento de Imágenes**: Cloudinary e ImageKit
5. **Correos Electrónicos**: Nodemailer

---

## ⚙️ Configuración del Proyecto

### 1. Instalar dependencias
Desde la raíz de la carpeta `Pilas--backend`, ejecuta:
```bash
npm install
```

### 2. Configurar variables de entorno
Crea un archivo llamado `.env` en la raíz de la carpeta `Pilas--backend` con las siguientes variables:
```env
# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Base de Datos Principal: TiDB Cloud (MySQL)
DB_HOST=tu_host_de_tidb
DB_PORT=4000
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=pilas_tutorias

# Cache y Rankings: Redis
REDIS_URL="redis://default:tu_token@tu_host_de_redis:puerto"

# Almacenamiento de Imágenes: Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Seguridad y Autenticación
JWT_SECRET=tu_clave_secreta_muy_larga
JWT_EXPIRES_IN=7d

# Chat: MongoDB
MONGO_URI=mongodb+srv://tu_usuario:tu_contraseña@tu_cluster.mongodb.net/

# Email Configuration (Nodemailer)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion

# ImageKit Configuration (Insignias Personalizadas)
IMAGEKIT_PUBLIC_KEY=tu_public_key
IMAGEKIT_PRIVATE_KEY=tu_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tu_endpoint/
```

### 3. Ejecutar migraciones y sembrado (Seeding)
Para crear las tablas necesarias en la base de datos MySQL/TiDB, sembrar las insignias iniciales y crear el usuario administrador por defecto (`admin@pilas.edu.ec` con contraseña `admin123`), ejecuta:
```bash
node migrate.js
```

---

## 🚀 Ejecución del Servidor

### Modo Desarrollo (con recarga automática mediante nodemon)
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor de backend y WebSockets iniciará en el puerto configurado (por defecto: `http://localhost:3000`).
