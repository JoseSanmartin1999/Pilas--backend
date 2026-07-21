-- Esquema SQL de la base de datos: pilas_tutorias
-- Generado automáticamente para importación en Power Designer
-- Fecha: 2026-07-19T05:59:49.758Z

CREATE DATABASE IF NOT EXISTS `pilas_tutorias`;
USE `pilas_tutorias`;

SET FOREIGN_KEY_CHECKS = 0;

-- Estructura de la tabla `Badges`
CREATE TABLE `Badges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `criteria` varchar(255) DEFAULT NULL,
  `xp_reward` int DEFAULT '0',
  `coins_reward` int DEFAULT '0',
  PRIMARY KEY (`id`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=180001;

-- Estructura de la tabla `Careers`
CREATE TABLE `Careers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `malla_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=330001;

-- Estructura de la tabla `Categories`
CREATE TABLE `Categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`) ,
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Estructura de la tabla `Feedback`
CREATE TABLE `Feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mentorship_id` int DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  UNIQUE KEY `mentorship_id` (`mentorship_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`mentorship_id`) REFERENCES `Mentorships` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Estructura de la tabla `Mentor_Subjects`
CREATE TABLE `Mentor_Subjects` (
  `mentor_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `experience_years` int DEFAULT '0',
  PRIMARY KEY (`mentor_id`,`subject_id`) ,
  KEY `fk_2` (`subject_id`),
  CONSTRAINT `fk_ms_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ms_subject` FOREIGN KEY (`subject_id`) REFERENCES `Subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Estructura de la tabla `Mentorships`
CREATE TABLE `Mentorships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mentor_id` int DEFAULT NULL,
  `apprentice_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `status` enum('PENDIENTE','ACEPTADA','RECHAZADA','COMPLETADA','CANCELADA') DEFAULT 'PENDIENTE',
  `scheduled_date` datetime NOT NULL,
  `objectives` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `subject_id` int DEFAULT NULL,
  `apprentice_notified` tinyint(1) DEFAULT '0',
  `modality` enum('Presencial','Online') NOT NULL DEFAULT 'Presencial',
  `meeting_place` varchar(255) DEFAULT NULL,
  `platform` enum('Meet','Zoom','Teams') DEFAULT NULL,
  `meeting_link` text DEFAULT NULL,
  `zoom_code` varchar(100) DEFAULT NULL,
  `zoom_password` varchar(100) DEFAULT NULL,
  `reprogramming_count` int DEFAULT '0',
  `reprogramming_reason` text DEFAULT NULL,
  `last_initiator_role` enum('MENTOR','APRENDIZ') DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `estimated_duration` varchar(50) DEFAULT '1 hora',
  `closed_at` timestamp NULL DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `rating_comment` text DEFAULT NULL,
  `is_rated` tinyint(1) DEFAULT '0',
  `reminder_sent` tinyint(1) DEFAULT '0',
  `reminder_2h_sent` tinyint(1) DEFAULT '0',
  `reminder_10m_sent` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`) ,
  KEY `fk_1` (`mentor_id`),
  KEY `fk_2` (`apprentice_id`),
  KEY `fk_3` (`category_id`),
  KEY `fk_mentorship_subject` (`subject_id`),
  CONSTRAINT `fk_m_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `Users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_m_apprentice` FOREIGN KEY (`apprentice_id`) REFERENCES `Users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_m_category` FOREIGN KEY (`category_id`) REFERENCES `Categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_m_subject` FOREIGN KEY (`subject_id`) REFERENCES `Subjects` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mentorship_subject` FOREIGN KEY (`subject_id`) REFERENCES `Subjects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=1800001;

-- Estructura de la tabla `Profiles`
CREATE TABLE `Profiles` (
  `user_id` int NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `profile_photo_url` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `institution` varchar(150) DEFAULT 'ESPE',
  `career` varchar(100) DEFAULT NULL,
  `student_id` varchar(20) DEFAULT NULL,
  `current_semester` int DEFAULT NULL,
  `xp` int NOT NULL DEFAULT '0',
  `level` int NOT NULL DEFAULT '1',
  `espe_coins` int NOT NULL DEFAULT '0',
  `login_streak` int DEFAULT '0',
  `last_login_date` date DEFAULT NULL,
  `survey_completed` tinyint(1) DEFAULT '0',
  `first_login_rewarded` tinyint(1) DEFAULT '0',
  `career_id` int DEFAULT NULL,
  PRIMARY KEY (`user_id`) ,
  UNIQUE KEY `idx_unique_student_id` (`student_id`),
  KEY `fk_profiles_career` (`career_id`),
  CONSTRAINT `fk_p_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_profiles_career` FOREIGN KEY (`career_id`) REFERENCES `Careers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Estructura de la tabla `Repository_Materials`
CREATE TABLE `Repository_Materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mentorship_id` int NOT NULL,
  `uploader_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint NOT NULL DEFAULT '0',
  `file_type` varchar(50) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `cloudinary_public_id` varchar(300) DEFAULT NULL,
  `cloudinary_resource_type` varchar(20) DEFAULT 'image',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `idx_mentorship` (`mentorship_id`),
  KEY `idx_uploader` (`uploader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=570001;

-- Estructura de la tabla `Rewards`
CREATE TABLE `Rewards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `cost` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_special` tinyint(1) DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=120001;

-- Estructura de la tabla `Roles`
CREATE TABLE `Roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) ,
  UNIQUE KEY `idx_unique_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;

-- Estructura de la tabla `Subjects`
CREATE TABLE `Subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `semester` int NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `career_id` int DEFAULT NULL,
  PRIMARY KEY (`id`) ,
  KEY `fk_subject_career` (`career_id`),
  CONSTRAINT `fk_subject_career` FOREIGN KEY (`career_id`) REFERENCES `Careers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=420001;

-- Estructura de la tabla `Support_Tickets`
CREATE TABLE `Support_Tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` varchar(20) DEFAULT 'OPEN',
  `reply` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `fk_1` (`user_id`),
  CONSTRAINT `fk_st_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=120001;

-- Estructura de la tabla `Tutor_Applications`
CREATE TABLE `Tutor_Applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `motivation` text NOT NULL,
  `selected_subjects` json NOT NULL,
  `status` varchar(20) DEFAULT 'PENDING',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `academic_record_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`) ,
  KEY `fk_1` (`user_id`),
  CONSTRAINT `fk_ta_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=210001;

-- Estructura de la tabla `User_Badges`
CREATE TABLE `User_Badges` (
  `user_id` int NOT NULL,
  `badge_id` int NOT NULL,
  `earned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `is_featured` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`user_id`,`badge_id`) ,
  KEY `fk_2` (`badge_id`),
  CONSTRAINT `fk_ub_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ub_badge` FOREIGN KEY (`badge_id`) REFERENCES `Badges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Estructura de la tabla `User_Rewards`
CREATE TABLE `User_Rewards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `reward_id` int NOT NULL,
  `selected_option` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `claimed_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `fk_1` (`user_id`),
  KEY `fk_2` (`reward_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`reward_id`) REFERENCES `Rewards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=270001;

-- Estructura de la tabla `User_Roles`
CREATE TABLE `User_Roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`) ,
  KEY `fk_ur_role` (`role_id`),
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `Roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Estructura de la tabla `Users`
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` enum('ACTIVO','BLOQUEADO','PENDIENTE') NOT NULL DEFAULT 'ACTIVO',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `verification_code` varchar(10) DEFAULT NULL,
  `verification_code_expires_at` timestamp NULL DEFAULT NULL,
  `reset_code` varchar(10) DEFAULT NULL,
  `reset_code_expires_at` timestamp NULL DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_photo_url` varchar(500) DEFAULT NULL,
  `xp` int DEFAULT '0',
  `level` int DEFAULT '1',
  `espe_coins` int DEFAULT '0',
  PRIMARY KEY (`id`) ,
  UNIQUE KEY `idx_unique_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=1590002;

SET FOREIGN_KEY_CHECKS = 1;
