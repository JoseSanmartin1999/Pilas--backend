import db from '../config/db.js';
import axios from 'axios';
import cloudinary, { uploadToCloudinary, deleteFromCloudinary, getFileType } from '../config/cloudinaryRepository.js';
import path from 'path';

// Límite de almacenamiento por tutoría: 300MB en bytes
const STORAGE_LIMIT_BYTES = 300 * 1024 * 1024;

/**
 * Helper: Verificar que el usuario pertenece a la tutoría
 */
const verifyMentorshipAccess = async (mentorshipId, userId) => {
    const [rows] = await db.query(
        'SELECT id, mentor_id, apprentice_id, status FROM Mentorships WHERE id = ? AND (mentor_id = ? OR apprentice_id = ?) AND is_deleted = 0',
        [mentorshipId, userId, userId]
    );
    if (rows.length === 0) return null;
    return rows[0];
};

/**
 * Helper: Obtener espacio usado por una tutoría
 */
const getUsedStorage = async (mentorshipId) => {
    const [rows] = await db.query(
        'SELECT COALESCE(SUM(file_size), 0) as total_size FROM Repository_Materials WHERE mentorship_id = ?',
        [mentorshipId]
    );
    return rows[0].total_size;
};

/**
 * GET /api/repository/:mentorshipId
 * Listar todos los materiales de una tutoría
 */
export const getMaterials = async (req, res) => {
    const { mentorshipId } = req.params;
    const userId = req.query.userId;

    try {
        // Verificar acceso
        const mentorship = await verifyMentorshipAccess(mentorshipId, userId);
        if (!mentorship) {
            return res.status(403).json({ error: 'No tienes acceso a esta tutoría' });
        }

        const [materials] = await db.query(
            `SELECT rm.*, u.full_name as uploader_name
             FROM Repository_Materials rm
             JOIN Users u ON rm.uploader_id = u.id
             WHERE rm.mentorship_id = ?
             ORDER BY rm.created_at DESC`,
            [mentorshipId]
        );

        res.json(materials);
    } catch (error) {
        console.error('Error obteniendo materiales:', error);
        res.status(500).json({ error: 'Error al obtener los materiales' });
    }
};

/**
 * GET /api/repository/:mentorshipId/storage
 * Obtener información de almacenamiento
 */
export const getStorageInfo = async (req, res) => {
    const { mentorshipId } = req.params;
    const userId = req.query.userId;

    try {
        const mentorship = await verifyMentorshipAccess(mentorshipId, userId);
        if (!mentorship) {
            return res.status(403).json({ error: 'No tienes acceso a esta tutoría' });
        }

        const usedBytes = await getUsedStorage(mentorshipId);
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total_files FROM Repository_Materials WHERE mentorship_id = ?',
            [mentorshipId]
        );

        res.json({
            used_bytes: Number(usedBytes),
            limit_bytes: STORAGE_LIMIT_BYTES,
            remaining_bytes: STORAGE_LIMIT_BYTES - Number(usedBytes),
            total_files: countResult[0].total_files,
            percentage: Math.round((Number(usedBytes) / STORAGE_LIMIT_BYTES) * 100)
        });
    } catch (error) {
        console.error('Error obteniendo info de almacenamiento:', error);
        res.status(500).json({ error: 'Error al obtener información de almacenamiento' });
    }
};

/**
 * POST /api/repository/:mentorshipId
 * Subir nuevo material (solo mentor)
 */
export const uploadMaterial = async (req, res) => {
    const { mentorshipId } = req.params;
    const { title, description, userId } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo' });
    }
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'El título es obligatorio' });
    }

    try {
        // Verificar que el usuario es el mentor de esta tutoría
        const mentorship = await verifyMentorshipAccess(mentorshipId, userId);
        if (!mentorship) {
            return res.status(403).json({ error: 'No tienes acceso a esta tutoría' });
        }
        if (String(mentorship.mentor_id) !== String(userId)) {
            return res.status(403).json({ error: 'Solo el mentor puede subir materiales' });
        }
        if (mentorship.status === 'COMPLETADA') {
            return res.status(403).json({ error: 'La tutoría está cerrada y no admite modificaciones.' });
        }

        // Verificar límite de almacenamiento
        const usedBytes = await getUsedStorage(mentorshipId);
        const fileSize = req.file.size;

        if (Number(usedBytes) + fileSize > STORAGE_LIMIT_BYTES) {
            const remainingMB = ((STORAGE_LIMIT_BYTES - Number(usedBytes)) / (1024 * 1024)).toFixed(1);
            const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
            return res.status(400).json({
                error: `No hay espacio suficiente. El archivo pesa ${fileSizeMB}MB pero solo quedan ${remainingMB}MB disponibles.`
            });
        }

        // Subir a Cloudinary
        const cloudResult = await uploadToCloudinary(
            req.file.buffer,
            req.file.originalname,
            mentorshipId
        );

        // Determinar tipo de archivo
        const fileType = getFileType(req.file.originalname);
        const resourceType = fileType === 'image' ? 'image' : (fileType === 'video' ? 'video' : 'raw');

        // Guardar en base de datos
        const [result] = await db.query(
            `INSERT INTO Repository_Materials 
             (mentorship_id, uploader_id, title, description, file_url, file_name, file_size, file_type, mime_type, cloudinary_public_id, cloudinary_resource_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                mentorshipId,
                userId,
                title.trim(),
                description?.trim() || null,
                cloudResult.secure_url,
                req.file.originalname,
                fileSize,
                fileType,
                req.file.mimetype,
                cloudResult.public_id,
                resourceType
            ]
        );

        res.status(201).json({
            message: 'Material subido exitosamente',
            material: {
                id: result.insertId,
                title: title.trim(),
                description: description?.trim() || null,
                file_url: cloudResult.secure_url,
                file_name: req.file.originalname,
                file_size: fileSize,
                file_type: fileType,
                mime_type: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Error subiendo material:', error);
        if (error.message?.includes('Tipo de archivo no permitido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al subir el material' });
    }
};

/**
 * PUT /api/repository/material/:materialId
 * Editar título y descripción de un material (solo mentor)
 */
export const updateMaterial = async (req, res) => {
    const { materialId } = req.params;
    const { title, description, userId } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'El título es obligatorio' });
    }

    try {
        // Obtener el material y verificar permisos
        const [materials] = await db.query(
            'SELECT rm.*, m.mentor_id, m.status FROM Repository_Materials rm JOIN Mentorships m ON rm.mentorship_id = m.id WHERE rm.id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        const material = materials[0];
        if (String(material.mentor_id) !== String(userId)) {
            return res.status(403).json({ error: 'Solo el mentor puede editar materiales' });
        }
        if (material.status === 'COMPLETADA') {
            return res.status(403).json({ error: 'La tutoría está cerrada y no admite modificaciones.' });
        }

        await db.query(
            'UPDATE Repository_Materials SET title = ?, description = ? WHERE id = ?',
            [title.trim(), description?.trim() || null, materialId]
        );

        res.json({ message: 'Material actualizado correctamente' });

    } catch (error) {
        console.error('Error actualizando material:', error);
        res.status(500).json({ error: 'Error al actualizar el material' });
    }
};

/**
 * PUT /api/repository/material/:materialId/file
 * Reemplazar el archivo de un material (solo mentor)
 */
export const replaceFile = async (req, res) => {
    const { materialId } = req.params;
    const { userId } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    try {
        // Obtener el material actual
        const [materials] = await db.query(
            'SELECT rm.*, m.mentor_id, m.status FROM Repository_Materials rm JOIN Mentorships m ON rm.mentorship_id = m.id WHERE rm.id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        const material = materials[0];
        if (String(material.mentor_id) !== String(userId)) {
            return res.status(403).json({ error: 'Solo el mentor puede reemplazar archivos' });
        }
        if (material.status === 'COMPLETADA') {
            return res.status(403).json({ error: 'La tutoría está cerrada y no admite modificaciones.' });
        }

        // Verificar que el nuevo archivo cabe en el espacio (restando el viejo)
        const usedBytes = await getUsedStorage(material.mentorship_id);
        const newFileSize = req.file.size;
        const adjustedUsed = Number(usedBytes) - Number(material.file_size);

        if (adjustedUsed + newFileSize > STORAGE_LIMIT_BYTES) {
            const remainingMB = ((STORAGE_LIMIT_BYTES - adjustedUsed) / (1024 * 1024)).toFixed(1);
            const fileSizeMB = (newFileSize / (1024 * 1024)).toFixed(1);
            return res.status(400).json({
                error: `No hay espacio suficiente. El archivo pesa ${fileSizeMB}MB pero solo quedan ${remainingMB}MB disponibles.`
            });
        }

        // Eliminar archivo viejo de Cloudinary
        try {
            await deleteFromCloudinary(material.cloudinary_public_id, material.cloudinary_resource_type || 'image');
        } catch (err) {
            console.warn('No se pudo eliminar el archivo anterior de Cloudinary:', err.message);
        }

        // Subir nuevo archivo
        const cloudResult = await uploadToCloudinary(
            req.file.buffer,
            req.file.originalname,
            material.mentorship_id
        );

        const fileType = getFileType(req.file.originalname);
        const resourceType = fileType === 'image' ? 'image' : (fileType === 'video' ? 'video' : 'raw');

        // Actualizar en base de datos
        await db.query(
            `UPDATE Repository_Materials 
             SET file_url = ?, file_name = ?, file_size = ?, file_type = ?, mime_type = ?, cloudinary_public_id = ?, cloudinary_resource_type = ?
             WHERE id = ?`,
            [
                cloudResult.secure_url,
                req.file.originalname,
                newFileSize,
                fileType,
                req.file.mimetype,
                cloudResult.public_id,
                resourceType,
                materialId
            ]
        );

        res.json({
            message: 'Archivo reemplazado correctamente',
            material: {
                file_url: cloudResult.secure_url,
                file_name: req.file.originalname,
                file_size: newFileSize,
                file_type: fileType,
                mime_type: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Error reemplazando archivo:', error);
        res.status(500).json({ error: 'Error al reemplazar el archivo' });
    }
};

/**
 * DELETE /api/repository/material/:materialId
 * Eliminar un material (solo mentor)
 */
export const deleteMaterial = async (req, res) => {
    const { materialId } = req.params;
    const { userId } = req.query;

    try {
        // Obtener el material y verificar permisos
        const [materials] = await db.query(
            'SELECT rm.*, m.mentor_id, m.status FROM Repository_Materials rm JOIN Mentorships m ON rm.mentorship_id = m.id WHERE rm.id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        const material = materials[0];
        if (String(material.mentor_id) !== String(userId)) {
            return res.status(403).json({ error: 'Solo el mentor puede eliminar materiales' });
        }
        if (material.status === 'COMPLETADA') {
            return res.status(403).json({ error: 'La tutoría está cerrada y no admite modificaciones.' });
        }

        // Eliminar de Cloudinary
        try {
            await deleteFromCloudinary(material.cloudinary_public_id, material.cloudinary_resource_type || 'image');
        } catch (err) {
            console.warn('No se pudo eliminar de Cloudinary:', err.message);
        }

        // Eliminar de la base de datos
        await db.query('DELETE FROM Repository_Materials WHERE id = ?', [materialId]);

        res.json({ message: 'Material eliminado correctamente' });

    } catch (error) {
        console.error('Error eliminando material:', error);
        res.status(500).json({ error: 'Error al eliminar el material' });
    }
};

/**
 * GET /api/repository/material/:materialId/download
 * Proxy que obtiene el archivo desde Cloudinary y lo sirve con encabezados
 * para forzar la descarga en el navegador (Content-Disposition: attachment)
 */
export const downloadMaterial = async (req, res) => {
    const { materialId } = req.params;
    const userId = req.query.userId;

    try {
        const [materials] = await db.query(
            'SELECT rm.*, m.mentor_id FROM Repository_Materials rm JOIN Mentorships m ON rm.mentorship_id = m.id WHERE rm.id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        const material = materials[0];

        const mentorship = await verifyMentorshipAccess(material.mentorship_id, userId);
        if (!mentorship) {
            return res.status(403).json({ error: 'No tienes acceso a esta tutoría' });
        }

        const resourceType = material.cloudinary_resource_type || 'raw';
        const fileExtension = path.extname(material.file_name).replace('.', '') || undefined;

        const downloadUrl = cloudinary.utils.private_download_url(
            material.cloudinary_public_id,
            fileExtension,
            {
                resource_type: resourceType,
                type: 'upload',
                attachment: material.file_name,
            }
        );

        console.log('[downloadMaterial] using signed download URL', downloadUrl);

        const remoteRes = await axios.get(downloadUrl, {
            responseType: 'stream',
            maxRedirects: 5,
            validateStatus: (status) => status < 500,
        });

        if (remoteRes.status >= 400) {
            console.error('Error obteniendo archivo desde Cloudinary con URL firmada, status:', remoteRes.status, 'content-type:', remoteRes.headers['content-type']);
            return res.status(502).json({ error: 'No se pudo obtener el archivo remoto' });
        }

        const filename = (material.file_name || 'download').replace(/\"/g, '');
        res.setHeader('Content-Type', material.mime_type || remoteRes.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (remoteRes.headers['content-length']) {
            res.setHeader('Content-Length', remoteRes.headers['content-length']);
        }

        remoteRes.data.pipe(res);
        remoteRes.data.on('error', (err) => {
            console.error('Error al leer el stream remoto:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Error al descargar el archivo' });
        });

        return;

        const fetchAndPipe = (url, redirectCount = 0) => {
            if (redirectCount > maxRedirects) {
                res.status(500).json({ error: 'Demasiadas redirecciones al obtener el archivo' });
                return;
            }

            const parsed = new URL(url);
            const client = parsed.protocol === 'https:' ? https : http;

            const request = client.get(url, (cloudRes) => {
                console.log('[downloadMaterial] fetching', url, 'status', cloudRes.statusCode, 'content-type', cloudRes.headers['content-type']);

                // seguir redirecciones
                if (cloudRes.statusCode >= 300 && cloudRes.statusCode < 400 && cloudRes.headers.location) {
                    const nextUrl = new URL(cloudRes.headers.location, url).href;
                    cloudRes.resume();
                    fetchAndPipe(nextUrl, redirectCount + 1);
                    return;
                }

                if (cloudRes.statusCode && cloudRes.statusCode >= 400) {
                    console.error('Error obteniendo archivo desde Cloudinary, status:', cloudRes.statusCode);
                    res.status(502).json({ error: 'No se pudo obtener el archivo remoto' });
                    return;
                }

                const contentType = (cloudRes.headers['content-type'] || '').toLowerCase();

                // Si recibimos HTML/JSON (visor o página) intentamos forzar attachment con fl_attachment
                if (contentType.includes('text/html') || contentType.includes('application/json')) {
                    console.warn('[downloadMaterial] remote returned HTML/JSON; attempting fl_attachment URL');

                    try {
                        const u = new URL(url);
                        // insertar 'fl_attachment' después de '/upload/'
                        if (u.pathname.includes('/upload/')) {
                            u.pathname = u.pathname.replace('/upload/', '/upload/fl_attachment/');
                        } else {
                            const idx = u.pathname.indexOf('/upload');
                            if (idx !== -1) {
                                const rebuilt = u.pathname.slice(0, idx + 7) + '/fl_attachment' + u.pathname.slice(idx + 7);
                                u.pathname = rebuilt;
                            } else {
                                console.error('[downloadMaterial] no se encontró /upload en la ruta, no se puede aplicar fl_attachment');
                                res.status(502).json({ error: 'El recurso remoto no devolvió el archivo correcto' });
                                cloudRes.resume();
                                return;
                            }
                        }

                        const attachmentUrl = u.href;
                        cloudRes.resume();
                        fetchAndPipe(attachmentUrl, redirectCount + 1);
                        return;
                    } catch (e) {
                        console.error('[downloadMaterial] error construyendo attachment URL', e);
                        res.status(502).json({ error: 'Error construyendo URL de descarga' });
                        cloudRes.resume();
                        return;
                    }
                }

                // Copiar headers relevantes (evitar hop-by-hop) y forzar attachment
                const filename = material.file_name || 'download';
                const safeFilename = filename.replace(/\"/g, '');

                Object.entries(cloudRes.headers).forEach(([key, value]) => {
                    const lk = key.toLowerCase();
                    if (lk === 'content-disposition') return;
                    if (['connection', 'keep-alive', 'transfer-encoding', 'upgrade'].includes(lk)) return;
                    try { res.setHeader(key, value); } catch (e) { /* ignore */ }
                });

                res.setHeader('Content-Type', material.mime_type || cloudRes.headers['content-type'] || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
                if (cloudRes.headers['content-length']) {
                    res.setHeader('Content-Length', cloudRes.headers['content-length']);
                }

                if (cloudRes.statusCode) res.statusCode = cloudRes.statusCode;

                cloudRes.pipe(res);
            });

            request.on('error', (err) => {
                console.error('Error proxying file:', err);
                if (!res.headersSent) res.status(500).json({ error: 'Error al descargar el archivo' });
            });
        };


    } catch (error) {
        console.error('Error en downloadMaterial:', error);
        res.status(500).json({ error: 'Error al procesar la descarga' });
    }
};
