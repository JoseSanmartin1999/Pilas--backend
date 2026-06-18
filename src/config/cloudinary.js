import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configuración de usuario usando variables de entorno como buena práctica
const CLOUDINARY_CONFIG = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfuk35w6v',
    api_key: process.env.CLOUDINARY_API_KEY || '848587619474894',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'Zth95Bz2HmlK6j5Oc_2AIuBW1cY'
};

cloudinary.config(CLOUDINARY_CONFIG);

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pilas_profiles',
        format: async (req, file) => 'png', // supports promises as well
        public_id: (req, file) => `profile-${Date.now()}`
    },
});

export const upload = multer({ storage: storage });
export default cloudinary;
