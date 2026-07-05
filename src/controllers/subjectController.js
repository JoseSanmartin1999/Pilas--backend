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
            }
            // No fallback: if career is not found, return empty array rather than
            // accidentally returning subjects from a wrong or default career.
        }

        const rows = await subjectRepository.getSubjectsBySemesterAndCareer(semester, matchedCareerId);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};