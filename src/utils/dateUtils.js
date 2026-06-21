/**
 * Obtiene la fecha y hora actual en la zona horaria de Ecuador (UTC-5)
 * y la formatea como una cadena compatible con DATETIME de MySQL (YYYY-MM-DD HH:mm:ss).
 * 
 * @param {Date} [date] - Objeto Date base (por defecto la fecha actual del sistema)
 * @returns {string} - Cadena de fecha y hora formateada en huso horario Ecuador (UTC-5)
 */
export function getEcuadorDateTime(date = new Date()) {
    // Ecuador está en UTC-5, no aplica cambio de hora de verano.
    const ecuadorTime = new Date(date.getTime() - (5 * 60 * 60 * 1000));
    
    const year = ecuadorTime.getUTCFullYear();
    const month = String(ecuadorTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ecuadorTime.getUTCDate()).padStart(2, '0');
    
    const hours = String(ecuadorTime.getUTCHours()).padStart(2, '0');
    const minutes = String(ecuadorTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(ecuadorTime.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Obtiene la fecha y hora de Ecuador sumando un offset en milisegundos.
 * 
 * @param {number} offsetMs - Desfase de tiempo en milisegundos a sumar
 * @param {Date} [date] - Objeto Date base
 * @returns {string} - Cadena de fecha y hora formateada (YYYY-MM-DD HH:mm:ss)
 */
export function getEcuadorDateTimeOffset(offsetMs, date = new Date()) {
    return getEcuadorDateTime(new Date(date.getTime() + offsetMs));
}

/**
 * Convierte un objeto Date o un string de fecha (añadiendo el offset de Ecuador si es un string local)
 * y lo formatea como una cadena legible en español utilizando el huso horario America/Guayaquil.
 * 
 * @param {Date|string} dateInput - Fecha a formatear
 * @returns {string} - Fecha formateada (ej. "domingo, 21 de junio de 2026, 12:31")
 */
export function parseAndFormatEcuadorDate(dateInput) {
    if (!dateInput) return 'No especificada';
    
    let dateObj;
    if (dateInput instanceof Date) {
        dateObj = dateInput;
    } else if (typeof dateInput === 'string') {
        // Si no tiene el indicador de zona horaria (Z o +HH:mm/-HH:mm),
        // asumimos que es hora local de Ecuador y le concatenamos el offset para que JS lo parse correctamente.
        if (!dateInput.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(dateInput)) {
            const normalized = dateInput.replace(' ', 'T');
            dateObj = new Date(`${normalized}-05:00`);
        } else {
            dateObj = new Date(dateInput);
        }
    } else {
        dateObj = new Date(dateInput);
    }

    // Validar si la fecha es inválida
    if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
    }

    return dateObj.toLocaleString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Guayaquil'
    });
}
