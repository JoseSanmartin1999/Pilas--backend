import * as subjectRepository from '../repositories/subjectRepository.js';

export const getSubjectsBySemester = async (req, res, next) => {
    const semester = req.query.semester || 1;
    const { career_id, career_name } = req.query;
    try {
        let matchedCareerId = null;

        if (career_id) {
            matchedCareerId = career_id;
        } else if (career_name) {
            const career = await subjectRepository.findCareerByName(career_name);
            if (career) {
                matchedCareerId = career.id;
            } else {
                // Fallback: Si no se encuentra carrera por el nombre, usar la primera carrera por defecto (ej. Ingeniería de Software)
                const defaultCareer = await subjectRepository.findDefaultCareer();
                if (defaultCareer) {
                    matchedCareerId = defaultCareer.id;
                }
            }
        }

        const rows = await subjectRepository.getSubjectsBySemesterAndCareer(semester, matchedCareerId);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};