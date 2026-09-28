/* =========================
   EECA NOTÍCIAS - CLIENTE DE SEGURANÇA
   Envia logs para o backend SQL (auditoria paralela)
   NÃO BLOQUEIA a aplicação se o backend estiver offline.
========================= */

const SECURITY_API_URL = window.SECURITY_API_URL || 'http://localhost:3001';
let securityEnabled = true;

/* =========================
   ENVIO DE LOGS
========================= */
async function enviarLog(endpoint, dados) {
    if (!securityEnabled) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const resp = await fetch(`${SECURITY_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
            console.warn('[Security] Falha ao enviar log:', resp.status);
        }
    } catch (err) {
        // Falha silenciosa — SQL é auditoria paralela
        console.warn('[Security] Backend offline ou inacessível:', err.message);
    }
}

/* =========================
   VERIFICAÇÃO DE BLOQUEIO DE IP
========================= */
async function verificarIPBloqueado() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const resp = await fetch(`${SECURITY_API_URL}/api/check-ip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!resp.ok) return false;
        const dados = await resp.json();

        if (dados.is_blocked) {
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f0f1a;color:#ff6666;font-family:sans-serif;text-align:center;padding:20px;">
                    <div>
                        <h1 style="font-size:48px;">🚫</h1>
                        <h2>Acesso Bloqueado</h2>
                        <p>Seu IP foi bloqueado por motivos de segurança.</p>
                        <p style="font-size:14px;opacity:0.7;margin-top:20px;">
                            Motivo: ${dados.reason || 'Não especificado'}
                        </p>
                        <p style="font-size:12px;opacity:0.5;margin-top:10px;">
                            Entre em contato com o administrador.
                        </p>
                    </div>
                </div>
            `;
            securityEnabled = false;
            return true;
        }
        return false;
    } catch (err) {
        // Backend offline: não bloqueia o usuário
        return false;
    }
}

/* =========================
   API PÚBLICA
========================= */
function logLoginAttempt(email, success, reason = null) {
    return enviarLog('/api/log/login', {
        email: email,
        success: success,
        reason: reason
    });
}

function logAction(action, options = {}) {
    let user = null;
    try {
        user = firebase.auth().currentUser;
    } catch (e) { /* ignora */ }

    return enviarLog('/api/log/action', {
        uid: user?.uid || null,
        email: user?.email || null,
        action: action,
        target_id: options.targetId || null,
        target_type: options.targetType || null,
        details: options.details || null
    });
}

async function getSecurityStats() {
    try {
        const resp = await fetch(`${SECURITY_API_URL}/api/security/stats`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (err) { return null; }
}

async function getBruteForceSuspects() {
    try {
        const resp = await fetch(`${SECURITY_API_URL}/api/security/brute-force`);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (err) { return []; }
}

async function getActiveAlerts() {
    try {
        const resp = await fetch(`${SECURITY_API_URL}/api/security/alerts`);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (err) { return []; }
}

/* =========================
   EXPORTA PARA O SCRIPT.JS
========================= */
window.SecurityClient = {
    verificarIPBloqueado,
    logLoginAttempt,
    logAction,
    getSecurityStats,
    getBruteForceSuspects,
    getActiveAlerts,
    enviarLog
};

console.log('[Security] Cliente de segurança carregado. API:', SECURITY_API_URL);