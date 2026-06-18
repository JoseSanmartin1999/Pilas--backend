import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';

// Cloudinary ya está configurado globalmente en cloudinary.js,
// pero nos aseguramos de que esté configurado por si se importa primero este módulo.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfuk35w6v',
    api_key: process.env.CLOUDINARY_API_KEY || '848587619474894',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'Zth95Bz2HmlK6j5Oc_2AIuBW1cY'
});

// Extensiones permitidas por categoría
const ALLOWED_EXTENSIONS = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    video: ['.mp4', '.webm', '.mov'],
    document: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.rar', '.txt', '.py', '.java', '.js', '.cpp', '.c', '.ts', '.html', '.css']
};

const ALL_ALLOWED = [
    ...ALLOWED_EXTENSIONS.image,
    ...ALLOWED_EXTENSIONS.video,
    ...ALLOWED_EXTENSIONS.document
];

/**
 * Determina el tipo de archivo a partir de su extensión
 */
export const getFileType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    if (ALLOWED_EXTENSIONS.image.includes(ext)) return 'image';
    if (ALLOWED_EXTENSIONS.video.includes(ext)) return 'video';
    if (ALLOWED_EXTENSIONS.document.includes(ext)) return 'document';
    return 'unknown';
};

/**
 * Determina el resource_type de Cloudinary según la extensión del archivo
 */
const getCloudinaryResourceType = (filename) => {
    const type = getFileType(filename);
    if (type === 'image') return 'image';
    if (type === 'video') return 'video';
    return 'raw'; // Documentos y archivos genéricos van como 'raw'
};

/**
 * Multer configurado con almacenamiento en memoria (buffer).
 * La subida a Cloudinary se hará manualmente en el controller
 * para tener control total sobre resource_type y folder.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALL_ALLOWED.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de archivo no permitido: ${ext}. Tipos permitidos: ${ALL_ALLOWED.join(', ')}`), false);
    }
};

export const repositoryUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB máximo por archivo
    }
});

/**
 * Sube un buffer a Cloudinary con los parámetros correctos
 */
export const uploadToCloudinary = (fileBuffer, originalname, mentorshipId) => {
    return new Promise((resolve, reject) => {
        const resourceType = getCloudinaryResourceType(originalname);
        const ext = path.extname(originalname).toLowerCase();
        const nameWithoutExt = path.basename(originalname, ext);
        const publicId = `pilas_repository/${mentorshipId}/${nameWithoutExt}-${Date.now()}`;

        const uploadOptions = {
            resource_type: resourceType,
            public_id: publicId,
            folder: undefined, // Ya incluido en public_id
        };

        // Para archivos raw, mantener la extensión original en la URL
        if (resourceType === 'raw') {
            uploadOptions.format = ext.replace('.', '');
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Elimina un archivo de Cloudinary
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
        return result;
    } catch (error) {
        console.error('Error eliminando de Cloudinary:', error);
        throw error;
    }
};

export default cloudinary;
