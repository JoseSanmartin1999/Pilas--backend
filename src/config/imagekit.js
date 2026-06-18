import axios from 'axios';

/**
 * Uploads a file buffer to ImageKit via the REST API.
 * 
 * @param {Buffer} fileBuffer - The file buffer.
 * @param {string} originalname - The original name of the file.
 * @param {string} mimetype - The MIME type of the file.
 * @returns {Promise<string>} The public download URL.
 */
export const uploadToImageKit = async (fileBuffer, originalname, mimetype) => {
    try {
        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

        if (!privateKey || !urlEndpoint) {
            throw new Error("Faltan las credenciales de ImageKit en las variables de entorno.");
        }

        const formData = new FormData();
        const base64File = fileBuffer.toString('base64');
        formData.append('file', base64File);
        formData.append('fileName', `${Date.now()}_${originalname}`);
        formData.append('folder', '/badges');

        const authHeader = Buffer.from(`${privateKey}:`).toString('base64');

        const response = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
            headers: {
                'Authorization': `Basic ${authHeader}`
            }
        });

        // ImageKit returns the public URL in the 'url' field of response.data
        return response.data.url;
    } catch (error) {
        console.error('Error uploading to ImageKit via REST:', error.response?.data || error.message);
        throw error;
    }
};

export default {
    uploadToImageKit
};
