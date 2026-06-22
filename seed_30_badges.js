// backend/seed_30_badges.js
import db from './src/config/db.js';

const BADGES = [
    // 1. Inicios y Perfil (Generales)
    {
        name: 'Miembro Oficial',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png',
        criteria: JSON.stringify({ type: 'profile_configured', value: 1 }),
        xp_reward: 50,
        coins_reward: 25
    },
    {
        name: 'Primer Paso',
        image_url: 'https://cdn-icons-png.flaticon.com/512/484/484167.png',
        criteria: JSON.stringify({ type: 'first_login', value: 1 }),
        xp_reward: 30,
        coins_reward: 15
    },
    {
        name: 'Explorador',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2010/2010260.png',
        criteria: JSON.stringify({ type: 'mentorships_any', value: 1 }),
        xp_reward: 100,
        coins_reward: 50
    },
    {
        name: 'Iniciado de la ESPE',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3585/3585145.png',
        criteria: JSON.stringify({ type: 'xp_earned', value: 200 }),
        xp_reward: 80,
        coins_reward: 40
    },
    {
        name: 'Compañero Confiable',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png',
        criteria: JSON.stringify({ type: 'mentorships_any', value: 5 }),
        xp_reward: 200,
        coins_reward: 100
    },

    // 2. Aprendiz (Tutorías Recibidas)
    {
        name: 'Buscador de Respuestas',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3240/3240652.png',
        criteria: JSON.stringify({ type: 'mentorships_received', value: 1 }),
        xp_reward: 50,
        coins_reward: 25
    },
    {
        name: 'Estudiante Constante',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2996/2996163.png',
        criteria: JSON.stringify({ type: 'mentorships_received', value: 5 }),
        xp_reward: 150,
        coins_reward: 75
    },
    {
        name: 'Súper Aprendiz',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2010/2010274.png',
        criteria: JSON.stringify({ type: 'mentorships_received', value: 10 }),
        xp_reward: 300,
        coins_reward: 150
    },
    {
        name: 'Erudito en Camino',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2436/2436636.png',
        criteria: JSON.stringify({ type: 'mentorships_received', value: 25 }),
        xp_reward: 600,
        coins_reward: 300
    },
    {
        name: 'Sabio de la ESPE',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
        criteria: JSON.stringify({ type: 'mentorships_received', value: 50 }),
        xp_reward: 1200,
        coins_reward: 600
    },

    // 3. Mentor (Tutorías Impartidas)
    {
        name: 'Primer Mentoría',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1975/1975643.png',
        criteria: JSON.stringify({ type: 'mentorships_given', value: 1 }),
        xp_reward: 100,
        coins_reward: 50
    },
    {
        name: 'Mentor Activo',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1975/1975681.png',
        criteria: JSON.stringify({ type: 'mentorships_given', value: 5 }),
        xp_reward: 300,
        coins_reward: 150
    },
    {
        name: 'Guía de Confianza',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        criteria: JSON.stringify({ type: 'mentorships_given', value: 10 }),
        xp_reward: 500,
        coins_reward: 250
    },
    {
        name: 'Socio de Bienestar',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2201/2201509.png',
        criteria: JSON.stringify({ type: 'mentorships_given', value: 25 }),
        xp_reward: 1000,
        coins_reward: 500
    },
    {
        name: 'Leyenda del Conocimiento',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
        criteria: JSON.stringify({ type: 'mentorships_given', value: 50 }),
        xp_reward: 2000,
        coins_reward: 1000
    },

    // 4. Calidad y Excelencia (Calificaciones Altas como Mentor)
    {
        name: 'Buen Comienzo',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
        criteria: JSON.stringify({ type: 'high_rating_streak', value: 1 }),
        xp_reward: 80,
        coins_reward: 40
    },
    {
        name: 'Tutor de Excelencia',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2190/2190530.png',
        criteria: JSON.stringify({ type: 'high_rating_streak', value: 5 }),
        xp_reward: 300,
        coins_reward: 150
    },
    {
        name: 'Mentor 5 Estrellas',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png',
        criteria: JSON.stringify({ type: 'perfect_ratings', value: 3 }),
        xp_reward: 400,
        coins_reward: 200
    },
    {
        name: 'Calidad Premium',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png',
        criteria: JSON.stringify({ type: 'perfect_ratings', value: 8 }),
        xp_reward: 800,
        coins_reward: 400
    },
    {
        name: 'Tutor Perfecto',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
        criteria: JSON.stringify({ type: 'perfect_ratings', value: 20 }),
        xp_reward: 1800,
        coins_reward: 900
    },

    // 5. Rachas de Login Consecutivo
    {
        name: 'Constancia Inicial',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1048/1048953.png',
        criteria: JSON.stringify({ type: 'consecutive_logins', value: 3 }),
        xp_reward: 40,
        coins_reward: 20
    },
    {
        name: 'Hábito Semanal',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png',
        criteria: JSON.stringify({ type: 'consecutive_logins', value: 7 }),
        xp_reward: 100,
        coins_reward: 50
    },
    {
        name: 'Usuario de Hierro',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2784/2784445.png',
        criteria: JSON.stringify({ type: 'consecutive_logins', value: 15 }),
        xp_reward: 250,
        coins_reward: 125
    },
    {
        name: 'Fidelidad Absoluta',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3068/3068321.png',
        criteria: JSON.stringify({ type: 'consecutive_logins', value: 30 }),
        xp_reward: 600,
        coins_reward: 300
    },
    {
        name: 'Siempre en Línea',
        image_url: 'https://cdn-icons-png.flaticon.com/512/3565/3565418.png',
        criteria: JSON.stringify({ type: 'consecutive_logins', value: 90 }),
        xp_reward: 1500,
        coins_reward: 750
    },

    // 6. Nivelación y Experiencia (XP total)
    {
        name: 'Subiendo de Nivel',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1626/1626707.png',
        criteria: JSON.stringify({ type: 'xp_earned', value: 500 }),
        xp_reward: 100,
        coins_reward: 50
    },
    {
        name: 'Veterano Académico',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2922/2922579.png',
        criteria: JSON.stringify({ type: 'xp_earned', value: 1500 }),
        xp_reward: 300,
        coins_reward: 150
    },
    {
        name: 'Experto en la Materia',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2201/2201524.png',
        criteria: JSON.stringify({ type: 'xp_earned', value: 3000 }),
        xp_reward: 600,
        coins_reward: 300
    },
    {
        name: 'Sabio de la Mente',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2618/2618245.png',
        criteria: JSON.stringify({ type: 'xp_earned', value: 5000 }),
        xp_reward: 1000,
        coins_reward: 500
    },
    {
        name: 'Omnisciente de la ESPE',
        image_url: 'https://cdn-icons-png.flaticon.com/512/1429/1429810.png',
        criteria: JSON.stringify({ type: 'xp_earned', value: 10000 }),
        xp_reward: 2500,
        coins_reward: 1250
    },

    // 7. INSIGNIA ESPECIAL: Pilas! antes que todos
    {
        name: 'Pilas! antes que todos',
        image_url: 'https://cdn-icons-png.flaticon.com/512/2583/2583277.png',
        criteria: JSON.stringify({ type: 'early_adopter', value: 1 }),
        xp_reward: 300,
        coins_reward: 150
    }
];

async function runSeeder() {
    console.log("Iniciando siembra de insignias (31 logros)...");
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Limpiar asignaciones previas para evitar errores de integridad
        console.log("Limpiando asignaciones previas en User_Badges...");
        await connection.query("DELETE FROM User_Badges");

        // 2. Limpiar la tabla de insignias
        console.log("Limpiando tabla Badges...");
        await connection.query("DELETE FROM Badges");

        // Resetear auto-increment
        await connection.query("ALTER TABLE Badges AUTO_INCREMENT = 1");

        // 3. Insertar las nuevas insignias
        console.log("Insertando nuevos logros...");
        for (const b of BADGES) {
            await connection.query(
                "INSERT INTO Badges (name, image_url, criteria, xp_reward, coins_reward) VALUES (?, ?, ?, ?, ?)",
                [b.name, b.image_url, b.criteria, b.xp_reward, b.coins_reward]
            );
            console.log(`- Insignia agregada: "${b.name}"`);
        }

        await connection.commit();
        console.log("\n[EXITO] Se han sembrado los 31 logros con éxito en la base de datos.");
    } catch (e) {
        if (connection) {
            await connection.rollback();
        }
        console.error("[ERROR] La siembra falló y los cambios fueron revertidos:", e.message);
    } finally {
        if (connection) {
            connection.release();
        }
        process.exit(0);
    }
}

runSeeder();
