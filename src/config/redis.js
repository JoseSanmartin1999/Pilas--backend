// backend/src/config/redis.js
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// La URL la pegas en tu archivo .env como REDIS_URL
const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        // Si ya falló más de 3 veces, reintentar cada 30 segundos para evitar saturar la red y la consola
        if (times > 3) {
            return 30000;
        }
        return 5000; // Esperar 5 segundos en los primeros intentos
    }
});

redis.on('connect', () => {
    console.log('✅ Conectado a Redis (Upstash) con éxito');
});

redis.on('error', (err) => {
    // Imprimir el error en una sola línea limpia en lugar de todo el stack trace
    console.warn(`⚠️ Advertencia Redis: No se pudo conectar (${err.message})`);
});

export default redis;