/* =========================
   CONFIGURAÇÃO DO FIREBASE
========================= */
const firebaseConfig = {
    apiKey: "AIzaSyAby13tCc63SqtVwk5LgEjSQNe6cCCcIK",
    authDomain: "eeca-noticia-97e28.firebaseapp.com",
    databaseURL: "https://eeca-noticia-97e28-default-rtdb.firebaseio.com",
    projectId: "eeca-noticia-97e28",
    storageBucket: "eeca-noticia-97e28.firebasestorage.app",
    messagingSenderId: "623154593813",
    appId: "1:623154593813:web:199907b1b9f38f8bc28e1c"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* =========================
   CONFIGURAÇÕES GLOBAIS
========================= */
let usuarioLogado = false;
let tipoUsuario = null;
const NOTICIAS_REF = 'noticias';
const MENSAGENS_REF = 'mensagens';
const RECLAMACOES_REF = 'reclamacoes';
const RECLAMACOES_PENDENTES_REF = 'reclamacoes_pendentes';
const CONFIG_REF = 'configuracoes';
const COMENTARIOS_NOTICIAS_REF = 'comentarios_noticias';
const CONFIG_NOTICIAS_REF = 'configuracoes_noticias';
const RADIO_MUSICAS_REF = 'radio_musicas';
const RADIO_PROGRAMACAO_REF = 'radio_programacao';
const SECURITY_API_URL = window.SECURITY_API_URL || 'http://localhost:3001';

let temaAtual = localStorage.getItem('tema') || 'claro';
let todasNoticias = [];
let noticiaEditandoId = null;
let timeoutBusca = null;
let ultimaNotificacao = 0;

// Variáveis da Rádio
let dataCalendarioAtual = new Date();
let diaSelecionadoCalendario = null;

// Controle de comentários/reclamações
let comentariosAtivos = true;
let reclamacoesAtivas = true;

/* =========================
   RÁDIO - CLASSIFICAÇÃO AUTOMÁTICA DE MÚSICAS
========================= */
const PALAVRAS_SUAVES = [
    'lofi', 'acústico', 'acustico', 'instrumental', 'piano', 'violão', 'violao',
    'mpb', 'bossa nova', 'jazz', 'clássica', 'classica', 'chill', 'relaxante',
    'calmo', 'tranquilo', 'suave', 'melodia', 'orquestra', 'acústica'
];

const PALAVRAS_NAO_RECOMENDADAS = [
    'funk', 'proibidão', 'proibidão', 'mc ', 'sertanejo universitário',
    'pisadinha', 'heavy metal', 'punk', 'hardcore', 'explícito', 'explicito',
    'putaria', 'bebida', 'droga', 'maconha', 'cocaína', 'arma', 'matar',
    'sexo', 'pornô', 'porno', 'prostituição', 'violência', 'sangue'
];

function classificarMusicaAutomaticamente(musica) {
    const titulo = (musica.musica || '').toLowerCase();
    const solicitante = (musica.solicitante || '').toLowerCase();
    const textoCompleto = titulo + ' ' + solicitante;

    const temSuave = PALAVRAS_SUAVES.some(p => textoCompleto.includes(p));
    const temNaoRecomendada = PALAVRAS_NAO_RECOMENDADAS.some(p => textoCompleto.includes(p));

    if (temNaoRecomendada) {
        return { 
            classificacao: 'nao_recomendada', 
            alerta: true,
            motivo: 'Palavra-chave não recomendada detectada'
        };
    } else if (temSuave) {
        return { 
            classificacao: 'suave', 
            alerta: false,
            motivo: 'Música identificada como suave'
        };
    } else {
        return { 
            classificacao: 'neutra', 
            alerta: false,
            motivo: 'Sem classificação específica'
        };
    }
}

/* =========================
   LISTA DE PALAVRÕES
========================= */
const PALAVROES = {
    'bicha': ['bicha', 'bichaa', 'bichha', 'bich@', 'b1ch4', 'b1cha', 'bich4', 'bich', 'bixa', 'bixaa', 'bixxa', 'bix@', 'b1x4', 'b1xa', 'bix4', 'bix', 'bichinha', 'bichona', 'bichuda', 'bichão', 'bicharada'],
    'buceta': ['buceta', 'bucetaa', 'bucceta', 'bucet@', 'buc3t4', 'buc3ta', 'bucet4', 'bucet', 'boceta', 'bocetaa', 'bocceta', 'bocet@', 'b0c3t4', 'b0c3ta', 'bocet4', 'b0c3ta', 'bucetinha', 'bucetona', 'bucetuda', 'bucetão', 'bucetarada', 'bucetao'],
    'bosta': ['bosta', 'bostaa', 'bossta', 'bost@', 'b0st4', 'b0sta', 'bost4', 'bost', 'bostinha', 'bostona', 'bostuda', 'bostão', 'bostarada', 'bosteira', 'bostal', 'bostenta', 'bostento', 'bostei', 'bostou', 'bostando'],
    'cagar': ['cagar', 'cagarr', 'cagaar', 'cag@r', 'c4g4r', 'c4gar', 'cag4r', 'cag', 'cagão', 'cagona', 'cagada', 'cagado', 'cagando', 'cagou', 'caguei', 'cagaste', 'cagamos'],
    'caralho': ['caralho', 'caralhoo', 'karalho', 'karalhoo', 'caralio', 'karalio', 'caralhu', 'karalhu', 'krl', 'krlh', 'karal', 'caral', 'carallho', 'karallho', 'caralh0', 'karalh0', 'caralh@', 'karalh@', 'c4r4lh0', 'k4r4lh0', 'car4lho', 'caralhao', 'caralhaço', 'caralhuda', 'caralhudo', 'caralhão', 'caralhona', 'caralheira', 'caralhada', 'krlho', 'krlhao', 'krlhão', 'krlona', 'krlhona'],
    'cu': ['cu', 'cuu', 'cú', 'cù', 'cû', 'cü', 'c4', 'c0', 'cuzinho', 'cuzona', 'cuzuda', 'cuzão', 'cuzarada', 'cuzil', 'cuzim'],
    'foder': ['foder', 'fode', 'fod3r', 'f0d3r', 'f0der', 'foderr', 'fodeer', 'fod', 'foda', 'fodaa', 'fodda', 'fod@', 'f0d4', 'f0da', 'fod4', 'fodase', 'foda-se'],
    'merda': ['merda', 'merdaa', 'merdda', 'merd@', 'm3rd4', 'm3rda', 'merd4', 'merd', 'merdão', 'merdona', 'merdinha', 'merduda', 'merdoso', 'merdosa', 'merdeira', 'merdalhão', 'merdagem'],
    'porra': ['porra', 'porraa', 'porrra', 'porr@', 'p0rr4', 'p0r4', 'porr4', 'pora', 'porr', 'porrinha', 'porrona', 'porruda', 'porrão', 'porrada', 'porraria'],
    'piroca': ['piroca', 'pirocaa', 'pirocca', 'piroc@', 'p1r0c4', 'p1r0ca', 'piroc4', 'piroc', 'piroquinha', 'pirocona', 'pirocuda', 'pirocão', 'pirocarada', 'pirocar', 'pirocada'],
    'puta': ['puta', 'putaa', 'putta', 'put@', 'p0t4', 'p0ta', 'put4', 'put', 'putinha', 'putona', 'putuda', 'putão', 'putarada', 'putaria'],
    'viado': ['viado', 'viadoo', 'viaado', 'viad@', 'vi4d0', 'vi4do', 'viad0', 'viad', 'viadinho', 'viadona', 'viaduda', 'viadão', 'viadarada', 'viadagem'],
    'filho da puta': ['filho da puta', 'filhodaputa', 'fdp', 'filho da put4', 'filhodaput4', 'filho da p0ta', 'filhodap0ta'],
    'pau': ['pau', 'pauu', 'paau', 'p@u', 'p4u', 'p0u', 'pauduro', 'paumole', 'paozinho', 'paulada', 'pauzão', 'pauzudo', 'paodeleite', 'paoduro'],
    'pinto': ['pinto', 'pintoo', 'pintto', 'pint@', 'p1nt0', 'p1nto', 'pint0', 'pint', 'pintinho', 'pinton', 'pintuda', 'pintão', 'pintarada'],
    'rola': ['rola', 'rolaa', 'rolla', 'rol@', 'r0l4', 'r0la', 'rol4', 'rol', 'rolinha', 'rolona', 'roluda', 'rolão', 'rolarada'],
    'xota': ['xota', 'xotaa', 'xotta', 'xot@', 'x0t4', 'x0ta', 'xot4', 'xot', 'xotinha', 'xotona', 'xotuda', 'xotão', 'xotarada'],
    'pepeca': ['pepeca', 'pepecaa', 'ppepeca', 'pepec@', 'p3p3c4', 'p3p3ca', 'pepec4', 'pepec'],
    'boquete': ['boquete', 'boqu3t3', 'b0qu3t3', 'b0quete', 'boquetinho', 'boquetona', 'boquetuda', 'boquetão', 'boquetarada'],
    'trepar': ['trepar', 'tr3p4r', 'tr3par', 'tr0par', 'trepada', 'trepado', 'trepando', 'trepou', 'trepei'],
    'mijar': ['mijar', 'mijarr', 'mijaar', 'mij@r', 'm1j4r', 'm1jar', 'mij4r', 'mij', 'mijada', 'mijado', 'mijando', 'mijou', 'mijei'],
    'xixi': ['xixi', 'xixii', 'xxixi', 'xix@', 'x1x1', 'xix1', 'xix'],
    'punheta': ['punheta', 'punhetaa', 'punhetta', 'punhet@', 'punh3t4', 'punh3ta', 'punhet4', 'punhet', 'punhetinha', 'punhetona', 'punhetuda', 'punhetão', 'punhetarada'],
    'siririca': ['siririca', 'siriricaa', 'sirirrica', 'siriric@', 's1r1r1c4', 's1r1r1ca', 'siriric4', 'siriric'],
    'gosma': ['gosma', 'gosmaa', 'gosmma', 'gosm@', 'g0sm4', 'g0sma', 'gosm4', 'gosm'],
    'esporra': ['esporra', 'esporraa', 'esporrra', 'esporr@', '3sp0rr4', '3sp0r4', 'esporr4', 'esporr'],
    'transar': ['transar', 'transarr', 'transaar', 'trans@r', 'tr4ns4r', 'tr4nsar', 'trans4r', 'trans'],
    'corno': ['corno', 'cornoo', 'corrno', 'corn@', 'c0rn0', 'c0rno', 'corn0', 'corn', 'corninho', 'cornona', 'cornuda', 'cornão', 'cornarada'],
    'chifrudo': ['chifrudo'],
    'safado': ['safado', 'safadoo', 'saffado', 'safad@', 's4f4d0', 's4fado', 'safad0', 'safad'],
    'putaria': ['putaria', 'putariaa', 'puttaria', 'putari@', 'put4ri4', 'put4ria', 'putari4', 'putari'],
    'sacanagem': ['sacanagem'],
    'vagabundo': ['vagabundo'],
    'malandro': ['malandro']
};

let todasPalavrasOfensivas = [];
Object.values(PALAVROES).forEach(arr => {
    todasPalavrasOfensivas = todasPalavrasOfensivas.concat(arr);
});

const mapaCensura = {};
Object.keys(PALAVROES).forEach(palavrao => {
    PALAVROES[palavrao].forEach(variacao => {
        mapaCensura[variacao.toLowerCase()] = '****';
    });
});

function censurarTexto(texto) {
    if (!texto) return texto;
    const palavras = texto.split(/\s+/);
    const palavrasCensuradas = palavras.map(palavra => {
        const palavraLimpa = palavra.replace(/[^a-zA-Z0-9áéíóúãõâêôç@#]/g, '').toLowerCase();
        if (mapaCensura[palavraLimpa]) return '****';
        return palavra;
    });
    return palavrasCensuradas.join(' ');
}

function contemPalavrao(texto) {
    if (!texto) return false;
    const textoLower = texto.toLowerCase();
    for (const palavra of todasPalavrasOfensivas) {
        if (textoLower.includes(palavra.toLowerCase())) return true;
    }
    return false;
}

/* =========================
   CONTROLE DE COMENTÁRIOS / RECLAMAÇÕES
========================= */
function alternarComentarios(ativar) {
    comentariosAtivos = ativar;
    
    const areaComentarios = document.getElementById('areaComentarios');
    const form = document.getElementById('formMensagem');
    const aviso = document.getElementById('avisoComentariosDesativados');
    const status = document.getElementById('statusComentarios');
    
    if (ativar) {
        if (form) form.style.display = 'flex';
        if (aviso) aviso.style.display = 'none';
        if (areaComentarios) areaComentarios.classList.remove('desativado');
        if (status) {
            status.textContent = 'Ativados';
            status.className = 'status-comentarios ativo';
        }
    } else {
        if (form) form.style.display = 'none';
        if (aviso) aviso.style.display = 'flex';
        if (areaComentarios) areaComentarios.classList.add('desativado');
        if (status) {
            status.textContent = 'Desativados';
            status.className = 'status-comentarios inativo';
        }
    }
    
    database.ref(CONFIG_REF).update({ comentariosAtivos: ativar })
        .catch(err => console.error('Erro ao salvar config:', err));
}

function alternarReclamacoes(ativar) {
    reclamacoesAtivas = ativar;
    
    const btnContainer = document.getElementById('btnReclamacaoContainer');
    const aviso = document.getElementById('avisoReclamacoesDesativadas');
    const status = document.getElementById('statusReclamacoes');
    const formContainer = document.getElementById('formReclamacaoContainer');
    
    if (ativar) {
        if (btnContainer) btnContainer.style.display = 'block';
        if (aviso) aviso.style.display = 'none';
        if (status) {
            status.textContent = 'Ativadas';
            status.className = 'status-comentarios ativo';
        }
    } else {
        if (btnContainer) btnContainer.style.display = 'none';
        if (aviso) aviso.style.display = 'flex';
        if (formContainer) formContainer.style.display = 'none';
        if (status) {
            status.textContent = 'Desativadas';
            status.className = 'status-comentarios inativo';
        }
    }
    
    database.ref(CONFIG_REF).update({ reclamacoesAtivas: ativar })
        .catch(err => console.error('Erro ao salvar config:', err));
}

function carregarConfiguracoesComentarios() {
    database.ref(CONFIG_REF).on('value', (snapshot) => {
        const config = snapshot.val() || {};
        comentariosAtivos = config.comentariosAtivos !== false;
        reclamacoesAtivas = config.reclamacoesAtivas !== false;
        
        const toggleCom = document.getElementById('toggleComentarios');
        const toggleRec = document.getElementById('toggleReclamacoes');
        
        if (toggleCom) {
            toggleCom.checked = comentariosAtivos;
            alternarComentarios(comentariosAtivos);
        }
        if (toggleRec) {
            toggleRec.checked = reclamacoesAtivas;
            alternarReclamacoes(reclamacoesAtivas);
        }
    });
}

function atualizarVisibilidadeToggles() {
    const containerCom = document.getElementById('toggleComentariosContainer');
    const containerRec = document.getElementById('toggleReclamacoesContainer');
    const exibir = usuarioLogado ? 'flex' : 'none';
    if (containerCom) containerCom.style.display = exibir;
    if (containerRec) containerRec.style.display = exibir;
}

/* =========================
   COMENTÁRIOS POR NOTÍCIA
========================= */
function carregarComentariosNoticia(id) {
    database.ref(CONFIG_NOTICIAS_REF + '/' + id).on('value', (configSnap) => {
        const config = configSnap.val() || {};
        const ativo = config.comentariosAtivos !== false;
        aplicarEstadoComentariosNoticia(id, ativo);
    });

    const container = document.getElementById(`listaComentarios-${id}`);
    if (!container) return;

    database.ref(COMENTARIOS_NOTICIAS_REF + '/' + id).on('value', (snapshot) => {
        const dados = snapshot.val();
        container.innerHTML = '';

        if (!dados) {
            container.innerHTML = '<div class="sem-comentarios">💬 Nenhum comentário ainda. Seja o primeiro!</div>';
            return;
        }

        const lista = Object.keys(dados).map(key => ({ id: key, ...dados[key] }))
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        lista.forEach(c => {
            const div = document.createElement('div');
            div.className = 'comentario-item';
            const nome = c.nome ? escaparHTML(c.nome) : 'Anônimo';

            let html = `
                <div class="comentario-nome">
                    <span>💬 ${nome}</span>
                    <span class="data">${formatarDataSimples(c.data)}</span>
                </div>
                <div class="comentario-texto">${escaparHTML(c.texto).replace(/\n/g, '<br>')}</div>
            `;

            if (usuarioLogado) {
                html += `<button class="btn-excluir-comentario" onclick="excluirComentarioNoticia('${id}','${c.id}')">🗑️ Excluir</button>`;
            }
            div.innerHTML = html;
            container.appendChild(div);
        });
    });
}

function aplicarEstadoComentariosNoticia(id, ativo) {
    const form = document.getElementById(`formComentario-${id}`);
    const aviso = document.getElementById(`avisoComentariosNoticia-${id}`);
    const toggle = document.getElementById(`toggleComentariosNoticia-${id}`);
    const status = document.getElementById(`statusComentariosNoticia-${id}`);
    
    const podeComentar = ativo || usuarioLogado;
    
    if (form) form.style.display = podeComentar ? 'flex' : 'none';
    if (aviso) aviso.style.display = podeComentar ? 'none' : 'flex';
    if (toggle) toggle.checked = ativo;
    if (status) {
        status.textContent = ativo ? 'Ativados' : 'Desativados';
        status.className = 'status-comentarios ' + (ativo ? 'ativo' : 'inativo');
    }
}

function alternarComentariosNoticia(id, ativar) {
    database.ref(CONFIG_NOTICIAS_REF + '/' + id).update({ comentariosAtivos: ativar })
        .then(() => {
            mostrarToast(
                ativar ? '✅ Comentários ativados nesta notícia' : '🔒 Comentários desativados nesta notícia',
                'sucesso'
            );
            aplicarEstadoComentariosNoticia(id, ativar);
        })
        .catch(err => mostrarToast('Erro: ' + err.message, 'erro'));
}

function enviarComentarioNoticia(id) {
    database.ref(CONFIG_NOTICIAS_REF + '/' + id).once('value', (snap) => {
        const config = snap.val() || {};
        const ativo = config.comentariosAtivos !== false;
        
        if (!ativo && !usuarioLogado) {
            mostrarToast('🔒 Comentários desativados nesta notícia.', 'alerta');
            return;
        }
        
        const nome = document.getElementById(`nomeComentario-${id}`).value.trim();
        const texto = document.getElementById(`textoComentario-${id}`).value.trim();
        const msgDiv = document.getElementById(`msgComentario-${id}`);

        if (!texto) {
            msgDiv.textContent = '⚠️ Escreva um comentário.';
            msgDiv.style.color = 'var(--error-text)';
            return;
        }

        database.ref(COMENTARIOS_NOTICIAS_REF + '/' + id).push({
            nome: nome || 'Anônimo',
            texto: texto,
            data: new Date().toISOString()
        }).then(() => {
            document.getElementById(`textoComentario-${id}`).value = '';
            document.getElementById(`nomeComentario-${id}`).value = '';
            msgDiv.textContent = '✅ Comentário enviado!';
            msgDiv.style.color = 'var(--success-text)';
            mostrarToast('💬 Comentário enviado!', 'sucesso');
            setTimeout(() => { msgDiv.textContent = ''; }, 4000);
        }).catch(err => {
            msgDiv.textContent = '❌ Erro: ' + err.message;
            mostrarToast('Erro ao enviar comentário.', 'erro');
        });
    });
}

function excluirComentarioNoticia(noticiaId, comentarioId) {
    if (!usuarioLogado) {
        mostrarToast('🔐 Faça login para excluir.', 'erro');
        return;
    }
    if (!confirm('🗑️ Excluir este comentário permanentemente?')) return;
    
    database.ref(COMENTARIOS_NOTICIAS_REF + '/' + noticiaId + '/' + comentarioId).remove()
        .then(() => mostrarToast('🗑️ Comentário excluído.', 'sucesso'))
        .catch(err => mostrarToast('Erro: ' + err.message, 'erro'));
}

function apagarTodosComentarios(noticiaId) {
    if (!usuarioLogado) {
        mostrarToast('🔐 Faça login para apagar.', 'erro');
        return;
    }
    if (!confirm('⚠️ Apagar TODOS os comentários desta notícia?\n\nEsta ação NÃO pode ser desfeita!')) return;
    
    database.ref(COMENTARIOS_NOTICIAS_REF + '/' + noticiaId).remove()
        .then(() => mostrarToast('🗑️ Todos os comentários foram apagados.', 'sucesso'))
        .catch(err => mostrarToast('Erro: ' + err.message, 'erro'));
}

function atualizarElementosAdminNoticias() {
    document.querySelectorAll('.noticia-comentarios').forEach(sec => {
        const id = sec.id.replace('comentarios-', '');
        
        const toggleContainer = document.getElementById(`toggleNoticiaContainer-${id}`);
        const btnApagar = document.getElementById(`btnApagarTodos-${id}`);
        
        if (toggleContainer) toggleContainer.style.display = usuarioLogado ? 'flex' : 'none';
        if (btnApagar) btnApagar.style.display = usuarioLogado ? 'inline-block' : 'none';
        
        database.ref(CONFIG_NOTICIAS_REF + '/' + id).once('value', (snap) => {
            const config = snap.val() || {};
            const ativo = config.comentariosAtivos !== false;
            aplicarEstadoComentariosNoticia(id, ativo);
        });
        
        document.querySelectorAll(`#listaComentarios-${id} .btn-excluir-comentario`).forEach(btn => {
            btn.style.display = usuarioLogado ? 'inline-block' : 'none';
        });
    });
}

/* =========================
   CENTRAL DE POP-UPS
========================= */
function toggleCentralPopups() {
    const central = document.getElementById('centralPopups');
    central.classList.toggle('aberto');
    document.body.style.overflow = central.classList.contains('aberto') ? 'hidden' : '';
}

function fecharCentralPopups() {
    const central = document.getElementById('centralPopups');
    if (central) {
        central.classList.remove('aberto');
        document.body.style.overflow = '';
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharCentralPopups();
    }
});

/* =========================
   BARRA DE PROGRESSO E BOTÃO TOPO
========================= */
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = progress + '%';
});

window.addEventListener('scroll', () => {
    const btn = document.getElementById('btnTopo');
    if (!btn) return;
    if (window.scrollY > 300) {
        btn.classList.add('visivel');
    } else {
        btn.classList.remove('visivel');
    }
});

/* =========================
   TEMA
========================= */
function alternarTema() {
    const html = document.documentElement;
    const btn = document.getElementById('btnTema');
    const icone = btn.querySelector('.icone-tema');
    const texto = btn.querySelector('.texto-tema');
    
    if (temaAtual === 'claro') {
        temaAtual = 'escuro';
        html.setAttribute('data-theme', 'dark');
        icone.textContent = '☀️';
        texto.textContent = 'Claro';
        localStorage.setItem('tema', 'escuro');
    } else {
        temaAtual = 'claro';
        html.removeAttribute('data-theme');
        icone.textContent = '🌙';
        texto.textContent = 'Escuro';
        localStorage.setItem('tema', 'claro');
    }
}

function carregarTemaSalvo() {
    const html = document.documentElement;
    const btn = document.getElementById('btnTema');
    if (!btn) return;
    const icone = btn.querySelector('.icone-tema');
    const texto = btn.querySelector('.texto-tema');
    
    if (temaAtual === 'escuro') {
        html.setAttribute('data-theme', 'dark');
        icone.textContent = '☀️';
        texto.textContent = 'Claro';
    } else {
        html.removeAttribute('data-theme');
        icone.textContent = '🌙';
        texto.textContent = 'Escuro';
    }
}

/* =========================
   NAVEGAÇÃO
========================= */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSection(id) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth" });
    }
}

/* =========================
   TOAST
========================= */
function mostrarToast(mensagem, tipo = 'info', duracao = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    const icones = { sucesso: '✅', erro: '❌', info: 'ℹ️', alerta: '⚠️' };
    const icone = icones[tipo] || 'ℹ️';
    
    toast.innerHTML = `
        <span class="toast-icone">${icone}</span>
        <span>${mensagem}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, duracao);
}

/* =========================
   LOGIN
========================= */
function abrirLoginAdmin() {
    if (usuarioLogado) {
        mostrarPainel();
        return;
    }
    const modal = document.getElementById("modalLoginAdmin");
    modal.classList.add("mostrar");
    document.getElementById("usuarioLogin").focus();
}

function fecharLoginAdmin() {
    document.getElementById("modalLoginAdmin").classList.remove("mostrar");
    document.getElementById("usuarioLogin").value = "";
    document.getElementById("senhaLogin").value = "";
    document.getElementById("mensagemLogin").className = "mensagem-login";
}

function fazerLogin(event) {
    event.preventDefault();
    const usuario = document.getElementById("usuarioLogin").value.trim();
    const senha = document.getElementById("senhaLogin").value.trim();
    const mensagem = document.getElementById("mensagemLogin");

    if (!usuario || !senha) {
        mensagem.textContent = "⚠️ Preencha usuário e senha.";
        mensagem.className = "mensagem-login erro";
        return false;
    }

    if (usuario.toLowerCase() === "eeca" && senha === "Eec@2027") {
        usuarioLogado = true;
        tipoUsuario = 'admin';
        fecharLoginAdmin();

        document.getElementById("badgeAdmin").style.display = "inline-block";
        document.getElementById("badgeDiretor").style.display = "none";
        document.querySelectorAll(".admin-menu").forEach(el => {
            el.style.display = "inline-block";
        });
        document.getElementById("painelAdmin").classList.add("mostrar");
        document.querySelectorAll(".btn-excluir, .btn-editar").forEach(btn => {
            btn.style.display = "inline-flex";
        });
        document.querySelectorAll(".btn-excluir-mensagem").forEach(btn => {
            btn.style.display = "inline-block";
        });
        document.querySelectorAll(".btn-excluir-reclamacao").forEach(btn => {
            btn.style.display = "inline-block";
        });
        document.querySelectorAll(".btn-aprovar-reclamacao, .btn-rejeitar-reclamacao").forEach(btn => {
            btn.style.display = "inline-block";
        });
        document.querySelectorAll(".btn-responder-reclamacao").forEach(btn => {
            btn.style.display = "inline-block";
        });

        verificarPendencias();
        atualizarVisibilidadeToggles();
        atualizarElementosAdminNoticias();
        mostrarToast("👑 Bem-vindo, Administrador!", "sucesso");
        document.getElementById("painelAdmin").scrollIntoView({ behavior: "smooth" });
        return false;
    }
    
    if (usuario.toLowerCase() === "diretor" && senha === "Eec@2027") {
        usuarioLogado = true;
        tipoUsuario = 'diretor';
        fecharLoginAdmin();

        document.getElementById("badgeDiretor").style.display = "inline-block";
        document.getElementById("badgeAdmin").style.display = "none";
        document.querySelectorAll(".admin-menu").forEach(el => {
            el.style.display = "inline-block";
        });
        document.getElementById("painelAdmin").classList.add("mostrar");
        document.querySelectorAll(".btn-excluir, .btn-editar").forEach(btn => {
            btn.style.display = "inline-flex";
        });
        document.querySelectorAll(".btn-excluir-mensagem").forEach(btn => {
            btn.style.display = "inline-block";
        });
        document.querySelectorAll(".btn-excluir-reclamacao").forEach(btn => {
            btn.style.display = "inline-block";
        });
        document.querySelectorAll(".btn-aprovar-reclamacao, .btn-rejeitar-reclamacao").forEach(btn => {
            btn.style.display = "inline-block";
        });
        document.querySelectorAll(".btn-responder-reclamacao").forEach(btn => {
            btn.style.display = "inline-block";
        });

        verificarPendencias();
        atualizarVisibilidadeToggles();
        atualizarElementosAdminNoticias();
        mostrarToast("🎓 Bem-vindo, Diretor! (Todos os direitos)", "sucesso");
        document.getElementById("painelAdmin").scrollIntoView({ behavior: "smooth" });
        return false;
    }

    mensagem.textContent = "❌ Usuário ou senha incorretos.";
    mensagem.className = "mensagem-login erro";
    document.getElementById("senhaLogin").value = "";
    document.getElementById("senhaLogin").focus();
    return false;
}

/* =========================
   LOGOUT
========================= */
function fazerLogout() {
    if (!confirm("Deseja sair da conta?")) return;
    usuarioLogado = false;
    tipoUsuario = null;
    document.getElementById("badgeAdmin").style.display = "none";
    document.getElementById("badgeDiretor").style.display = "none";
    document.querySelectorAll(".admin-menu").forEach(el => {
        el.style.display = "none";
    });
    document.getElementById("painelAdmin").classList.remove("mostrar");
    document.querySelectorAll(".btn-excluir, .btn-editar").forEach(btn => {
        btn.style.display = "none";
    });
    document.querySelectorAll(".btn-excluir-mensagem").forEach(btn => {
        btn.style.display = "none";
    });
    document.querySelectorAll(".btn-excluir-reclamacao").forEach(btn => {
        btn.style.display = "none";
    });
    document.querySelectorAll(".btn-aprovar-reclamacao, .btn-rejeitar-reclamacao").forEach(btn => {
        btn.style.display = "none";
    });
    document.querySelectorAll(".btn-responder-reclamacao").forEach(btn => {
        btn.style.display = "none";
    });

    atualizarVisibilidadeToggles();
    atualizarElementosAdminNoticias();
    mostrarToast("👋 Você saiu da conta.", "info");
}

/* =========================
   PAINEL ADMIN
========================= */
function mostrarPainel() {
    if (!usuarioLogado) {
        abrirLoginAdmin();
        return;
    }
    const painel = document.getElementById("painelAdmin");
    painel.classList.add("mostrar");
    painel.scrollIntoView({ behavior: "smooth" });
}

/* =========================
   UTILITÁRIOS
========================= */
function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function escaparAtributo(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatarData(dataISO) {
    const data = dataISO ? new Date(dataISO) : new Date();
    if (isNaN(data.getTime())) return "Data não disponível";
    const dataFormatada = data.toLocaleDateString("pt-BR");
    const horaFormatada = data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
    return `📅 Publicado em ${dataFormatada} às ${horaFormatada}`;
}

function formatarDataSimples(dataISO) {
    const data = dataISO ? new Date(dataISO) : new Date();
    if (isNaN(data.getTime())) return "Data inválida";
    return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarTextoComQuebras(texto) {
    if (!texto) return '';
    return texto
        .replace(/\n/g, '<br>')
        .replace(/\s\s/g, ' &nbsp;')
        .trim();
}

/* =========================
   BUSCA
========================= */
const campoBuscaEl = document.getElementById('campoBusca');
if (campoBuscaEl) {
    campoBuscaEl.addEventListener('input', function() {
        clearTimeout(timeoutBusca);
        timeoutBusca = setTimeout(() => {
            filtrarNoticias();
        }, 300);
    });
}

function filtrarNoticias() {
    const termo = document.getElementById('campoBusca').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.noticia');
    const semNoticias = document.getElementById('semNoticias');
    let encontrou = false;

    cards.forEach(card => {
        const titulo = card.querySelector('h2')?.textContent?.toLowerCase() || '';
        const texto = card.querySelector('.noticia-resumo')?.textContent?.toLowerCase() || '';
        const match = titulo.includes(termo) || texto.includes(termo);
        card.style.display = match ? '' : 'none';
        if (match) encontrou = true;
    });

    if (!encontrou && cards.length > 0) {
        semNoticias.style.display = 'block';
        semNoticias.innerHTML = `<h2>🔍 Nenhuma notícia encontrada</h2><p>Tente outro termo de busca.</p>`;
    } else {
        semNoticias.style.display = 'none';
        const noticiasExistem = document.querySelectorAll('.noticia').length > 0;
        if (!noticiasExistem) {
            semNoticias.style.display = 'block';
            semNoticias.innerHTML = `<h2>📰 Nenhuma notícia publicada</h2><p>As notícias publicadas pelo administrador aparecerão aqui.</p>`;
        }
    }
}

/* =========================
   NOTÍCIAS
========================= */
function carregarNoticias() {
    const noticiasRef = database.ref(NOTICIAS_REF);
    const skeleton = document.getElementById('skeletonLoader');

    noticiasRef.on('value', (snapshot) => {
        const dados = snapshot.val();

        const areaNoticias = document.getElementById("areaNoticias");
        const semNoticias = document.getElementById("semNoticias");

        document.querySelectorAll("#areaNoticias .noticia, #areaNoticias .noticia-tela-cheia")
            .forEach(el => el.remove());

        todasNoticias = [];

        if (skeleton) skeleton.style.display = 'none';

        if (!dados) {
            semNoticias.style.display = "block";
            semNoticias.innerHTML = `<h2>📰 Nenhuma notícia publicada</h2><p>As notícias publicadas pelo administrador aparecerão aqui.</p>`;
            return;
        }

        semNoticias.style.display = "none";

        const noticiasArray = Object.keys(dados).map(key => ({
            id: key,
            ...dados[key]
        })).sort((a, b) => new Date(b.data) - new Date(a.data));

        todasNoticias = noticiasArray;

        noticiasArray.forEach((noticia, index) => {
            const card = criarNoticia(
                noticia.id,
                noticia.titulo,
                noticia.texto,
                noticia.imagem,
                noticia.data
            );
            card.style.animationDelay = `${index * 0.08}s`;
            areaNoticias.appendChild(card);
            const modal = criarModal(
                noticia.id,
                noticia.titulo,
                noticia.texto,
                noticia.imagem,
                noticia.data
            );
            areaNoticias.appendChild(modal);
        });

        if (usuarioLogado) {
            document.querySelectorAll(".btn-excluir, .btn-editar").forEach(btn => {
                btn.style.display = "inline-flex";
            });
        }

        const termo = document.getElementById('campoBusca').value;
        if (termo) filtrarNoticias();

    }, (erro) => {
        mostrarToast("Erro ao carregar notícias: " + erro.message, "erro");
        if (skeleton) skeleton.style.display = 'none';
    });
}

function criarNoticia(id, titulo, texto, imagem, dataPublicacao) {
    const imagemPadrao =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect fill='%23F5C518' width='800' height='400'/%3E%3Ctext x='400' y='200' font-size='30' fill='black' text-anchor='middle' dy='.3em'%3EEeca Notícias%3C/text%3E%3C/svg%3E";
    const imgSrc = imagem || imagemPadrao;
    const dataTexto = formatarData(dataPublicacao);
    
    const textoFormatado = formatarTextoComQuebras(texto);
    let resumo = texto;
    if (resumo && resumo.length > 150) {
        resumo = resumo.substring(0, 150) + "...";
    }
    const resumoFormatado = formatarTextoComQuebras(resumo);

    const noticia = document.createElement("div");
    noticia.className = "noticia";
    noticia.id = "noticia-" + id;
    noticia.style.opacity = '0';
    noticia.innerHTML = `
        <h2><a href="#modal-${id}">${escaparHTML(titulo)}</a></h2>
        <div class="noticia-data">${escaparHTML(dataTexto)}</div>
        <img src="${escaparAtributo(imgSrc)}" alt="${escaparAtributo(titulo)}" onerror="this.src='${imagemPadrao}'" />
        <div class="noticia-resumo">${resumoFormatado} <a href="#modal-${id}">Ler mais</a></div>
        <div class="botoes-acoes">
            <button class="btn-editar" onclick="abrirEdicao('${escaparAtributo(id)}')">✏️ Editar</button>
            <button class="btn-excluir" onclick="excluirNoticia('${escaparAtributo(id)}')">🗑️ Excluir</button>
        </div>
    `;

    if (usuarioLogado) {
        noticia.querySelector(".btn-excluir").style.display = "inline-flex";
        noticia.querySelector(".btn-editar").style.display = "inline-flex";
    }

    return noticia;
}

function criarModal(id, titulo, texto, imagem, dataPublicacao) {
    const imagemPadrao =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect fill='%23F5C518' width='800' height='400'/%3E%3Ctext x='400' y='200' font-size='30' fill='black' text-anchor='middle' dy='.3em'%3EEeca Notícias%3C/text%3E%3C/svg%3E";
    const imgSrc = imagem || imagemPadrao;
    const dataTexto = formatarData(dataPublicacao);
    const textoFormatado = formatarTextoComQuebras(texto);

    const modal = document.createElement("div");
    modal.className = "noticia-tela-cheia";
    modal.id = "modal-" + id;
    modal.innerHTML = `
        <div class="conteudo-modal">
            <a href="#" class="btn-fechar">← Voltar para o Início</a>
            <h1>${escaparHTML(titulo)}</h1>
            <div class="noticia-data">${escaparHTML(dataTexto)}</div>
            <img src="${escaparAtributo(imgSrc)}" alt="${escaparAtributo(titulo)}" onerror="this.src='${imagemPadrao}'" />
            <div class="conteudo-texto">${textoFormatado}</div>

            <div class="noticia-comentarios" id="comentarios-${id}">
                <div class="noticia-comentarios-header">
                    <h3>💬 Comentários</h3>
                    <button class="btn-apagar-todos-comentarios" id="btnApagarTodos-${id}" style="display:none;" onclick="apagarTodosComentarios('${id}')">🗑️ Apagar Todos</button>
                </div>

                <div class="toggle-comentarios-noticia" id="toggleNoticiaContainer-${id}" style="display:none;">
                    <div class="toggle-comentarios-header">
                        <span>🔐 Controle de Comentários desta Notícia</span>
                        <label class="switch-comentarios">
                            <input type="checkbox" id="toggleComentariosNoticia-${id}" checked onchange="alternarComentariosNoticia('${id}', this.checked)">
                            <span class="slider-comentarios"></span>
                        </label>
                        <span id="statusComentariosNoticia-${id}" class="status-comentarios ativo">Ativados</span>
                    </div>
                </div>

                <div class="form-comentario-noticia" id="formComentario-${id}">
                    <input type="text" id="nomeComentario-${id}" placeholder="Seu nome (opcional)" maxlength="60" />
                    <textarea id="textoComentario-${id}" placeholder="Escreva seu comentário..." rows="3" maxlength="500"></textarea>
                    <button class="btn-enviar-comentario" onclick="enviarComentarioNoticia('${id}')">💬 Enviar Comentário</button>
                    <div class="msg-comentario" id="msgComentario-${id}"></div>
                </div>

                <div class="aviso-comentarios-desativados" id="avisoComentariosNoticia-${id}" style="display:none;">
                    <span class="icone-aviso">🔒</span>
                    <div>
                        <strong>Comentários desativados nesta notícia</strong>
                        <p>O administrador desativou os comentários desta publicação.</p>
                    </div>
                </div>

                <div class="lista-comentarios" id="listaComentarios-${id}"></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        carregarComentariosNoticia(id);
        
        if (usuarioLogado) {
            const toggleContainer = document.getElementById(`toggleNoticiaContainer-${id}`);
            const btnApagar = document.getElementById(`btnApagarTodos-${id}`);
            if (toggleContainer) toggleContainer.style.display = 'flex';
            if (btnApagar) btnApagar.style.display = 'inline-block';
        }
    }, 50);

    return modal;
}

function rolarParaNoticias() {
    const area = document.getElementById('areaNoticias');
    if (area) {
        area.scrollIntoView({ behavior: 'smooth' });
    }
}

/* =========================
   PUBLICAR NOTÍCIA
========================= */
function publicarNoticia() {
    if (!usuarioLogado) {
        mostrarToast("Faça login primeiro!", "erro");
        abrirLoginAdmin();
        return;
    }

    const titulo = document.getElementById("tituloNoticia").value.trim();
    const imagem = document.getElementById("imagemNoticia").value.trim();
    const texto = document.getElementById("textoNoticia").value;
    const mensagem = document.getElementById("mensagemAdmin");

    if (!titulo || !texto) {
        mensagem.textContent = "⚠️ Preencha o título e o texto!";
        mensagem.className = "mensagem-admin erro";
        return;
    }

    const noticia = {
        titulo: titulo,
        texto: texto,
        imagem: imagem || "",
        data: new Date().toISOString()
    };

    database.ref(NOTICIAS_REF).push(noticia)
        .then((ref) => {
            document.getElementById("tituloNoticia").value = "";
            document.getElementById("imagemNoticia").value = "";
            document.getElementById("textoNoticia").value = "";

            mensagem.textContent = "✅ Notícia publicada com sucesso!";
            mensagem.className = "mensagem-admin sucesso";
            mostrarToast("📰 Notícia publicada com sucesso!", "sucesso");
            setTimeout(() => { mensagem.className = "mensagem-admin"; }, 4000);
            rolarParaNoticias();
        })
        .catch((erro) => {
            mensagem.textContent = "❌ Erro ao publicar: " + erro.message;
            mensagem.className = "mensagem-admin erro";
            mostrarToast("Erro ao publicar: " + erro.message, "erro");
        });
}

/* =========================
   EXCLUIR NOTÍCIA
========================= */
function excluirNoticia(id) {
    if (!usuarioLogado) {
        abrirLoginAdmin();
        return;
    }
    if (confirm("Tem certeza que deseja excluir esta notícia?\n\nOs comentários desta notícia também serão apagados.")) {
        database.ref(NOTICIAS_REF + '/' + id).remove()
            .then(() => {
                return Promise.all([
                    database.ref(COMENTARIOS_NOTICIAS_REF + '/' + id).remove(),
                    database.ref(CONFIG_NOTICIAS_REF + '/' + id).remove()
                ]);
            })
            .then(() => {
                mostrarToast("🗑️ Notícia e comentários excluídos!", "sucesso");
                rolarParaNoticias();
            })
            .catch((erro) => mostrarToast("Erro ao excluir: " + erro.message, "erro"));
    }
}

/* =========================
   EDIÇÃO
========================= */
function abrirEdicao(id) {
    if (!usuarioLogado) {
        mostrarToast("🔐 Faça login como administrador para editar.", "erro");
        abrirLoginAdmin();
        return;
    }

    const noticia = todasNoticias.find(n => n.id === id);
    if (!noticia) {
        mostrarToast("Notícia não encontrada.", "erro");
        return;
    }

    document.getElementById('editarTitulo').value = noticia.titulo || '';
    document.getElementById('editarImagem').value = noticia.imagem || '';
    document.getElementById('editarTexto').value = noticia.texto || '';
    noticiaEditandoId = id;

    document.getElementById('modalEditar').classList.add('mostrar');
    document.getElementById('mensagemEdicao').className = 'mensagem-admin';
    document.getElementById('mensagemEdicao').textContent = '';
}

function salvarEdicao() {
    if (!noticiaEditandoId) {
        mostrarToast("Nenhuma notícia sendo editada.", "erro");
        return;
    }

    const titulo = document.getElementById('editarTitulo').value.trim();
    const imagem = document.getElementById('editarImagem').value.trim();
    const texto = document.getElementById('editarTexto').value;
    const msg = document.getElementById('mensagemEdicao');

    if (!titulo || !texto) {
        msg.textContent = "⚠️ Título e texto são obrigatórios.";
        msg.className = "mensagem-admin erro";
        return;
    }

    const atualizacao = { titulo, imagem: imagem || "", texto };
    database.ref(NOTICIAS_REF + '/' + noticiaEditandoId).update(atualizacao)
        .then(() => {
            mostrarToast("✏️ Notícia editada com sucesso!", "sucesso");
            cancelarEdicao();
            rolarParaNoticias();
        })
        .catch((erro) => {
            msg.textContent = "❌ Erro ao salvar: " + erro.message;
            msg.className = "mensagem-admin erro";
            mostrarToast("Erro ao editar: " + erro.message, "erro");
        });
}

function cancelarEdicao() {
    document.getElementById('modalEditar').classList.remove('mostrar');
    noticiaEditandoId = null;
    document.getElementById('editarTitulo').value = '';
    document.getElementById('editarImagem').value = '';
    document.getElementById('editarTexto').value = '';
    document.getElementById('mensagemEdicao').className = 'mensagem-admin';
    document.getElementById('mensagemEdicao').textContent = '';
}

document.getElementById('modalEditar').addEventListener('click', function (event) {
    if (event.target === this) cancelarEdicao();
});

document.getElementById("modalLoginAdmin").addEventListener("click", function (event) {
    if (event.target === this) fecharLoginAdmin();
});

/* =========================
   MENSAGENS – SETEMBRO AMARELO
========================= */
function carregarMensagens() {
    const mensagensRef = database.ref(MENSAGENS_REF);
    const container = document.getElementById('mensagensContainer');

    mensagensRef.on('value', (snapshot) => {
        const dados = snapshot.val();
        container.innerHTML = '';

        if (!dados) {
            container.innerHTML = `<div class="sem-mensagens">💛 Nenhuma mensagem ainda. Seja o primeiro a enviar!</div>`;
            return;
        }

        const mensagensArray = Object.keys(dados).map(key => ({
            id: key,
            ...dados[key]
        })).sort((a, b) => new Date(b.data) - new Date(a.data));

        mensagensArray.forEach((msg) => {
            const div = document.createElement('div');
            div.className = 'mensagem-item';
            const nome = msg.nome ? escaparHTML(msg.nome) : 'Anônimo';
            const data = formatarDataSimples(msg.data);
            const texto = escaparHTML(msg.texto).replace(/\n/g, '<br>');

            let html = `
                <div class="mensagem-nome">
                    <span>💛 ${nome}</span>
                    <span class="data">${data}</span>
                </div>
                <div class="mensagem-texto">${texto}</div>
            `;

            if (usuarioLogado) {
                html += `<button class="btn-excluir-mensagem" onclick="excluirMensagem('${msg.id}')">🗑️ Excluir</button>`;
            }

            div.innerHTML = html;
            container.appendChild(div);
        });

        if (usuarioLogado) {
            document.querySelectorAll('.btn-excluir-mensagem').forEach(btn => btn.style.display = 'inline-block');
        }

    }, (erro) => {
        mostrarToast("Erro ao carregar mensagens.", "erro");
    });
}

function enviarMensagem() {
    if (!comentariosAtivos && !usuarioLogado) {
        mostrarToast('🔒 Os comentários estão desativados no momento.', 'alerta');
        return;
    }
    
    const nome = document.getElementById('nomeMensagem').value.trim();
    const texto = document.getElementById('textoMensagem').value.trim();
    const msgDiv = document.getElementById('msgEnvio');

    if (!texto) {
        msgDiv.textContent = '⚠️ Escreva uma mensagem antes de enviar.';
        msgDiv.style.color = 'var(--error-text)';
        return;
    }

    const dados = {
        nome: nome || 'Anônimo',
        texto: texto,
        data: new Date().toISOString()
    };

    database.ref(MENSAGENS_REF).push(dados)
        .then(() => {
            document.getElementById('textoMensagem').value = '';
            document.getElementById('nomeMensagem').value = '';
            msgDiv.textContent = '✅ Mensagem enviada com sucesso! Obrigado por compartilhar.';
            msgDiv.style.color = 'var(--success-text)';
            mostrarToast('💛 Mensagem enviada com sucesso!', 'sucesso');
            setTimeout(() => { msgDiv.textContent = ''; }, 5000);
        })
        .catch((erro) => {
            msgDiv.textContent = '❌ Erro ao enviar: ' + erro.message;
            msgDiv.style.color = 'var(--error-text)';
            mostrarToast('Erro ao enviar mensagem.', 'erro');
        });
}

function excluirMensagem(id) {
    if (!usuarioLogado) {
        mostrarToast('Faça login como administrador.', 'erro');
        return;
    }
    if (!confirm('Excluir esta mensagem permanentemente?')) return;

    database.ref(MENSAGENS_REF + '/' + id).remove()
        .then(() => {
            mostrarToast('🗑️ Mensagem excluída.', 'sucesso');
        })
        .catch((erro) => {
            mostrarToast('Erro ao excluir: ' + erro.message, 'erro');
        });
}

/* =========================
   MENSAGENS PADRÃO DIRETOR
========================= */
const MENSAGENS_PADRAO = [
    '✅ Recebemos sua reclamação e estamos analisando. Retornaremos em breve!',
    '📌 Agradecemos pelo seu contato. Já estamos tomando as providências necessárias.',
    '🔍 Sua reclamação foi encaminhada ao setor responsável. Acompanhe o andamento.',
    '📋 Registramos sua reclamação. Em até 48h daremos um retorno.',
    '👨‍🏫 Obrigado por nos informar. Já estamos trabalhando para resolver.',
    '📝 Sua reclamação foi protocolada. Aguarde nosso contato.',
    '✅ Problema identificado! Já estamos atuando para solucionar.',
    '📢 Sua voz é importante! Sua reclamação será tratada com prioridade.'
];

/* =========================
   OUVIDORIA
========================= */
function abrirJanelaOuvidoria() {
    document.getElementById('janelaOuvidoria').classList.add('mostrar');
    document.body.style.overflow = 'hidden';
    carregarReclamacoes();
    if (usuarioLogado) {
        carregarPendencias();
        const area = document.getElementById('areaModeracao');
        if (area) area.style.display = 'block';
        atualizarVisibilidadeToggles();
    }
    fecharFormReclamacao();
}

function fecharJanelaOuvidoria() {
    document.getElementById('janelaOuvidoria').classList.remove('mostrar');
    document.body.style.overflow = '';
    fecharFormReclamacao();
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharJanelaOuvidoria();
    }
});

function abrirFormReclamacao() {
    if (!reclamacoesAtivas && !usuarioLogado) {
        mostrarToast('🔒 A ouvidoria está fechada para novas reclamações.', 'alerta');
        return;
    }
    
    const container = document.getElementById('formReclamacaoContainer');
    if (container.style.display === 'block') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('msgOuvidoria').textContent = '';
        document.getElementById('msgOuvidoria').className = 'msg-ouvidoria';
    }
}

function fecharFormReclamacao() {
    const container = document.getElementById('formReclamacaoContainer');
    if (container) container.style.display = 'none';
    const campos = ['reclamacaoTitulo', 'reclamacaoNome', 'reclamacaoTexto', 'foto1', 'foto2', 'foto3'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const preview = document.getElementById('previewFotos');
    if (preview) preview.innerHTML = '';
    const msg = document.getElementById('msgOuvidoria');
    if (msg) {
        msg.textContent = '';
        msg.className = 'msg-ouvidoria';
    }
}

function abrirModeracao() {
    if (!usuarioLogado) {
        mostrarToast('🔐 Faça login como administrador.', 'erro');
        return;
    }
    abrirJanelaOuvidoria();
    setTimeout(() => {
        const area = document.getElementById('areaModeracao');
        if (area) {
            area.style.display = 'block';
            area.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 300);
}

document.querySelectorAll('#foto1, #foto2, #foto3').forEach((input, idx) => {
    input.addEventListener('change', function() {
        const previewContainer = document.getElementById('previewFotos');
        const existing = previewContainer.querySelectorAll('.foto-preview');
        const keep = [];
        existing.forEach(el => {
            if (el.dataset.input !== `foto${idx+1}`) keep.push(el);
        });
        previewContainer.innerHTML = '';
        keep.forEach(el => previewContainer.appendChild(el));

        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'foto-preview';
                img.dataset.input = `foto${idx+1}`;
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
});

function enviarReclamacao() {
    if (!reclamacoesAtivas && !usuarioLogado) {
        mostrarToast('🔒 A ouvidoria está fechada para novas reclamações.', 'alerta');
        return;
    }
    
    const titulo = document.getElementById('reclamacaoTitulo').value.trim();
    const nome = document.getElementById('reclamacaoNome').value.trim();
    const texto = document.getElementById('reclamacaoTexto').value.trim();
    const msgDiv = document.getElementById('msgOuvidoria');

    if (!titulo || !texto) {
        msgDiv.textContent = '⚠️ Preencha título e descrição.';
        msgDiv.className = 'msg-ouvidoria erro';
        return;
    }

    const temPalavrao = contemPalavrao(titulo) || contemPalavrao(texto);
    const tituloCensurado = censurarTexto(titulo);
    const textoCensurado = censurarTexto(texto);

    const fileInputs = ['foto1', 'foto2', 'foto3'];
    const fotosPromises = fileInputs.map((id) => {
        const input = document.getElementById(id);
        if (input.files && input.files[0]) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(input.files[0]);
            });
        }
        return Promise.resolve(null);
    });

    Promise.all(fotosPromises).then((fotosBase64) => {
        const fotos = fotosBase64.filter(f => f !== null);
        if (fotos.length > 3) {
            msgDiv.textContent = '⚠️ Máximo de 3 fotos.';
            msgDiv.className = 'msg-ouvidoria erro';
            return;
        }

        const dados = {
            titulo: tituloCensurado,
            tituloOriginal: titulo,
            nome: nome || 'Anônimo',
            texto: textoCensurado,
            textoOriginal: texto,
            fotos: fotos,
            data: new Date().toISOString(),
            status: 'pendente',
            temPalavrao: temPalavrao,
            respostas: [],
            votos: { sim: 0, nao: 0 },
            votosUsuarios: []
        };

        database.ref(RECLAMACOES_PENDENTES_REF).push(dados)
            .then(() => {
                if (temPalavrao) {
                    msgDiv.textContent = '⚠️ Sua reclamação contém palavras ofensivas que foram censuradas. Ela será analisada pela moderação.';
                    msgDiv.className = 'msg-ouvidoria alerta';
                    mostrarToast('⚠️ Reclamação enviada para moderação (contém palavras ofensivas).', 'alerta');
                } else {
                    msgDiv.textContent = '✅ Reclamação enviada com sucesso! Aguarde a moderação.';
                    msgDiv.className = 'msg-ouvidoria sucesso';
                    mostrarToast('📢 Reclamação enviada para moderação!', 'sucesso');
                }
                
                if (usuarioLogado) {
                    mostrarToast('🔔 Nova reclamação pendente! Verifique a moderação.', 'alerta', 5000);
                }
                
                carregarPendencias();
                carregarReclamacoes();
                
                setTimeout(() => { 
                    msgDiv.textContent = ''; 
                    msgDiv.className = 'msg-ouvidoria'; 
                }, 6000);
                
                fecharFormReclamacao();
            })
            .catch((erro) => {
                msgDiv.textContent = '❌ Erro ao enviar: ' + erro.message;
                msgDiv.className = 'msg-ouvidoria erro';
                mostrarToast('Erro ao enviar reclamação.', 'erro');
            });
    });
}

function carregarPendencias() {
    if (!usuarioLogado) return;
    
    const container = document.getElementById('listaPendencias');
    if (!container) return;
    
    const ref = database.ref(RECLAMACOES_PENDENTES_REF);

    ref.on('value', (snapshot) => {
        const dados = snapshot.val();
        container.innerHTML = '';

        if (!dados) {
            container.innerHTML = '<div class="sem-pendencias">✅ Nenhuma reclamação pendente.</div>';
            return;
        }

        const items = Object.keys(dados).map(key => ({ id: key, ...dados[key] }))
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        if (items.length === 0) {
            container.innerHTML = '<div class="sem-pendencias">✅ Nenhuma reclamação pendente.</div>';
            return;
        }

        const badge = document.getElementById('badgePendencias');
        if (badge) {
            badge.textContent = items.length;
            badge.style.display = 'inline-block';
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'reclamacao-pendente';
            
            const temPalavrao = item.temPalavrao ? '⚠️ Contém palavras ofensivas (censuradas)' : '✅ Sem palavras ofensivas';
            const dataFormatada = item.data ? new Date(item.data).toLocaleString('pt-BR') : 'Data não disponível';
            
            let fotosHtml = '';
            if (item.fotos && item.fotos.length > 0) {
                fotosHtml = '<div class="reclamacao-fotos">';
                item.fotos.forEach(foto => {
                    fotosHtml += `<img src="${foto}" alt="Foto da reclamação" />`;
                });
                fotosHtml += '</div>';
            }

            const botoesModeracao = (usuarioLogado && (tipoUsuario === 'admin' || tipoUsuario === 'diretor')) ? `
                <div class="reclamacao-acoes">
                    <button class="btn-aprovar-reclamacao" onclick="aprovarReclamacao('${item.id}')">✅ Aprovar</button>
                    <button class="btn-rejeitar-reclamacao" onclick="rejeitarReclamacao('${item.id}')">❌ Rejeitar</button>
                    <button class="btn-ver-original" onclick="verOriginal('${item.id}')">👁️ Ver original</button>
                </div>
            ` : '';

            div.innerHTML = `
                <div class="reclamacao-titulo">${escaparHTML(item.titulo)}</div>
                <div class="reclamacao-remetente">👤 ${escaparHTML(item.nome)}</div>
                <div class="reclamacao-texto">${escaparHTML(item.texto).replace(/\n/g, '<br>')}</div>
                ${fotosHtml}
                <div class="reclamacao-status">${temPalavrao}</div>
                <div class="reclamacao-data">📅 ${dataFormatada}</div>
                ${botoesModeracao}
            `;
            container.appendChild(div);
        });
    }, (erro) => {
        container.innerHTML = '<div class="sem-pendencias">Erro ao carregar pendências.</div>';
    });
}

function verificarPendencias() {
    if (!usuarioLogado) return;
    
    const ref = database.ref(RECLAMACOES_PENDENTES_REF);
    ref.once('value', (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            const count = Object.keys(dados).length;
            if (count > 0) {
                mostrarToast(`🔔 ${count} reclamação(ões) aguardando moderação!`, 'alerta', 5000);
                const badge = document.getElementById('badgePendencias');
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                }
            }
        }
    });
}

function aprovarReclamacao(id) {
    if (!usuarioLogado || (tipoUsuario !== 'admin' && tipoUsuario !== 'diretor')) {
        mostrarToast('🔐 Apenas Administradores e o Diretor podem aprovar.', 'erro');
        return;
    }
    
    const mensagemConfirmacao = tipoUsuario === 'diretor'
        ? '✅ Diretor, aprovar esta reclamação? Ela será publicada publicamente.'
        : '✅ Aprovar esta reclamação? Ela será publicada publicamente.';
    
    if (!confirm(mensagemConfirmacao)) return;
    
    const pendenteRef = database.ref(RECLAMACOES_PENDENTES_REF + '/' + id);
    pendenteRef.once('value', (snapshot) => {
        const dados = snapshot.val();
        if (!dados) {
            mostrarToast('Reclamação não encontrada.', 'erro');
            return;
        }
        
        const { status, ...dadosPublicos } = dados;
        dadosPublicos.dataAprovacao = new Date().toISOString();
        dadosPublicos.respostas = dadosPublicos.respostas || [];
        dadosPublicos.votos = dadosPublicos.votos || { sim: 0, nao: 0 };
        dadosPublicos.votosUsuarios = dadosPublicos.votosUsuarios || [];
        
        database.ref(RECLAMACOES_REF).push(dadosPublicos)
            .then(() => pendenteRef.remove())
            .then(() => {
                mostrarToast('✅ Reclamação aprovada e publicada!', 'sucesso');
                carregarPendencias();
                carregarReclamacoes();
            })
            .catch((erro) => mostrarToast('❌ Erro ao aprovar: ' + erro.message, 'erro'));
    });
}

function rejeitarReclamacao(id) {
    if (!usuarioLogado || (tipoUsuario !== 'admin' && tipoUsuario !== 'diretor')) {
        mostrarToast('🔐 Apenas Administradores e o Diretor podem rejeitar.', 'erro');
        return;
    }
    
    if (!confirm('❌ Tem certeza que deseja rejeitar esta reclamação pendente?')) return;
    
    database.ref(RECLAMACOES_PENDENTES_REF + '/' + id).remove()
        .then(() => {
            mostrarToast('❌ Reclamação rejeitada e excluída.', 'sucesso');
            carregarPendencias();
            carregarReclamacoes();
        })
        .catch((erro) => mostrarToast('❌ Erro ao rejeitar: ' + erro.message, 'erro'));
}

function verOriginal(id) {
    if (!usuarioLogado || (tipoUsuario !== 'admin' && tipoUsuario !== 'diretor')) {
        mostrarToast('🔐 Apenas Administradores e o Diretor podem ver o original.', 'erro');
        return;
    }
    
    const ref = database.ref(RECLAMACOES_PENDENTES_REF + '/' + id);
    ref.once('value', (snapshot) => {
        const dados = snapshot.val();
        if (!dados) {
            mostrarToast('Reclamação não encontrada.', 'erro');
            return;
        }
        
        alert(
            '📝 TÍTULO ORIGINAL:\n' + (dados.tituloOriginal || dados.titulo) + 
            '\n\n📝 TEXTO ORIGINAL:\n' + (dados.textoOriginal || dados.texto) +
            '\n\n👤 REMETENTE: ' + dados.nome +
            '\n\n📅 DATA: ' + new Date(dados.data).toLocaleString('pt-BR') +
            '\n\n⚠️ PALAVRAS OFENSIVAS: ' + (dados.temPalavrao ? 'SIM (foram censuradas)' : 'NÃO')
        );
    });
}

function excluirReclamacaoPublica(id) {
    if (!usuarioLogado || (tipoUsuario !== 'admin' && tipoUsuario !== 'diretor')) {
        mostrarToast('🔐 Apenas Administradores e o Diretor podem excluir.', 'erro');
        return;
    }
    
    if (!confirm('🗑️ Tem certeza que deseja excluir esta reclamação publicada?')) return;
    
    database.ref(RECLAMACOES_REF + '/' + id).remove()
        .then(() => {
            mostrarToast('🗑️ Reclamação excluída com sucesso!', 'sucesso');
            carregarReclamacoes();
        })
        .catch((erro) => mostrarToast('❌ Erro ao excluir: ' + erro.message, 'erro'));
}

/* =========================
   RESPOSTA DO DIRETOR
========================= */
function abrirResponder(id) {
    if (tipoUsuario !== 'diretor') {
        mostrarToast('🎓 Apenas o Diretor pode responder.', 'erro');
        return;
    }
    
    const existingForm = document.getElementById(`resposta-form-${id}`);
    if (existingForm) {
        existingForm.remove();
        return;
    }
    
    const reclamacaoItem = document.querySelector(`.reclamacao-item[data-id="${id}"]`) || 
                           document.querySelector(`#reclamacao-${id}`);
    
    if (!reclamacaoItem) {
        mostrarToast('Erro ao encontrar a reclamação.', 'erro');
        return;
    }
    
    const formDiv = document.createElement('div');
    formDiv.id = `resposta-form-${id}`;
    formDiv.className = 'form-resposta-diretor';
    formDiv.innerHTML = `
        <h4 style="color:#2E7D32; margin-bottom:6px;">📝 Escreva sua resposta</h4>
        
        <div class="resposta-rapida-container">
            ${MENSAGENS_PADRAO.map(msg => 
                `<button class="btn-resposta-rapida" onclick="preencherRespostaRapida('${id}', '${msg.replace(/'/g, "\\'")}')">
                    ${msg.substring(0, 30)}${msg.length > 30 ? '...' : ''}
                </button>`
            ).join('')}
        </div>
        
        <label style="font-weight:600; font-size:13px; color:#4A3A2A; margin-top:6px;">Mensagem personalizada:</label>
        <textarea id="resposta-texto-${id}" placeholder="Digite sua resposta personalizada..."></textarea>
        
        <label style="font-weight:600; font-size:13px; color:#4A3A2A; margin-top:8px;">
            <span class="lampada-icon" style="display:inline-block; animation: lampadaBrilhoSuave 3.5s ease-in-out infinite; transform-origin:center; font-size:20px;">💡</span> 
            SOLUÇÃO PROPOSTA (opcional):
        </label>
        <textarea id="solucao-texto-${id}" placeholder="Descreva a solução que você propõe..." rows="2"></textarea>
        
        <label style="font-weight:600; font-size:13px; color:#4A3A2A; margin-top:8px;">📷 Fotos da solução (opcional):</label>
        <div class="upload-solucao">
            <input type="file" id="solucao-foto1-${id}" accept="image/*" />
            <input type="file" id="solucao-foto2-${id}" accept="image/*" />
            <input type="file" id="solucao-foto3-${id}" accept="image/*" />
        </div>
        <div class="preview-solucao" id="preview-solucao-${id}"></div>
        
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
            <button class="btn-enviar-resposta" onclick="enviarRespostaCompleta('${id}')">📨 Enviar Resposta</button>
            <button class="btn-cancelar-resposta" onclick="this.closest('.form-resposta-diretor').remove()">❌ Cancelar</button>
        </div>
    `;
    
    formDiv.querySelectorAll('.upload-solucao input[type="file"]').forEach((input, idx) => {
        input.addEventListener('change', function() {
            const previewContainer = document.getElementById(`preview-solucao-${id}`);
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.dataset.index = idx;
                    previewContainer.appendChild(img);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });
    
    const botoesContainer = reclamacaoItem.querySelector('.reclamacao-acoes-container') || reclamacaoItem;
    botoesContainer.appendChild(formDiv);
    formDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function preencherRespostaRapida(id, mensagem) {
    const textarea = document.getElementById(`resposta-texto-${id}`);
    if (textarea) {
        textarea.value = mensagem;
        textarea.focus();
        mostrarToast('📝 Mensagem rápida adicionada!', 'sucesso', 1500);
    }
}

function enviarRespostaCompleta(id) {
    const texto = document.getElementById(`resposta-texto-${id}`).value.trim();
    const solucao = document.getElementById(`solucao-texto-${id}`).value.trim();
    
    if (!texto) {
        mostrarToast('⚠️ Escreva uma mensagem de resposta.', 'erro');
        return;
    }
    
    const fotoInputs = [
        document.getElementById(`solucao-foto1-${id}`),
        document.getElementById(`solucao-foto2-${id}`),
        document.getElementById(`solucao-foto3-${id}`)
    ];
    
    const fotosPromises = fotoInputs.map((input) => {
        if (input && input.files && input.files[0]) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(input.files[0]);
            });
        }
        return Promise.resolve(null);
    });
    
    Promise.all(fotosPromises).then((fotosBase64) => {
        const fotos = fotosBase64.filter(f => f !== null);
        
        const respostaData = {
            texto: texto,
            solucao: solucao || null,
            fotosSolucao: fotos,
            autor: 'Diretor',
            data: new Date().toISOString()
        };
        
        const ref = database.ref(RECLAMACOES_REF + '/' + id);
        ref.once('value', (snapshot) => {
            const dados = snapshot.val();
            if (!dados) {
                mostrarToast('Reclamação não encontrada.', 'erro');
                return;
            }
            
            const respostas = dados.respostas || [];
            respostas.push(respostaData);
            
            ref.update({ respostas: respostas })
                .then(() => {
                    mostrarToast('✅ Resposta enviada com sucesso!', 'sucesso');
                    const form = document.getElementById(`resposta-form-${id}`);
                    if (form) form.remove();
                    carregarReclamacoes();
                })
                .catch((erro) => mostrarToast('❌ Erro ao enviar: ' + erro.message, 'erro'));
        });
    });
}

/* =========================
   CARREGAR RECLAMAÇÕES APROVADAS
========================= */
function carregarReclamacoes() {
    const container = document.getElementById('listaReclamacoes');
    if (!container) return;
    
    const ref = database.ref(RECLAMACOES_REF);

    ref.on('value', (snapshot) => {
        const dados = snapshot.val();
        container.innerHTML = '';

        if (!dados) {
            container.innerHTML = '<div class="sem-reclamacoes">Nenhuma reclamação aprovada ainda.</div>';
            return;
        }

        const items = Object.keys(dados).map(key => ({ id: key, ...dados[key] }))
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'reclamacao-item';
            div.dataset.id = item.id;
            div.id = `reclamacao-${item.id}`;

            const remetente = item.nome || 'Anônimo';
            const dataFormatada = item.data ? new Date(item.data).toLocaleString('pt-BR') : 'Data não disponível';

            let fotosHtml = '';
            if (item.fotos && item.fotos.length > 0) {
                fotosHtml = '<div class="reclamacao-fotos">';
                item.fotos.forEach(foto => {
                    fotosHtml += `<img src="${foto}" alt="Foto da reclamação" />`;
                });
                fotosHtml += '</div>';
            }

            let respostasHtml = '';
            let temSolucao = false;
            
            if (item.respostas && item.respostas.length > 0) {
                respostasHtml = '<div class="reclamacao-respostas">';
                item.respostas.forEach(resposta => {
                    if (resposta.solucao && resposta.solucao.trim() !== '') {
                        temSolucao = true;
                    }
                    
                    let fotosSolucaoHtml = '';
                    if (resposta.fotosSolucao && resposta.fotosSolucao.length > 0) {
                        fotosSolucaoHtml = '<div class="solucao-fotos">';
                        resposta.fotosSolucao.forEach(foto => {
                            fotosSolucaoHtml += `<img src="${foto}" alt="Foto da solução" />`;
                        });
                        fotosSolucaoHtml += '</div>';
                    }
                    
                    const solucaoHtml = resposta.solucao ? 
                        `<div class="diretor-solucao">
                            <span class="solucao-badge">
                                <span class="lampada-icon" style="display:inline-block; animation: lampadaBrilhoSuave 3.5s ease-in-out infinite; transform-origin:center; font-size:20px;">💡</span> 
                                SOLUÇÃO PROPOSTA
                            </span>
                            <div class="solucao-texto">${escaparHTML(resposta.solucao).replace(/\n/g, '<br>')}</div>
                            ${fotosSolucaoHtml}
                        </div>` : '';
                    
                    respostasHtml += `
                        <div class="diretor-responder-container">
                            <div class="diretor-header">
                                <div class="diretor-avatar">🎓</div>
                                <div class="diretor-info">
                                    <h4>${resposta.autor || 'Diretor'}</h4>
                                    <span>${formatarDataSimples(resposta.data)}</span>
                                </div>
                            </div>
                            <div class="diretor-mensagem">
                                <p>${escaparHTML(resposta.texto).replace(/\n/g, '<br>')}</p>
                            </div>
                            ${solucaoHtml}
                        </div>
                    `;
                });
                respostasHtml += '</div>';
            }

            const votosSim = item.votos?.sim || 0;
            const votosNao = item.votos?.nao || 0;
            const totalVotos = votosSim + votosNao;
            const percentualSim = totalVotos > 0 ? Math.round((votosSim / totalVotos) * 100) : 0;
            const percentualNao = totalVotos > 0 ? Math.round((votosNao / totalVotos) * 100) : 0;
            
            let usuarioId = localStorage.getItem('votacao_usuario_id');
            if (!usuarioId) {
                usuarioId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                localStorage.setItem('votacao_usuario_id', usuarioId);
            }
            const votoKey = usuarioId + '_' + item.id;
            const usuarioJaVotou = item.votosUsuarios && item.votosUsuarios.includes(votoKey);

            const votacaoHtml = `
                <div class="reclamacao-votacao ${temSolucao ? 'visivel' : ''}" style="${temSolucao ? 'display:block;' : 'display:none;'}">
                    <div class="votacao-pergunta">
                        <span class="icone-pergunta">🤔</span>
                        Você achou esta solução útil?
                    </div>
                    <div class="votos-botoes">
                        <button class="btn-votar btn-sim ${usuarioJaVotou ? 'votado' : ''}" onclick="votarSolucao('${item.id}', 'sim')">
                            👍 Sim (${votosSim})
                        </button>
                        <button class="btn-votar btn-nao ${usuarioJaVotou ? 'votado' : ''}" onclick="votarSolucao('${item.id}', 'nao')">
                            👎 Não (${votosNao})
                        </button>
                        <span class="votos-contador">📊 ${totalVotos} voto(s) total</span>
                    </div>
                    ${totalVotos > 0 ? `
                        <div class="votos-barra-container">
                            <div class="votos-barra">
                                <div class="barra-sim" style="width: ${percentualSim}%;"></div>
                            </div>
                            <div class="votos-legenda">
                                <span><span class="cor-sim">✅</span> Sim: ${percentualSim}% (${votosSim})</span>
                                <span><span class="cor-nao">❌</span> Não: ${percentualNao}% (${votosNao})</span>
                            </div>
                        </div>
                    ` : `
                        <div style="color: var(--text-light); font-size: 13px; margin-top: 6px;">
                            🗳️ Seja o primeiro a votar nesta solução!
                        </div>
                    `}
                </div>
            `;

            const btnResponder = (tipoUsuario === 'diretor') ? 
                `<button class="btn-responder-reclamacao" onclick="abrirResponder('${item.id}')">📝 Responder com solução</button>` : '';

            const btnExcluir = (usuarioLogado && (tipoUsuario === 'admin' || tipoUsuario === 'diretor')) ? 
                `<button class="btn-excluir-reclamacao" onclick="excluirReclamacaoPublica('${item.id}')">🗑️ Excluir</button>` : '';

            div.innerHTML = `
                <div class="reclamacao-titulo">${escaparHTML(item.titulo)}</div>
                <div class="reclamacao-remetente">👤 ${escaparHTML(remetente)}</div>
                <div class="reclamacao-texto">${escaparHTML(item.texto).replace(/\n/g, '<br>')}</div>
                ${fotosHtml}
                ${respostasHtml}
                ${votacaoHtml}
                <div class="reclamacao-data">📅 ${dataFormatada}</div>
                <div class="reclamacao-acoes-container">
                    ${btnResponder}
                    ${btnExcluir}
                </div>
            `;
            container.appendChild(div);
        });

        if (usuarioLogado) {
            if (tipoUsuario === 'admin' || tipoUsuario === 'diretor') {
                document.querySelectorAll('.btn-excluir-reclamacao').forEach(btn => btn.style.display = 'inline-block');
            }
            if (tipoUsuario === 'diretor') {
                document.querySelectorAll('.btn-responder-reclamacao').forEach(btn => btn.style.display = 'inline-block');
            }
        }
    }, (erro) => {
        container.innerHTML = '<div class="sem-reclamacoes">Erro ao carregar reclamações.</div>';
    });
}

/* =========================
   VOTAÇÃO DA SOLUÇÃO
========================= */
function votarSolucao(id, voto) {
    const ref = database.ref(RECLAMACOES_REF + '/' + id);
    ref.once('value', (snapshot) => {
        const dados = snapshot.val();
        if (!dados) {
            mostrarToast('Reclamação não encontrada.', 'erro');
            return;
        }
        
        const temSolucao = dados.respostas && dados.respostas.some(r => r.solucao && r.solucao.trim() !== '');
        if (!temSolucao) {
            mostrarToast('⚠️ Ainda não há uma solução para votar.', 'alerta');
            return;
        }
        
        const votos = dados.votos || { sim: 0, nao: 0 };
        const votosUsuarios = dados.votosUsuarios || [];
        
        let usuarioId = localStorage.getItem('votacao_usuario_id');
        if (!usuarioId) {
            usuarioId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('votacao_usuario_id', usuarioId);
        }
        
        const votoKey = usuarioId + '_' + id;
        
        if (votosUsuarios.includes(votoKey)) {
            mostrarToast('⚠️ Você já votou nesta solução.', 'alerta');
            return;
        }
        
        votos[voto] = (votos[voto] || 0) + 1;
        votosUsuarios.push(votoKey);
        
        ref.update({ votos: votos, votosUsuarios: votosUsuarios })
            .then(() => {
                const mensagem = voto === 'sim' 
                    ? '✅ Você votou SIM! A solução foi útil para você.' 
                    : '👎 Você votou NÃO! A solução não foi útil para você.';
                mostrarToast(mensagem, 'sucesso');
                carregarReclamacoes();
            })
            .catch((erro) => mostrarToast('❌ Erro ao votar: ' + erro.message, 'erro'));
    });
}

/* =========================
   RÁDIO - FUNÇÕES ATUALIZADAS
========================= */

function abrirJanelaRadio() {
    document.getElementById('janelaRadio').classList.add('mostrar');
    document.body.style.overflow = 'hidden';
    
    trocarAbaRadio('pedir');
    renderizarCalendario();
    carregarTabelaStatus();

    if (usuarioLogado) {
        document.getElementById('adminProgramacao').style.display = 'block';
    } else {
        document.getElementById('adminProgramacao').style.display = 'none';
    }
    fecharFormMusica();
}

function fecharJanelaRadio() {
    document.getElementById('janelaRadio').classList.remove('mostrar');
    document.body.style.overflow = '';
    fecharFormMusica();
}

function trocarAbaRadio(abaId) {
    document.querySelectorAll('.aba-radio-btn').forEach(btn => btn.classList.remove('ativa'));
    document.querySelectorAll('.aba-radio-conteudo').forEach(c => c.style.display = 'none');
    
    const btnAtivo = document.querySelector(`.aba-radio-btn[data-aba="${abaId}"]`);
    if (btnAtivo) btnAtivo.classList.add('ativa');
    
    const conteudo = document.getElementById(`aba-radio-${abaId}`);
    if (conteudo) conteudo.style.display = 'block';

    if (abaId === 'programacao') {
        renderizarCalendario();
    } else if (abaId === 'status') {
        carregarTabelaStatus();
    }
}

function selecionarTipoMusica(tipo) {
    const formNormal = document.getElementById('formMusicaNormal');
    const formDedicatoria = document.getElementById('formDedicatoria');
    
    if (tipo === 'normal') {
        formNormal.style.display = 'block';
        formDedicatoria.style.display = 'none';
    } else if (tipo === 'dedicatoria') {
        formNormal.style.display = 'none';
        formDedicatoria.style.display = 'block';
    }
}

function abrirFormMusica() {
    const container = document.getElementById('formMusicaContainer');
    if (container.style.display === 'block') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        document.getElementById('tipoMusicaOpcoes').style.display = 'grid';
        document.getElementById('formMusicaNormal').style.display = 'none';
        document.getElementById('formDedicatoria').style.display = 'none';
        document.querySelectorAll('input[name="tipoMusica"]').forEach(r => r.checked = false);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('msgRadio').textContent = '';
        document.getElementById('msgRadio').className = 'msg-radio';
    }
}

function fecharFormMusica() {
    const container = document.getElementById('formMusicaContainer');
    if (container) container.style.display = 'none';
    const campos = [
        'musicaNormalNome', 'musicaNormalSolicitante', 'musicaNormalSerie',
        'dedicatoriaMusica', 'dedicatoriaPara', 'dedicatoriaSerieRecebe',
        'dedicatoriaSolicitante', 'dedicatoriaSerieSolicitante', 'dedicatoriaMensagem'
    ];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const msg = document.getElementById('msgRadio');
    if (msg) {
        msg.textContent = '';
        msg.className = 'msg-radio';
    }
}

function enviarMusicaNormal() {
    const musica = document.getElementById('musicaNormalNome').value.trim();
    const solicitante = document.getElementById('musicaNormalSolicitante').value.trim();
    const serie = document.getElementById('musicaNormalSerie').value;
    const msgDiv = document.getElementById('msgRadio');

    if (!musica || !solicitante || !serie) {
        msgDiv.textContent = '⚠️ Preencha todos os campos obrigatórios.';
        msgDiv.className = 'msg-radio erro';
        return;
    }

    const dados = {
        tipo: 'normal',
        musica: musica,
        solicitante: solicitante,
        serieSolicitante: serie,
        data: new Date().toISOString(),
        status: 'pendente'
    };

    // 🤖 Classificação automática
    const classificacao = classificarMusicaAutomaticamente(dados);
    dados.classificacao = classificacao.classificacao;
    dados.alerta = classificacao.alerta;
    dados.motivoClassificacao = classificacao.motivo;

    database.ref(RADIO_MUSICAS_REF).push(dados)
        .then(() => {
            if (dados.alerta) {
                msgDiv.textContent = '⚠️ Esta música foi marcada automaticamente como NÃO RECOMENDADA. Aguarde a moderação.';
                msgDiv.className = 'msg-radio alerta';
                mostrarToast('⚠️ Música enviada para moderação (alerta automático).', 'alerta');
            } else if (dados.classificacao === 'suave') {
                msgDiv.textContent = '🎵 Música suave identificada! Aguarde a aprovação.';
                msgDiv.className = 'msg-radio sucesso';
                mostrarToast('🎵 Música suave enviada!', 'sucesso');
            } else {
                msgDiv.textContent = '✅ Música pedida com sucesso! Aguarde a programação.';
                msgDiv.className = 'msg-radio sucesso';
                mostrarToast('🎵 Música enviada para a programação!', 'sucesso');
            }
            
            fecharFormMusica();
            carregarTabelaStatus();
            setTimeout(() => { msgDiv.textContent = ''; msgDiv.className = 'msg-radio'; }, 5000);
        })
        .catch((erro) => {
            msgDiv.textContent = '❌ Erro ao enviar: ' + erro.message;
            msgDiv.className = 'msg-radio erro';
            mostrarToast('Erro ao enviar música.', 'erro');
        });
}

function enviarDedicatoria() {
    const musica = document.getElementById('dedicatoriaMusica').value.trim();
    const para = document.getElementById('dedicatoriaPara').value.trim();
    const serieRecebe = document.getElementById('dedicatoriaSerieRecebe').value;
    const solicitante = document.getElementById('dedicatoriaSolicitante').value.trim();
    const serieSolicitante = document.getElementById('dedicatoriaSerieSolicitante').value;
    const mensagem = document.getElementById('dedicatoriaMensagem').value.trim();
    const msgDiv = document.getElementById('msgRadio');

    if (!musica || !para || !serieRecebe || !solicitante || !serieSolicitante) {
        msgDiv.textContent = '⚠️ Preencha todos os campos obrigatórios.';
        msgDiv.className = 'msg-radio erro';
        return;
    }

    const dados = {
        tipo: 'dedicatoria',
        musica: musica,
        para: para,
        serieRecebe: serieRecebe,
        solicitante: solicitante,
        serieSolicitante: serieSolicitante,
        mensagem: mensagem || '',
        data: new Date().toISOString(),
        status: 'pendente'
    };

    // 🤖 Classificação automática
    const classificacao = classificarMusicaAutomaticamente(dados);
    dados.classificacao = classificacao.classificacao;
    dados.alerta = classificacao.alerta;
    dados.motivoClassificacao = classificacao.motivo;

    database.ref(RADIO_MUSICAS_REF).push(dados)
        .then(() => {
            if (dados.alerta) {
                msgDiv.textContent = '⚠️ Esta dedicatória contém termos não recomendados. Aguarde a moderação.';
                msgDiv.className = 'msg-radio alerta';
                mostrarToast('⚠️ Dedicatória enviada para moderação.', 'alerta');
            } else {
                msgDiv.textContent = '💌 Dedicatória enviada com sucesso! Aguarde a programação.';
                msgDiv.className = 'msg-radio sucesso';
                mostrarToast('💌 Dedicatória enviada!', 'sucesso');
            }
            
            fecharFormMusica();
            carregarTabelaStatus();
            setTimeout(() => { msgDiv.textContent = ''; msgDiv.className = 'msg-radio'; }, 5000);
        })
        .catch((erro) => {
            msgDiv.textContent = '❌ Erro ao enviar: ' + erro.message;
            msgDiv.className = 'msg-radio erro';
            mostrarToast('Erro ao enviar dedicatória.', 'erro');
        });
}

/* =========================
   CALENDÁRIO
========================= */
function renderizarCalendario() {
    const grid = document.getElementById('calendarioGrid');
    const mesAnoTexto = document.getElementById('mesAnoAtual');
    if (!grid || !mesAnoTexto) return;

    const ano = dataCalendarioAtual.getFullYear();
    const mes = dataCalendarioAtual.getMonth();
    
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    mesAnoTexto.textContent = `${nomesMeses[mes]} ${ano}`;

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    grid.innerHTML = '';

    for (let i = 0; i < primeiroDia; i++) {
        const div = document.createElement('div');
        div.className = 'dia-calendario vazio';
        grid.appendChild(div);
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const div = document.createElement('div');
        div.className = 'dia-calendario';
        div.dataset.dia = dia;
        div.dataset.mes = mes;
        div.dataset.ano = ano;
        
        const numero = document.createElement('span');
        numero.className = 'numero-dia';
        numero.textContent = dia;
        div.appendChild(numero);

        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        database.ref(RADIO_PROGRAMACAO_REF + '/' + dataStr).once('value', (snapshot) => {
            const musicas = snapshot.val();
            if (musicas && musicas.length > 0) {
                const indicador = document.createElement('span');
                indicador.className = 'indicador-musicas';
                indicador.textContent = `${musicas.length} 🎵`;
                div.appendChild(indicador);
                
                const temAlerta = musicas.some(m => m.alerta);
                if (temAlerta) {
                    const alertaIcon = document.createElement('span');
                    alertaIcon.className = 'alerta-dia';
                    alertaIcon.textContent = '⚠️';
                    div.appendChild(alertaIcon);
                }
            }
        });

        div.onclick = () => selecionarDiaCalendario(ano, mes, dia, div);
        grid.appendChild(div);
    }
}

function mudarMes(delta) {
    dataCalendarioAtual.setMonth(dataCalendarioAtual.getMonth() + delta);
    renderizarCalendario();
    document.getElementById('detalhesDia').style.display = 'none';
}

function selecionarDiaCalendario(ano, mes, dia, elemento) {
    document.querySelectorAll('.dia-calendario').forEach(el => el.classList.remove('selecionado'));
    if (elemento) elemento.classList.add('selecionado');

    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const detalhesDiv = document.getElementById('detalhesDia');
    const tituloDetalhe = document.getElementById('tituloDiaDetalhe');
    const listaMusicas = document.getElementById('listaMusicasDia');
    
    detalhesDiv.style.display = 'block';
    tituloDetalhe.textContent = `📅 Programação de ${dia}/${mes + 1}/${ano}`;
    listaMusicas.innerHTML = '<div class="sem-musicas">Carregando...</div>';

    database.ref(RADIO_PROGRAMACAO_REF + '/' + dataStr).once('value', (snapshot) => {
        const musicas = snapshot.val();
        listaMusicas.innerHTML = '';

        if (!musicas || musicas.length === 0) {
            listaMusicas.innerHTML = '<div class="sem-musicas">Nenhuma música programada para este dia.</div>';
            return;
        }

        musicas.forEach((musica, index) => {
            const div = document.createElement('div');
            div.className = 'musica-item';
            if (musica.alerta) div.classList.add('alerta-musica');

            const isDedicatoria = musica.tipo === 'dedicatoria';
            const badge = isDedicatoria ? '💌 Dedicatória' : '🎵 Música';
            
            let infoExtra = '';
            if (isDedicatoria) {
                infoExtra = `<div class="musica-detalhe">Para: ${escaparHTML(musica.para)} (${escaparHTML(musica.serieRecebe)})</div>`;
            }

            const btnRemover = usuarioLogado ? 
                `<button class="btn-remover-musica" onclick="removerMusicaProgramacao('${dataStr}', ${index})">🗑️ Remover</button>` : '';

            div.innerHTML = `
                <div class="musica-info">
                    <div class="musica-titulo">${escaparHTML(musica.musica)} <span class="musica-badge ${isDedicatoria ? 'dedicatoria' : ''}">${badge}</span> ${musica.alerta ? '⚠️' : ''}</div>
                    <div class="musica-detalhe">🎤 ${escaparHTML(musica.solicitante)} (${escaparHTML(musica.serieSolicitante)})</div>
                    ${infoExtra}
                </div>
                ${btnRemover}
            `;
            listaMusicas.appendChild(div);
        });
    });
}

function removerMusicaProgramacao(dataStr, index) {
    if (!usuarioLogado) {
        mostrarToast('🔐 Faça login para remover.', 'erro');
        return;
    }
    if (!confirm('🗑️ Remover esta música da programação?')) return;

    const ref = database.ref(RADIO_PROGRAMACAO_REF + '/' + dataStr);
    ref.once('value', (snap) => {
        const musicas = snap.val() || [];
        musicas.splice(index, 1);
        ref.set(musicas)
            .then(() => {
                mostrarToast('🗑️ Música removida da programação.', 'sucesso');
                renderizarCalendario();
                const diaSel = document.querySelector('.dia-calendario.selecionado');
                if (diaSel) {
                    selecionarDiaCalendario(diaSel.dataset.ano, diaSel.dataset.mes, diaSel.dataset.dia, diaSel);
                }
            })
            .catch((erro) => mostrarToast('Erro: ' + erro.message, 'erro'));
    });
}

/* =========================
   TABELA DE STATUS
========================= */
function carregarTabelaStatus() {
    const tbody = document.getElementById('tabelaStatusCorpo');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

    database.ref(RADIO_MUSICAS_REF).on('value', (snapshot) => {
        const dados = snapshot.val();
        tbody.innerHTML = '';

        if (!dados) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum pedido recente.</td></tr>';
            return;
        }

        const items = Object.keys(dados).map(key => ({ id: key, ...dados[key] }))
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        items.forEach(item => {
            const tr = document.createElement('tr');
            
            let statusClass = 'status-pendente';
            let statusText = 'Pendente';
            
            if (item.status === 'aprovada') {
                statusClass = 'status-aprovada';
                statusText = 'Aprovada';
            } else if (item.status === 'negada') {
                statusClass = 'status-negada';
                statusText = 'Negada';
            }

            // 🤖 Mostrar classificação automática
            let classificacaoHtml = '';
            if (item.classificacao === 'suave') {
                classificacaoHtml = '<br><span style="font-size:11px; color:#2E7D32;">🎵 Suave</span>';
            } else if (item.classificacao === 'nao_recomendada') {
                classificacaoHtml = '<br><span style="font-size:11px; color:#C62828;">⚠️ Não recomendada</span>';
            } else if (item.classificacao === 'neutra') {
                classificacaoHtml = '<br><span style="font-size:11px; color:#7a7a9a;">🔘 Neutra</span>';
            }

            let acoesHtml = '';
            if (usuarioLogado) {
                if (item.status !== 'aprovada') {
                    acoesHtml += `<button class="btn-acao-tabela btn-aprovar" onclick="alterarStatusMusica('${item.id}', 'aprovada')">✅ Aprovar</button>`;
                }
                if (item.status !== 'negada') {
                    acoesHtml += `<button class="btn-acao-tabela btn-negado" onclick="alterarStatusMusica('${item.id}', 'negada')">❌ Negar</button>`;
                }
                acoesHtml += `<button class="btn-acao-tabela btn-alerta" onclick="toggleAlertaMusica('${item.id}')">${item.alerta ? '✅ Remover Alerta' : '⚠️ Alerta'}</button>`;
            }

            tr.innerHTML = `
                <td>${escaparHTML(item.musica)} ${item.alerta ? '⚠️' : ''}${classificacaoHtml}</td>
                <td>${escaparHTML(item.solicitante)}</td>
                <td>${formatarDataSimples(item.data)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${acoesHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function alterarStatusMusica(id, novoStatus) {
    if (!usuarioLogado) return;
    database.ref(RADIO_MUSICAS_REF + '/' + id).update({ status: novoStatus })
        .then(() => {
            mostrarToast(`✅ Status alterado para ${novoStatus}.`, 'sucesso');
            carregarTabelaStatus();
        })
        .catch(err => mostrarToast('Erro: ' + err.message, 'erro'));
}

function toggleAlertaMusica(id) {
    if (!usuarioLogado) return;
    database.ref(RADIO_MUSICAS_REF + '/' + id).once('value', (snap) => {
        const musica = snap.val();
        if (musica) {
            database.ref(RADIO_MUSICAS_REF + '/' + id).update({ alerta: !musica.alerta })
                .then(() => {
                    mostrarToast(`⚠️ Alerta ${!musica.alerta ? 'ativado' : 'removido'}.`, 'sucesso');
                    carregarTabelaStatus();
                });
        }
    });
}

/* =========================
   PROGRAMAÇÃO AUTOMÁTICA
========================= */
function gerarProgramacaoAutomatica() {
    if (!usuarioLogado) {
        mostrarToast('🔐 Faça login para gerar a programação.', 'erro');
        return;
    }

    if (!confirm('🔄 Gerar programação automática?\n\nIsso vai distribuir as músicas aprovadas na semana, garantindo no máximo 5 por dia e pelo menos 1 dedicatória por dia.')) return;

    database.ref(RADIO_MUSICAS_REF).once('value', (snap) => {
        const dados = snap.val();
        if (!dados) {
            mostrarToast('📭 Nenhuma música aprovada para programar.', 'alerta');
            return;
        }

        const todasMusicas = Object.keys(dados).map(key => ({ id: key, ...dados[key] }));
        const aprovadas = todasMusicas.filter(m => m.status === 'aprovada' && !m.alerta);
        
        if (aprovadas.length === 0) {
            mostrarToast('📭 Nenhuma música aprovada e sem alerta para programar.', 'alerta');
            return;
        }

        const dedicatorias = aprovadas.filter(m => m.tipo === 'dedicatoria');
        const normais = aprovadas.filter(m => m.tipo === 'normal');

        const programacao = {};
        const hoje = new Date();
        
        for (let i = 0; i < 7; i++) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() + i);
            const dataStr = data.toISOString().split('T')[0];
            programacao[dataStr] = [];
        }

        const diasDisponiveis = Object.keys(programacao);
        
        let dedIndex = 0;
        diasDisponiveis.forEach(dia => {
            if (dedIndex < dedicatorias.length && programacao[dia].length < 5) {
                programacao[dia].push(dedicatorias[dedIndex]);
                dedIndex++;
            }
        });

        const restantes = [...dedicatorias.slice(dedIndex), ...normais];
        let restIndex = 0;
        
        diasDisponiveis.forEach(dia => {
            while (programacao[dia].length < 5 && restIndex < restantes.length) {
                programacao[dia].push(restantes[restIndex]);
                restIndex++;
            }
        });

        database.ref(RADIO_PROGRAMACAO_REF).set(programacao)
            .then(() => {
                mostrarToast('✅ Programação automática gerada!', 'sucesso');
                renderizarCalendario();
            })
            .catch((erro) => {
                mostrarToast('❌ Erro ao gerar programação: ' + erro.message, 'erro');
            });
    });
}

function limparProgramacao() {
    if (!usuarioLogado) {
        mostrarToast('🔐 Faça login para limpar.', 'erro');
        return;
    }
    if (!confirm('⚠️ Tem certeza que deseja limpar TODA a programação?')) return;

    database.ref(RADIO_PROGRAMACAO_REF).remove()
        .then(() => {
            mostrarToast('🗑️ Programação limpa!', 'sucesso');
            renderizarCalendario();
        })
        .catch((erro) => mostrarToast('Erro: ' + erro.message, 'erro'));
}

/* =========================
   GERAÇÃO DE NOTÍCIA COM IA
========================= */
async function gerarNoticiaComIA() {
    const informacoes = document.getElementById('iaInformacoes').value.trim();
    const tags = document.getElementById('iaTags').value.trim();
    const tom = document.getElementById('iaTom').value;
    const msgDiv = document.getElementById('msgIA');
    const btn = document.getElementById('btnGerarIA');

    if (!informacoes || informacoes.length < 20) {
        msgDiv.textContent = '⚠️ Forneça informações mais detalhadas (mínimo 20 caracteres).';
        msgDiv.className = 'msg-ia erro';
        return;
    }

    btn.disabled = true;
    btn.classList.add('carregando');
    btn.textContent = '⏳ A IA está escrevendo...';
    msgDiv.textContent = '🤖 Gerando notícia, aguarde alguns segundos...';
    msgDiv.className = 'msg-ia info';

    try {
        const resp = await fetch(`${SECURITY_API_URL}/api/ai/generate-news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'token_secreto_admin'
            },
            body: JSON.stringify({ informacoes, tags, tom })
        });

        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.error || 'Erro ao gerar notícia');
        }

        document.getElementById('tituloNoticia').value = data.titulo;
        document.getElementById('textoNoticia').value = data.texto;

        msgDiv.textContent = '✅ Notícia gerada com sucesso! Revise e ajuste antes de publicar.';
        msgDiv.className = 'msg-ia sucesso';

        document.getElementById('tituloNoticia').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });

        mostrarToast('🤖 Notícia gerada pela IA!', 'sucesso');

    } catch (err) {
        console.error('Erro:', err);
        msgDiv.textContent = '❌ ' + err.message;
        msgDiv.className = 'msg-ia erro';
        mostrarToast('Erro ao gerar notícia.', 'erro');
    } finally {
        btn.disabled = false;
        btn.classList.remove('carregando');
        btn.textContent = '✨ Gerar Notícia com IA';
    }
}

/* =========================
   JANELA SETEMBRO AMARELO
========================= */
function abrirJanelaSetembro() {
    const janela = document.getElementById('janelaSetembroAmarelo');
    janela.classList.add('mostrar');
    document.body.style.overflow = 'hidden';
    trocarAba('sobre');
}

function fecharJanelaSetembro() {
    const janela = document.getElementById('janelaSetembroAmarelo');
    janela.classList.remove('mostrar');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharJanelaSetembro();
    }
});

function trocarAba(abaId) {
    document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));
    document.querySelectorAll('.aba-conteudo').forEach(conteudo => conteudo.style.display = 'none');
    const btnAtivo = document.querySelector(`.aba-btn[data-aba="${abaId}"]`);
    if (btnAtivo) btnAtivo.classList.add('ativa');
    const conteudoAtivo = document.getElementById(`aba-${abaId}`);
    if (conteudoAtivo) {
        conteudoAtivo.style.display = 'block';
        conteudoAtivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/* =========================
   FAQ
========================= */
function toggleFaq(botao) {
    const resposta = botao.nextElementSibling;
    const estaAberta = resposta.classList.contains('aberta');
    document.querySelectorAll('.faq-resposta').forEach(r => r.classList.remove('aberta'));
    if (!estaAberta) resposta.classList.add('aberta');
}

/* =========================
   DEPOIMENTOS
========================= */
function enviarDepoimento() {
    const nome = document.getElementById('nomeDepoimento').value.trim() || 'Anônimo';
    const texto = document.getElementById('textoDepoimento').value.trim();
    const msgDiv = document.getElementById('msgDepoimento');
    
    if (!texto) {
        msgDiv.textContent = '⚠️ Escreva seu depoimento.';
        msgDiv.style.color = 'var(--error-text)';
        return;
    }
    
    const dados = {
        nome: nome,
        texto: texto,
        data: new Date().toISOString(),
        tipo: 'depoimento'
    };
    
    database.ref(MENSAGENS_REF).push(dados)
        .then(() => {
            document.getElementById('textoDepoimento').value = '';
            document.getElementById('nomeDepoimento').value = '';
            msgDiv.textContent = '✅ Depoimento enviado! Obrigado por compartilhar.';
            msgDiv.style.color = 'var(--success-text)';
            mostrarToast('💛 Depoimento enviado com sucesso!', 'sucesso');
            setTimeout(() => { msgDiv.textContent = ''; }, 5000);
        })
        .catch((erro) => {
            msgDiv.textContent = '❌ Erro ao enviar: ' + erro.message;
            msgDiv.style.color = 'var(--error-text)';
        });
}

/* =========================
   ANIMAÇÃO DE FLORES
========================= */
function criarFloresDeFundo() {
    const container = document.getElementById('floresContainer');
    if (!container) return;
    
    const floresEmojis = ['🌸', '🌺', '🪻', '🌹', '🏵️', '🌻', '🌼', '🌸', '🌸', '🌺','❤️'];
    const cores = ['cor-1', 'cor-2', 'cor-3', 'cor-4', 'cor-5', 'cor-6', 'cor-7', 'cor-8', 'cor-9', 'cor-10'];
    const tamanhos = ['tamanho-p', 'tamanho-m', 'tamanho-g', 'tamanho-m', 'tamanho-p'];
    const rotacoes = ['rotacao-1', 'rotacao-2', 'rotacao-3', 'rotacao-4', 'rotacao-5', 'rotacao-6', 'rotacao-7', 'rotacao-8'];
    
    const quantidadeFlores = window.innerWidth < 768 ? 18 : 35;
    const duracaoMin = 18;
    const duracaoMax = 38;
    const delayMax = 30;
    
    for (let i = 0; i < quantidadeFlores; i++) {
        const flor = document.createElement('span');
        flor.className = 'flor';
        const emojiIndex = Math.floor(Math.random() * floresEmojis.length);
        flor.textContent = floresEmojis[emojiIndex];
        const corIndex = Math.floor(Math.random() * cores.length);
        const tamanhoIndex = Math.floor(Math.random() * tamanhos.length);
        const rotacaoIndex = Math.floor(Math.random() * rotacoes.length);
        flor.classList.add(cores[corIndex]);
        flor.classList.add(tamanhos[tamanhoIndex]);
        flor.classList.add(rotacoes[rotacaoIndex]);
        flor.style.left = (Math.random() * 100) + '%';
        flor.style.animationDuration = (duracaoMin + Math.random() * (duracaoMax - duracaoMin)) + 's';
        flor.style.animationDelay = (Math.random() * delayMax) + 's';
        if (Math.random() > 0.5) flor.classList.add('com-vento');
        flor.style.opacity = '0';
        container.appendChild(flor);
    }
    
    for (let i = 0; i < 6; i++) {
        const flor = document.createElement('span');
        flor.className = 'flor tamanho-g cor-3';
        flor.textContent = '🌸';
        flor.style.left = Math.random() * 100 + '%';
        flor.style.animationDuration = (25 + Math.random() * 15) + 's';
        flor.style.animationDelay = (Math.random() * 35) + 's';
        flor.style.opacity = '0';
        flor.classList.add('rotacao-1');
        if (Math.random() > 0.5) flor.classList.add('com-vento');
        container.appendChild(flor);
    }
}

/* =========================
   PERSONALIZAÇÃO
========================= */
let configPersonalizacao = {
 cores: {
     primaria: '#F5C518',
     secundaria: '#D4A017',
     fundo: '#f4f6f9',
     texto: '#1e1e2f'
 },
 emojis: ['🌸', '🌺', '🌷', '🌹', '💐', '🌻', '🌼'],
 qtdEmojis: 35,
 velEmojis: 25,
 layout: {
     ordem: ['areaNoticias', 'setembroamarelo', 'contato'],
     espacamento: 30
 },
 fontes: {
     titulo: "'Inter', sans-serif",
     tamanhoTitulo: 32,
     tamanhoTexto: 17
 }
};

function abrirPersonalizacao() {
 if (!usuarioLogado) {
     mostrarToast('🔐 Faça login para personalizar o site.', 'erro');
     abrirLoginAdmin();
     return;
 }
 document.getElementById('janelaPersonalizacao').classList.add('mostrar');
 document.body.style.overflow = 'hidden';
 carregarConfiguracoesAtuais();
}

function fecharPersonalizacao() {
 document.getElementById('janelaPersonalizacao').classList.remove('mostrar');
 document.body.style.overflow = '';
}

function trocarAbaPersonalizacao(abaId) {
 document.querySelectorAll('.aba-personalizacao').forEach(btn => btn.classList.remove('ativa'));
 document.querySelectorAll('.conteudo-personalizacao').forEach(conteudo => conteudo.style.display = 'none');
 const btnAtivo = document.querySelector(`.aba-personalizacao[data-aba="${abaId}"]`);
 if (btnAtivo) btnAtivo.classList.add('ativa');
 const conteudoAtivo = document.getElementById(`aba-${abaId}`);
 if (conteudoAtivo) conteudoAtivo.style.display = 'block';
}

function carregarConfiguracoesAtuais() {
 const root = document.documentElement;
 const styles = getComputedStyle(root);
 document.getElementById('corPrimaria').value = styles.getPropertyValue('--cor-primaria').trim() || '#F5C518';
 document.getElementById('corSecundaria').value = styles.getPropertyValue('--cor-primaria-escura').trim() || '#D4A017';
 document.getElementById('corFundo').value = styles.getPropertyValue('--bg-primary').trim() || '#f4f6f9';
 document.getElementById('corTexto').value = styles.getPropertyValue('--text-primary').trim() || '#1e1e2f';
 
 const savedEmojis = localStorage.getItem('emojisPersonalizados');
 if (savedEmojis) {
     const emojis = JSON.parse(savedEmojis);
     document.querySelectorAll('.emoji-check').forEach(cb => {
         cb.checked = emojis.includes(cb.value);
     });
 }
 
 const savedQtd = localStorage.getItem('qtdEmojisPersonalizados');
 if (savedQtd) {
     document.getElementById('qtdEmojis').value = savedQtd;
     document.getElementById('qtdEmojisDisplay').textContent = savedQtd;
 }
 const savedVel = localStorage.getItem('velEmojisPersonalizados');
 if (savedVel) {
     document.getElementById('velEmojis').value = savedVel;
     document.getElementById('velEmojisDisplay').textContent = savedVel + 's';
 }
 
 const savedFonte = localStorage.getItem('fonteTituloPersonalizada');
 if (savedFonte) document.getElementById('fonteTitulo').value = savedFonte;
 const savedTamTitulo = localStorage.getItem('tamanhoTituloPersonalizado');
 if (savedTamTitulo) {
     document.getElementById('tamanhoTitulo').value = savedTamTitulo;
     document.getElementById('tamanhoTituloDisplay').textContent = savedTamTitulo + 'px';
 }
 const savedTamTexto = localStorage.getItem('tamanhoTextoPersonalizado');
 if (savedTamTexto) {
     document.getElementById('tamanhoTexto').value = savedTamTexto;
     document.getElementById('tamanhoTextoDisplay').textContent = savedTamTexto + 'px';
 }
 
 const savedEspacamento = localStorage.getItem('espacamentoPersonalizado');
 if (savedEspacamento) {
     document.getElementById('espacamento').value = savedEspacamento;
     document.getElementById('espacamentoDisplay').textContent = savedEspacamento + 'px';
 }
}

function aplicarCores() {
 const primaria = document.getElementById('corPrimaria').value;
 const secundaria = document.getElementById('corSecundaria').value;
 const fundo = document.getElementById('corFundo').value;
 const texto = document.getElementById('corTexto').value;
 
 const root = document.documentElement;
 root.style.setProperty('--cor-primaria', primaria);
 root.style.setProperty('--cor-primaria-escura', secundaria);
 root.style.setProperty('--bg-primary', fundo);
 root.style.setProperty('--text-primary', texto);
 
 localStorage.setItem('corPrimariaPersonalizada', primaria);
 localStorage.setItem('corSecundariaPersonalizada', secundaria);
 localStorage.setItem('corFundoPersonalizada', fundo);
 localStorage.setItem('corTextoPersonalizada', texto);
 
 mostrarToast('✅ Cores aplicadas com sucesso!', 'sucesso');
}

function aplicarEmojis() {
 const checks = document.querySelectorAll('.emoji-check:checked');
 const emojis = Array.from(checks).map(cb => cb.value);
 
 if (emojis.length === 0) {
     mostrarToast('⚠️ Selecione pelo menos um emoji.', 'erro');
     return;
 }
 
 const qtd = document.getElementById('qtdEmojis').value;
 const vel = document.getElementById('velEmojis').value;
 
 localStorage.setItem('emojisPersonalizados', JSON.stringify(emojis));
 localStorage.setItem('qtdEmojisPersonalizados', qtd);
 localStorage.setItem('velEmojisPersonalizados', vel);
 
 const container = document.getElementById('floresContainer');
 if (container) {
     container.innerHTML = '';
     criarFloresDeFundoPersonalizadas(emojis, parseInt(qtd), parseInt(vel));
 }
 
 mostrarToast(`✅ ${emojis.length} emojis aplicados!`, 'sucesso');
}

function criarFloresDeFundoPersonalizadas(emojis, qtd, vel) {
 const container = document.getElementById('floresContainer');
 if (!container) return;
 
 const cores = ['cor-1', 'cor-2', 'cor-3', 'cor-4', 'cor-5', 'cor-6', 'cor-7', 'cor-8', 'cor-9', 'cor-10'];
 const tamanhos = ['tamanho-p', 'tamanho-m', 'tamanho-g'];
 const rotacoes = ['rotacao-1', 'rotacao-2', 'rotacao-3', 'rotacao-4', 'rotacao-5', 'rotacao-6', 'rotacao-7', 'rotacao-8'];
 
 const duracaoMin = vel - 10;
 const duracaoMax = vel + 15;
 const delayMax = 30;
 
 for (let i = 0; i < qtd; i++) {
     const flor = document.createElement('span');
     flor.className = 'flor';
     const emojiIndex = Math.floor(Math.random() * emojis.length);
     flor.textContent = emojis[emojiIndex];
     const corIndex = Math.floor(Math.random() * cores.length);
     const tamanhoIndex = Math.floor(Math.random() * tamanhos.length);
     const rotacaoIndex = Math.floor(Math.random() * rotacoes.length);
     flor.classList.add(cores[corIndex]);
     flor.classList.add(tamanhos[tamanhoIndex]);
     flor.classList.add(rotacoes[rotacaoIndex]);
     flor.style.left = (Math.random() * 100) + '%';
     flor.style.animationDuration = (duracaoMin + Math.random() * (duracaoMax - duracaoMin)) + 's';
     flor.style.animationDelay = (Math.random() * delayMax) + 's';
     if (Math.random() > 0.5) flor.classList.add('com-vento');
     flor.style.opacity = '0';
     container.appendChild(flor);
 }
}

function aplicarFontes() {
 const fonte = document.getElementById('fonteTitulo').value;
 const tamTitulo = document.getElementById('tamanhoTitulo').value;
 const tamTexto = document.getElementById('tamanhoTexto').value;
 
 document.documentElement.style.setProperty('--font-family', fonte);
 const h1 = document.querySelector('header h1');
 if (h1) h1.style.fontSize = tamTitulo + 'px';
 document.querySelectorAll('.noticia-resumo, .reclamacao-texto, .mensagem-texto').forEach(el => {
     el.style.fontSize = tamTexto + 'px';
 });
 
 localStorage.setItem('fonteTituloPersonalizada', fonte);
 localStorage.setItem('tamanhoTituloPersonalizado', tamTitulo);
 localStorage.setItem('tamanhoTextoPersonalizado', tamTexto);
 
 const dispTitulo = document.getElementById('tamanhoTituloDisplay');
 const dispTexto = document.getElementById('tamanhoTextoDisplay');
 if (dispTitulo) dispTitulo.textContent = tamTitulo + 'px';
 if (dispTexto) dispTexto.textContent = tamTexto + 'px';
 
 mostrarToast('✅ Fontes aplicadas!', 'sucesso');
}

function aplicarLayout() {
 const espacamento = document.getElementById('espacamento').value;
 const cont = document.querySelector('.container');
 if (cont) cont.style.gap = espacamento + 'px';
 
 localStorage.setItem('espacamentoPersonalizado', espacamento);
 const disp = document.getElementById('espacamentoDisplay');
 if (disp) disp.textContent = espacamento + 'px';
 
 mostrarToast('✅ Layout aplicado!', 'sucesso');
}

function toggleElemento(id) {
 const el = document.getElementById(id);
 if (el) {
     if (el.style.display === 'none') {
         el.style.display = '';
         mostrarToast('👁️ Elemento visível', 'info', 1500);
     } else {
         el.style.display = 'none';
         mostrarToast('🙈 Elemento oculto', 'info', 1500);
     }
 }
}

function resetarLayout() {
 const cont = document.querySelector('.container');
 if (cont) cont.style.gap = '30px';
 document.getElementById('espacamento').value = 30;
 document.getElementById('espacamentoDisplay').textContent = '30px';
 
 document.querySelectorAll('.item-arrastavel').forEach(item => {
     const id = item.dataset.id;
     const el = document.getElementById(id);
     if (el) el.style.display = '';
 });
 
 localStorage.removeItem('espacamentoPersonalizado');
 mostrarToast('↩️ Layout resetado!', 'sucesso');
}

function salvarConfiguracao() {
 const config = {
     cores: {
         primaria: document.getElementById('corPrimaria').value,
         secundaria: document.getElementById('corSecundaria').value,
         fundo: document.getElementById('corFundo').value,
         texto: document.getElementById('corTexto').value
     },
     emojis: Array.from(document.querySelectorAll('.emoji-check:checked')).map(cb => cb.value),
     qtdEmojis: document.getElementById('qtdEmojis').value,
     velEmojis: document.getElementById('velEmojis').value,
     fontes: {
         titulo: document.getElementById('fonteTitulo').value,
         tamanhoTitulo: document.getElementById('tamanhoTitulo').value,
         tamanhoTexto: document.getElementById('tamanhoTexto').value
     },
     layout: {
         espacamento: document.getElementById('espacamento').value
     }
 };
 
 localStorage.setItem('configCompletaPersonalizacao', JSON.stringify(config));
 
 const status = document.getElementById('statusSalvar');
 status.textContent = '✅ Configuração salva com sucesso!';
 status.className = 'status-salvar sucesso';
 setTimeout(() => { status.textContent = ''; status.className = 'status-salvar'; }, 5000);
 
 mostrarToast('💾 Configuração salva!', 'sucesso');
}

function carregarConfiguracao() {
 const saved = localStorage.getItem('configCompletaPersonalizacao');
 if (!saved) {
     const status = document.getElementById('statusSalvar');
     status.textContent = '⚠️ Nenhuma configuração salva encontrada.';
     status.className = 'status-salvar erro';
     setTimeout(() => { status.textContent = ''; status.className = 'status-salvar'; }, 4000);
     return;
 }
 
 const config = JSON.parse(saved);
 
 document.getElementById('corPrimaria').value = config.cores.primaria;
 document.getElementById('corSecundaria').value = config.cores.secundaria;
 document.getElementById('corFundo').value = config.cores.fundo;
 document.getElementById('corTexto').value = config.cores.texto;
 aplicarCores();
 
 document.querySelectorAll('.emoji-check').forEach(cb => {
     cb.checked = config.emojis.includes(cb.value);
 });
 document.getElementById('qtdEmojis').value = config.qtdEmojis;
 document.getElementById('qtdEmojisDisplay').textContent = config.qtdEmojis;
 document.getElementById('velEmojis').value = config.velEmojis;
 document.getElementById('velEmojisDisplay').textContent = config.velEmojis + 's';
 aplicarEmojis();
 
 document.getElementById('fonteTitulo').value = config.fontes.titulo;
 document.getElementById('tamanhoTitulo').value = config.fontes.tamanhoTitulo;
 document.getElementById('tamanhoTituloDisplay').textContent = config.fontes.tamanhoTitulo + 'px';
 document.getElementById('tamanhoTexto').value = config.fontes.tamanhoTexto;
 document.getElementById('tamanhoTextoDisplay').textContent = config.fontes.tamanhoTexto + 'px';
 aplicarFontes();
 
 document.getElementById('espacamento').value = config.layout.espacamento;
 document.getElementById('espacamentoDisplay').textContent = config.layout.espacamento + 'px';
 aplicarLayout();
 
 const status = document.getElementById('statusSalvar');
 status.textContent = '✅ Configuração carregada com sucesso!';
 status.className = 'status-salvar sucesso';
 setTimeout(() => { status.textContent = ''; status.className = 'status-salvar'; }, 5000);
 
 mostrarToast('📂 Configuração carregada!', 'sucesso');
}

function resetarConfiguracao() {
 if (!confirm('Tem certeza que deseja resetar todas as configurações para o padrão?')) return;
 
 const chaves = [
     'configCompletaPersonalizacao',
     'corPrimariaPersonalizada',
     'corSecundariaPersonalizada',
     'corFundoPersonalizada',
     'corTextoPersonalizada',
     'emojisPersonalizados',
     'qtdEmojisPersonalizados',
     'velEmojisPersonalizados',
     'fonteTituloPersonalizada',
     'tamanhoTituloPersonalizado',
     'tamanhoTextoPersonalizado',
     'espacamentoPersonalizado'
 ];
 chaves.forEach(k => localStorage.removeItem(k));
 
 location.reload();
}

/* =========================
   DRAG AND DROP PERSONALIZAÇÃO
========================= */
document.addEventListener('DOMContentLoaded', function() {
 let draggedItem = null;
 
 document.querySelectorAll('.item-arrastavel').forEach(item => {
     item.addEventListener('dragstart', function(e) {
         draggedItem = this;
         this.classList.add('arrastando');
         e.dataTransfer.effectAllowed = 'move';
     });
     
     item.addEventListener('dragend', function() {
         this.classList.remove('arrastando');
     });
     
     item.addEventListener('dragover', function(e) {
         e.preventDefault();
     });
     
     item.addEventListener('drop', function(e) {
         e.preventDefault();
         if (draggedItem && draggedItem !== this) {
             const parent = this.parentNode;
             const children = Array.from(parent.children);
             const draggedIndex = children.indexOf(draggedItem);
             const targetIndex = children.indexOf(this);
             
             if (draggedIndex < targetIndex) {
                 parent.insertBefore(draggedItem, this.nextSibling);
             } else {
                 parent.insertBefore(draggedItem, this);
             }
             
             const ordem = Array.from(parent.children).map(el => el.dataset.id);
             localStorage.setItem('ordemElementosPersonalizada', JSON.stringify(ordem));
             mostrarToast('📐 Ordem atualizada!', 'sucesso', 1500);
         }
     });
 });
 
 const ordemSalva = localStorage.getItem('ordemElementosPersonalizada');
 if (ordemSalva) {
     const ordem = JSON.parse(ordemSalva);
     const container = document.querySelector('.elementos-arrastaveis');
     if (container) {
         const elementos = container.querySelectorAll('.item-arrastavel');
         const elementosMap = {};
         elementos.forEach(el => {
             elementosMap[el.dataset.id] = el;
         });
         
         container.innerHTML = '';
         ordem.forEach(id => {
             if (elementosMap[id]) {
                 container.appendChild(elementosMap[id]);
             }
         });
     }
 }
 
 const configSalva = localStorage.getItem('configCompletaPersonalizacao');
 if (configSalva) {
     const config = JSON.parse(configSalva);
     document.documentElement.style.setProperty('--cor-primaria', config.cores.primaria);
     document.documentElement.style.setProperty('--cor-primaria-escura', config.cores.secundaria);
     document.documentElement.style.setProperty('--bg-primary', config.cores.fundo);
     document.documentElement.style.setProperty('--text-primary', config.cores.texto);
     
     document.documentElement.style.setProperty('--font-family', config.fontes.titulo);
     const h1 = document.querySelector('header h1');
     if (h1) h1.style.fontSize = config.fontes.tamanhoTitulo + 'px';
     
     if (config.emojis && config.emojis.length > 0) {
         setTimeout(() => {
             const container = document.getElementById('floresContainer');
             if (container) {
                 container.innerHTML = '';
                 criarFloresDeFundoPersonalizadas(
                     config.emojis,
                     parseInt(config.qtdEmojis) || 35,
                     parseInt(config.velEmojis) || 25
                 );
             }
         }, 500);
     }
 }
});

/* =========================
   POPULAR SELECTS DE SÉRIES AUTOMATICAMENTE
   (Garante que os 3 selects tenham todas as opções)
========================= */
function popularSelectsSeries() {
    const series = [
        '1º Ano A', '1º Ano B', '1º Ano C', '1º Ano D', '1º Ano E', '1º Ano F',
        '2º Ano A', '2º Ano B', '2º Ano C', '2º Ano D', '2º Ano DS',
        '2º Ano Farmácia', '2º Ano ADM',
        '3º Ano A', '3º Ano B', '3º Ano C', '3º Ano D', '3º Ano DS',
        '3º Ano Farmácia', '3º Ano ADM'
    ];

    const idsSelects = [
        'musicaNormalSerie',
        'dedicatoriaSerieRecebe',
        'dedicatoriaSerieSolicitante'
    ];

    idsSelects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        // Se já tem todas as opções (mais de 1), não duplica
        if (select.options.length > 1) return;

        // Adiciona cada série como <option>
        series.forEach(serie => {
            const option = document.createElement('option');
            option.value = serie;
            option.textContent = serie;
            select.appendChild(option);
        });
    });

    console.log('✅ Selects de séries populados automaticamente.');
}

function popularSelectsSeries() {
    const series = [
        '1º Ano A', '1º Ano B', '1º Ano C', '1º Ano D', '1º Ano E', '1º Ano F',
        '2º Ano A', '2º Ano B', '2º Ano C', '2º Ano D', '2º Ano DS',
        '2º Ano Farmácia', '2º Ano ADM',
        '3º Ano A', '3º Ano B', '3º Ano C', '3º Ano D', '3º Ano DS',
        '3º Ano Farmácia', '3º Ano ADM'
    ];

    const idsSelects = [
        'musicaNormalSerie',
        'dedicatoriaSerieRecebe',
        'dedicatoriaSerieSolicitante'
    ];

    idsSelects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        if (select.options.length > 1) return;

        series.forEach(serie => {
            const option = document.createElement('option');
            option.value = serie;
            option.textContent = serie;
            select.appendChild(option);
        });
    });

    console.log('✅ Selects de séries populados automaticamente.');
}

/* =========================
   INICIALIZAÇÃO
========================= */
window.addEventListener("DOMContentLoaded", function () {
    if (typeof firebase === "undefined") {
        mostrarToast("⚠️ Firebase não carregado!", "erro");
        return;
    }
    carregarTemaSalvo();
    carregarNoticias();
    carregarMensagens();
    carregarReclamacoes();
    carregarPendencias();
    carregarConfiguracoesComentarios();
    renderizarCalendario();  // ✅ CORRIGIDO (era carregarProgramacaoSemana)
    
    // Flores de fundo
    setTimeout(criarFloresDeFundo, 300);
    
    // Event listeners para ranges de personalização
    const qtdRange = document.getElementById('qtdEmojis');
    if (qtdRange) {
        qtdRange.addEventListener('input', function() {
            document.getElementById('qtdEmojisDisplay').textContent = this.value;
        });
    }
    
    const velRange = document.getElementById('velEmojis');
    if (velRange) {
        velRange.addEventListener('input', function() {
            document.getElementById('velEmojisDisplay').textContent = this.value + 's';
        });
    }
    
    const tamTituloRange = document.getElementById('tamanhoTitulo');
    if (tamTituloRange) {
        tamTituloRange.addEventListener('input', function() {
            document.getElementById('tamanhoTituloDisplay').textContent = this.value + 'px';
        });
    }
    
    const tamTextoRange = document.getElementById('tamanhoTexto');
    if (tamTextoRange) {
        tamTextoRange.addEventListener('input', function() {
            document.getElementById('tamanhoTextoDisplay').textContent = this.value + 'px';
        });
    }
    
    const espacamentoRange = document.getElementById('espacamento');
    if (espacamentoRange) {
        espacamentoRange.addEventListener('input', function() {
            document.getElementById('espacamentoDisplay').textContent = this.value + 'px';
        });
    }
});

/* =========================
   RESIZE FLORES
========================= */
let timeoutResize;
window.addEventListener('resize', function() {
    clearTimeout(timeoutResize);
    timeoutResize = setTimeout(() => {
        const container = document.getElementById('floresContainer');
        if (container) {
            container.innerHTML = '';
            criarFloresDeFundo();
        }
    }, 1000);
});