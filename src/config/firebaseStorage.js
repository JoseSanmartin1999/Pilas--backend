import axios from 'axios';

const STORAGE_BUCKET = 'pilastutorias.firebasestorage.app';

/**
 * Uploads a file buffer to Firebase Storage via the REST API.
 * This runs on the backend, completely avoiding browser CORS policy restrictions.
 * 
 * @param {Buffer} fileBuffer - The file buffer.
 * @param {string} originalname - The original name of the file.
 * @param {string} mimetype - The MIME type of the file.
 * @returns {Promise<string>} The public download URL.
 */
export const uploadToFirebaseStorage = async (fileBuffer, originalname, mimetype) => {
    try {
        const fileName = `badges/${Date.now()}_${originalname}`;
        const encodedPath = encodeURIComponent(fileName);
        const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}`;

        const response = await axios.post(url, fileBuffer, {
            headers: {
                'Content-Type': mimetype || 'image/png'
            }
        });

        // Firebase Storage returns a token in the response metadata
        const downloadToken = response.data.downloadTokens;
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${downloadToken}`;

        return downloadUrl;
    } catch (error) {
        console.error('Error uploading to Firebase Storage via REST:', error.response?.data || error.message);
        throw error;
    }
};

export default {
    uploadToFirebaseStorage
};
