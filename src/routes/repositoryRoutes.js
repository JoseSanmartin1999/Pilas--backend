import express from 'express';
import { repositoryUpload } from '../config/cloudinaryRepository.js';
import {
    getMaterials,
    getStorageInfo,
    uploadMaterial,
    updateMaterial,
    replaceFile,
    deleteMaterial,
    downloadMaterial
} from '../controllers/repositoryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
    validateMentorshipIdRouteParam,
    validateMaterialIdParam,
    validateRepositoryMaterial
} from '../middleware/validators.js';

const router = express.Router();

// Todas las rutas del repositorio requieren token JWT
router.use(authenticateToken);

// GET /api/repository/:mentorshipId — Listar materiales
router.get('/:mentorshipId', validateMentorshipIdRouteParam, getMaterials);

// GET /api/repository/:mentorshipId/storage — Info de almacenamiento
router.get('/:mentorshipId/storage', validateMentorshipIdRouteParam, getStorageInfo);

// POST /api/repository/:mentorshipId — Subir material (con archivo)
router.post('/:mentorshipId', validateMentorshipIdRouteParam, repositoryUpload.single('file'), validateRepositoryMaterial, uploadMaterial);

// PUT /api/repository/material/:materialId — Editar título/descripción
router.put('/material/:materialId', validateMaterialIdParam, validateRepositoryMaterial, updateMaterial);

// PUT /api/repository/material/:materialId/file — Reemplazar archivo
router.put('/material/:materialId/file', validateMaterialIdParam, repositoryUpload.single('file'), replaceFile);

// DELETE /api/repository/material/:materialId — Eliminar material
router.delete('/material/:materialId', validateMaterialIdParam, deleteMaterial);

// GET /api/repository/material/:materialId/download — Descargar archivo como attachment
router.get('/material/:materialId/download', validateMaterialIdParam, downloadMaterial);

export default router;
