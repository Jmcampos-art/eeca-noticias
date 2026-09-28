/* =========================
   EECA NOTÍCIAS - API DE SEGURANÇA
   Backend leve apenas para auditoria e logs
========================= */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

/* =========================
   MIDDLEWARES DE SEGURANÇA
========================= */
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '100kb' }));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

const logLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Muitos logs enviados.' }
});

/* =========================
   CONEXÃO COM O BANCO
========================= */
let pool;

async function initDatabase() {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'security_api_user',
        password: process.env.DB_PASSWORD || 'SenhaSegura_API_2027!',
        database: process.env.DB_NAME || 'eeca_security',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    });

    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log('✅ Conectado ao MySQL (eeca_security)');
    } catch (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err.message);
        process.exit(1);
    }
}

/* =========================
   HELPERS
========================= */
function getClientIp(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket.remoteAddress
        || 'desconhecido';
}

function getUserAgent(req) {
    return (req.headers['user-agent'] || '').substring(0, 500);
}

/* =========================
   ROTAS
========================= */

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/check-ip', logLimiter, async (req, res) => {
    try {
        const ip = getClientIp(req);
        const [rows] = await pool.query(
            'SELECT COUNT(*) > 0 AS is_blocked, reason, blocked_until FROM blocked_ips WHERE ip_address = ? AND (blocked_until IS NULL OR blocked_until > NOW())',
            [ip]
        );
        res.json({
            ip,
            is_blocked: rows[0]?.is_blocked === 1,
            reason: rows[0]?.reason || null,
            blocked_until: rows[0]?.blocked_until || null
        });
    } catch (err) {
        console.error('Erro em /check-ip:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.post('/api/log/login', logLimiter, async (req, res) => {
    try {
        const { email, success, reason } = req.body;
        if (!email || typeof success !== 'boolean') {
            return res.status(400).json({ error: 'Dados inválidos' });
        }

        const ip = getClientIp(req);
        const ua = getUserAgent(req);

        await pool.query(
            'CALL sp_log_login_attempt(?, ?, ?, ?, ?)',
            [email.substring(0, 150), ip, ua, success, (reason || '').substring(0, 100)]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Erro em /log/login:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.post('/api/log/action', logLimiter, async (req, res) => {
    try {
        const { uid, email, action, target_id, target_type, details } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Ação obrigatória' });
        }

        const ip = getClientIp(req);
        const ua = getUserAgent(req);
        const detailsJson = details ? JSON.stringify(details) : null;

        await pool.query(
            'CALL sp_log_admin_action(?, ?, ?, ?, ?, ?, ?, ?)',
            [
                uid || null,
                email || null,
                action,
                target_id || null,
                target_type || null,
                detailsJson,
                ip,
                ua
            ]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Erro em /log/action:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.get('/api/security/stats', async (req, res) => {
    try {
        const [rows] = await pool.query('CALL sp_security_stats()');
        res.json(rows[0]?.[0] || {});
    } catch (err) {
        console.error('Erro em /security/stats:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.get('/api/security/brute-force', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vw_brute_force_suspects LIMIT 50');
        res.json(rows);
    } catch (err) {
        console.error('Erro em /security/brute-force:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.get('/api/security/alerts', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vw_active_alerts LIMIT 50');
        res.json(rows);
    } catch (err) {
        console.error('Erro em /security/alerts:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/* =========================
   BLOQUEIO / DESBLOQUEIO DE IP
========================= */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'token_secreto_admin';

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
}

app.post('/api/security/block-ip', requireAdmin, async (req, res) => {
    try {
        const { ip, reason, duration_hours, blocked_by } = req.body;
        if (!ip || !reason) {
            return res.status(400).json({ error: 'IP e motivo obrigatórios' });
        }
        await pool.query(
            'CALL sp_block_ip(?, ?, ?, ?)',
            [ip, reason, duration_hours || null, blocked_by || 'admin']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro em /block-ip:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.post('/api/security/unblock-ip', requireAdmin, async (req, res) => {
    try {
        const { ip } = req.body;
        await pool.query('DELETE FROM blocked_ips WHERE ip_address = ?', [ip]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro em /unblock-ip:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/* =========================
   INICIALIZAÇÃO
========================= */
(async () => {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`🔐 API de Segurança rodando em http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/health`);
    });
})();