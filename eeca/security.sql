-- =====================================================================
-- 21. TABELAS DE SEGURANÇA E AUDITORIA (para o backend Node.js)
-- Estas tabelas são usadas APENAS pela API de segurança
-- =====================================================================

-- Log de tentativas de login (brute-force detection)
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(500) NULL,
    `success` BOOLEAN NOT NULL,
    `failure_reason` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_login_email` (`email`),
    INDEX `idx_login_ip` (`ip_address`),
    INDEX `idx_login_date` (`created_at`),
    INDEX `idx_login_success` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- IPs bloqueados
CREATE TABLE IF NOT EXISTS `blocked_ips` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL UNIQUE,
    `reason` VARCHAR(255) NOT NULL,
    `blocked_by` VARCHAR(150) NULL,
    `blocked_until` TIMESTAMP NULL DEFAULT NULL COMMENT 'NULL = permanente',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_blocked_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessões ativas
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `firebase_uid` VARCHAR(128) NOT NULL,
    `session_token` VARCHAR(255) NOT NULL UNIQUE,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    `revoked` BOOLEAN DEFAULT FALSE,
    INDEX `idx_session_uid` (`firebase_uid`),
    INDEX `idx_session_token` (`session_token`),
    INDEX `idx_session_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rate limiting
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `hit_count` INT DEFAULT 1,
    `window_start` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `window_end` TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY `uk_rate_ip_action` (`ip_address`, `action`, `window_start`),
    INDEX `idx_rate_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alertas de segurança
CREATE TABLE IF NOT EXISTS `security_alerts` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    `type` VARCHAR(100) NOT NULL COMMENT 'ex: BRUTE_FORCE, RATE_LIMIT, IP_BLOCKED',
    `description` TEXT NOT NULL,
    `firebase_uid` VARCHAR(128) NULL,
    `ip_address` VARCHAR(45) NULL,
    `metadata` JSON NULL,
    `resolved` BOOLEAN DEFAULT FALSE,
    `resolved_by` VARCHAR(150) NULL,
    `resolved_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_alert_severity` (`severity`),
    INDEX `idx_alert_resolved` (`resolved`),
    INDEX `idx_alert_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 22. VIEWS DE SEGURANÇA
-- =====================================================================

-- Suspeitos de brute-force (5+ falhas em 24h)
CREATE OR REPLACE VIEW `vw_brute_force_suspects` AS
SELECT 
    ip_address,
    COUNT(*) AS failed_attempts,
    MAX(created_at) AS last_attempt,
    GROUP_CONCAT(DISTINCT email SEPARATOR ', ') AS targeted_emails
FROM login_attempts
WHERE success = FALSE 
  AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY ip_address
HAVING failed_attempts >= 5
ORDER BY failed_attempts DESC;

-- Ações administrativas recentes
CREATE OR REPLACE VIEW `vw_recent_admin_actions` AS
SELECT 
    al.id,
    al.changed_by AS user_email,
    al.action,
    al.table_name AS target_type,
    al.record_id AS target_id,
    al.changed_at AS created_at
FROM audit_log al
WHERE al.changed_at > DATE_SUB(NOW(), INTERVAL 48 HOUR)
ORDER BY al.changed_at DESC;

-- Alertas ativos (não resolvidos, alta severidade)
CREATE OR REPLACE VIEW `vw_active_alerts` AS
SELECT * FROM security_alerts
WHERE resolved = FALSE
  AND severity IN ('high', 'critical')
ORDER BY created_at DESC;

-- =====================================================================
-- 23. PROCEDURES DE SEGURANÇA
-- =====================================================================
DELIMITER $$

-- Registrar tentativa de login + gerar alerta se necessário
CREATE PROCEDURE `sp_log_login_attempt` (
    IN p_email VARCHAR(150),
    IN p_ip VARCHAR(45),
    IN p_user_agent VARCHAR(500),
    IN p_success BOOLEAN,
    IN p_reason VARCHAR(100)
)
BEGIN
    DECLARE v_failed_count INT DEFAULT 0;
    
    INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
    VALUES (p_email, p_ip, p_user_agent, p_success, p_reason);
    
    IF p_success = FALSE THEN
        SELECT COUNT(*) INTO v_failed_count
        FROM login_attempts
        WHERE ip_address = p_ip 
          AND success = FALSE
          AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE);
        
        IF v_failed_count >= 5 THEN
            INSERT INTO security_alerts (severity, type, description, ip_address, metadata)
            VALUES (
                'high',
                'BRUTE_FORCE',
                CONCAT('Múltiplas tentativas de login falhas do IP ', p_ip),
                p_ip,
                JSON_OBJECT('failed_count', v_failed_count, 'email', p_email)
            );
        END IF;
    END IF;
END$$

-- Registrar ação administrativa
CREATE PROCEDURE `sp_log_admin_action` (
    IN p_uid VARCHAR(128),
    IN p_email VARCHAR(150),
    IN p_action VARCHAR(50),
    IN p_target_id VARCHAR(128),
    IN p_target_type VARCHAR(50),
    IN p_details JSON,
    IN p_ip VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    INSERT INTO audit_log (
        table_name, action, record_id, old_value, new_value, changed_by
    ) VALUES (
        p_target_type, 
        'INSERT',
        COALESCE(CAST(p_target_id AS UNSIGNED), 0),
        NULL,
        JSON_UNQUOTE(JSON_EXTRACT(p_details, '$')),
        p_email
    );
    
    INSERT INTO security_alerts (severity, type, description, firebase_uid, ip_address, metadata)
    VALUES (
        'low',
        p_action,
        CONCAT('Ação administrativa: ', p_action),
        p_uid,
        p_ip,
        JSON_OBJECT('target_id', p_target_id, 'target_type', p_target_type, 'details', p_details)
    );
END$$

-- Verificar se IP está bloqueado
CREATE PROCEDURE `sp_is_ip_blocked` (IN p_ip VARCHAR(45))
BEGIN
    SELECT 
        COUNT(*) > 0 AS is_blocked,
        MAX(reason) AS reason,
        MAX(blocked_until) AS blocked_until
    FROM blocked_ips
    WHERE ip_address = p_ip
      AND (blocked_until IS NULL OR blocked_until > NOW());
END$$

-- Bloquear IP
CREATE PROCEDURE `sp_block_ip` (
    IN p_ip VARCHAR(45),
    IN p_reason VARCHAR(255),
    IN p_duration_hours INT,
    IN p_blocked_by VARCHAR(150)
)
BEGIN
    DECLARE v_until TIMESTAMP DEFAULT NULL;
    IF p_duration_hours IS NOT NULL AND p_duration_hours > 0 THEN
        SET v_until = DATE_ADD(NOW(), INTERVAL p_duration_hours HOUR);
    END IF;
    
    INSERT INTO blocked_ips (ip_address, reason, blocked_by, blocked_until)
    VALUES (p_ip, p_reason, p_blocked_by, v_until)
    ON DUPLICATE KEY UPDATE
        reason = p_reason,
        blocked_by = p_blocked_by,
        blocked_until = v_until;
    
    INSERT INTO security_alerts (severity, type, description, ip_address, metadata)
    VALUES (
        'high',
        'IP_BLOCKED',
        CONCAT('IP bloqueado: ', p_ip, ' - Motivo: ', p_reason),
        p_ip,
        JSON_OBJECT('duration_hours', p_duration_hours, 'blocked_by', p_blocked_by)
    );
END$$

-- Limpar logs antigos
CREATE PROCEDURE `sp_cleanup_old_logs` (IN p_days INT)
BEGIN
    DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL p_days DAY);
    DELETE FROM audit_log WHERE changed_at < DATE_SUB(NOW(), INTERVAL p_days DAY);
    DELETE FROM sessions WHERE expires_at < NOW() OR revoked = TRUE;
    DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 DAY);
    DELETE FROM security_alerts WHERE resolved = TRUE AND resolved_at < DATE_SUB(NOW(), INTERVAL p_days DAY);
END$$

-- Estatísticas de segurança
CREATE PROCEDURE `sp_security_stats` ()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM login_attempts WHERE success = FALSE AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS failed_logins_24h,
        (SELECT COUNT(*) FROM login_attempts WHERE success = TRUE AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS successful_logins_24h,
        (SELECT COUNT(*) FROM blocked_ips WHERE blocked_until IS NULL OR blocked_until > NOW()) AS active_blocked_ips,
        (SELECT COUNT(*) FROM security_alerts WHERE resolved = FALSE AND severity IN ('high', 'critical')) AS active_alerts,
        (SELECT COUNT(*) FROM sessions WHERE revoked = FALSE AND expires_at > NOW()) AS active_sessions,
        (SELECT COUNT(*) FROM audit_log WHERE changed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS actions_24h;
END$$

DELIMITER ;

-- =====================================================================
-- 24. USUÁRIO DO BACKEND (com privilégios mínimos)
-- =====================================================================
CREATE USER IF NOT EXISTS 'security_api_user'@'localhost' IDENTIFIED BY 'SenhaSegura_API_2027!';
GRANT SELECT, INSERT, UPDATE ON eeca_news.* TO 'security_api_user'@'localhost';
GRANT EXECUTE ON PROCEDURE eeca_news.sp_log_login_attempt TO 'security_api_user'@'localhost';
GRANT EXECUTE ON PROCEDURE eeca_news.sp_log_admin_action TO 'security_api_user'@'localhost';
GRANT EXECUTE ON PROCEDURE eeca_news.sp_is_ip_blocked TO 'security_api_user'@'localhost';
GRANT EXECUTE ON PROCEDURE eeca_news.sp_block_ip TO 'security_api_user'@'localhost';
GRANT EXECUTE ON PROCEDURE eeca_news.sp_security_stats TO 'security_api_user'@'localhost';

FLUSH PRIVILEGES;

SELECT '✅ Tabelas de segurança adicionadas com sucesso!' AS status;