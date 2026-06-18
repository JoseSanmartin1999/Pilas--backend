import express from 'express';
import { repositoryUpload } from '../config/cloudinaryRepository.js';
import {
    getMaterials,
    getStorageInfo,
    uploadMaterial,
    updateMaterial,
    replaceFile,
    deleteMaterial
} from '../controllers/repositoryController.js';
import { downloadMaterial } from '../controllers/repositoryController.js';

const router = express.Router();

// GET /api/repository/:mentorshipId — Listar materiales
router.get('/:mentorshipId', getMaterials);

// GET /api/repository/:mentorshipId/storage — Info de almacenamiento
router.get('/:mentorshipId/storage', getStorageInfo);

// POST /api/repository/:mentorshipId — Subir material (con archivo)
router.post('/:mentorshipId', repositoryUpload.single('file'), uploadMaterial);

// PUT /api/repository/material/:materialId — Editar título/descripción
router.put('/material/:materialId', updateMaterial);

// PUT /api/repository/material/:materialId/file — Reemplazar archivo
router.put('/material/:materialId/file', repositoryUpload.single('file'), replaceFile);

// DELETE /api/repository/material/:materialId — Eliminar material
router.delete('/material/:materialId', deleteMaterial);

// GET /api/repository/material/:materialId/download — Descargar archivo como attachment
router.get('/material/:materialId/download', downloadMaterial);

export default router;
