import { upload } from '../config/cloudinary.js';

// Exportamos el middleware de multer configurado para ser usado en las rutas.
// Esto permite que 'upload.single()' o 'upload.array()' funcionen correctamente.
export default upload;
