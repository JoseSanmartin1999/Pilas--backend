import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    stages: [
        { duration: '15s', target: 100 }, // Subida: 100 usuarios virtuales en 15s
        { duration: '30s', target: 100 }, // Carga constante: 100 usuarios por 30s
        { duration: '15s', target: 0 },  // Bajada: 0 usuarios en 15s
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // El 95% de las peticiones deben responder en menos de 500ms
    },
};

export default function () {
    const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
    const params = {
        headers: {
            'x-bypass-rate-limit': __ENV.BYPASS_TOKEN || '',
        },
    };

    // 1. Endpoint de Salud (Health Check)
    const resHealth = http.get(`${BASE_URL}/health`, params);
    check(resHealth, {
        'Salud responde 200': (r) => r.status === 200,
    });

    sleep(1);

    // 2. Endpoint de Materias (Lectura de Base de Datos)
    const resSubjects = http.get(`${BASE_URL}/subjects?semester=1`, params);
    check(resSubjects, {
        'Materias responde 200': (r) => r.status === 200,
    });

    sleep(2);
}
