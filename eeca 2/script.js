import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, onValue, get, push, set, update, remove, serverTimestamp, query, limitToLast } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyAby13tCc63SqtVwk5LgEjSQNe6cCCcIK',
  authDomain: 'eeca-noticia-97e28.firebaseapp.com',
  databaseURL: 'https://eeca-noticia-97e28-default-rtdb.firebaseio.com',
  projectId: 'eeca-noticia-97e28',
  storageBucket: 'eeca-noticia-97e28.firebasestorage.app',
  messagingSenderId: '623154593813',
  appId: '1:623154593813:web:199907b1b9f38f8bc28e1c'
});

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const state = { news: [], user: null, role: 'visitor', commentsStop: null, adminStops: [], authTransition: false };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ADMIN_ROLES = new Set(['admin', 'diretor']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function toast(message, type = 'info') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.setAttribute('role', type === 'error' ? 'alert' : 'status');
  item.textContent = message;
  $('#toastRegion').append(item);
  setTimeout(() => item.remove(), 4800);
}

function setBusy(form, busy, text = 'Enviando…') {
  const button = $('button[type="submit"]', form);
  if (!button) return;
  if (busy) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? text : (button.dataset.label || button.textContent);
}

function normalizeText(value, max = 10000) {
  return String(value ?? '').trim().replace(/\r\n/g, '\n').slice(0, max);
}

function formatDate(value, withTime = false) {
  const date = typeof value === 'number' ? new Date(value) : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}) }).format(date);
}

function timestamp(value) {
  if (typeof value === 'number') return value;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeImageUrl(value) {
  try {
    const url = new URL(value, location.href);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function imagePlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.className = 'news-image-placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.textContent = '🏫';
  return placeholder;
}

function validateImage(file) {
  if (!file || file.size === 0) return;
  if (!IMAGE_TYPES.has(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter no máximo 5 MB.');
}

function fileName(file) {
  const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
  return `${crypto.randomUUID()}.${extension}`;
}

async function uploadImage(file, folder) {
  if (!file || file.size === 0) return { url: '', path: '' };
  validateImage(file);
  if (!state.user) throw new Error('Sessão indisponível. Recarregue a página.');
  const path = `${folder}/${state.user.uid}/${fileName(file)}`;
  const target = storageRef(storage, path);
  await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public,max-age=31536000,immutable' });
  return { url: await getDownloadURL(target), path };
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function initializeShell() {
  $('#currentYear').textContent = new Date().getFullYear();
  const savedTheme = localStorage.getItem('eeca-theme');
  if (savedTheme === 'dark' || (!savedTheme && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.dataset.theme = 'dark';
  $('#themeToggle').textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾';
  $('#themeToggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('eeca-theme', dark ? 'dark' : 'light');
    $('#themeToggle').textContent = dark ? '☀' : '☾';
  });
  $('#menuButton').addEventListener('click', () => {
    const menu = $('#mobileNav');
    menu.hidden = !menu.hidden;
    $('#menuButton').setAttribute('aria-expanded', String(!menu.hidden));
  });
  $$('#mobileNav a').forEach(link => link.addEventListener('click', () => { $('#mobileNav').hidden = true; $('#menuButton').setAttribute('aria-expanded', 'false'); }));
  $$('[data-open]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.open)));
  $$('.dialog').forEach(dialog => {
    $('[data-close]', dialog)?.addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
  });
  $$('textarea[maxlength]').forEach(area => area.addEventListener('input', () => { const output = document.querySelector(`[data-count="${area.name}"]`); if (output) output.value = area.value.length; }));
  $('#newsSearch').addEventListener('input', renderNews);
  $('#loginButton').addEventListener('click', () => ADMIN_ROLES.has(state.role) ? openAdmin() : openDialog('loginDialog'));
  $('#logoutButton').addEventListener('click', logoutAdmin);
  $('#loginForm').addEventListener('submit', loginAdmin);
  $('#feedbackForm').addEventListener('submit', submitFeedback);
  $('#radioForm').addEventListener('submit', submitRadioRequest);
  $('#newsForm').addEventListener('submit', publishNews);
  $$('.admin-tabs [data-tab]').forEach(tab => tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab)));
}

function updateIdentity() {
  const admin = ADMIN_ROLES.has(state.role);
  $('#loginButton').textContent = admin ? 'Painel' : 'Equipe';
  $('#adminIdentity').textContent = admin && state.user ? `${state.user.email || 'Conta institucional'} • ${state.role}` : '';
}

onAuthStateChanged(auth, async user => {
  state.user = user;
  state.role = 'visitor';
  if (user && !user.isAnonymous) {
    try {
      const token = await user.getIdTokenResult(true);
      state.role = ADMIN_ROLES.has(token.claims.role) ? token.claims.role : 'visitor';
    } catch (error) { console.error('Não foi possível carregar o perfil.', error); }
  }
  updateIdentity();
  if (!user && !state.authTransition) {
    try { await signInAnonymously(auth); }
    catch { showConnectionNotice('Os formulários estão temporariamente indisponíveis. A navegação pública continua funcionando.'); }
  }
});

function showConnectionNotice(message) {
  const notice = $('#connectionNotice');
  notice.textContent = message;
  notice.hidden = false;
}

function loadNews() {
  onValue(query(ref(db, 'noticias'), limitToLast(60)), snapshot => {
    const value = snapshot.val() || {};
    state.news = Object.entries(value).map(([id, item]) => ({ id, ...item })).sort((a, b) => timestamp(b.data) - timestamp(a.data));
    $('#newsCount').textContent = state.news.length;
    $('#newsGrid').setAttribute('aria-busy', 'false');
    $('#connectionNotice').hidden = true;
    renderNews();
  }, error => {
    console.error('Falha ao carregar notícias.', error);
    state.news = [];
    $('#newsGrid').setAttribute('aria-busy', 'false');
    renderNews();
    showConnectionNotice('O conteúdo ao vivo está indisponível. A configuração segura do Firebase precisa ser concluída.');
  });
}

function renderNews() {
  const grid = $('#newsGrid');
  const term = $('#newsSearch').value.trim().toLocaleLowerCase('pt-BR');
  const items = state.news.filter(item => [item.titulo, item.resumo, item.texto, item.categoria].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(term)));
  grid.replaceChildren();
  $('#newsEmpty').hidden = items.length > 0;
  for (const item of items) grid.append(createNewsCard(item));
}

function createNewsCard(item) {
  const article = document.createElement('article');
  article.className = 'news-card';
  const image = safeImageUrl(item.imagem);
  if (image) {
    const img = document.createElement('img'); img.className = 'news-image'; img.src = image; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.addEventListener('error', () => img.replaceWith(imagePlaceholder()), { once: true }); article.append(img);
  } else {
    article.append(imagePlaceholder());
  }
  const body = document.createElement('div'); body.className = 'news-body';
  const meta = document.createElement('div'); meta.className = 'news-meta';
  const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = normalizeText(item.categoria || 'Notícias', 40);
  const time = document.createElement('time'); time.dateTime = new Date(timestamp(item.data) || Date.now()).toISOString(); time.textContent = formatDate(item.data);
  const title = document.createElement('h3'); title.textContent = normalizeText(item.titulo || 'Notícia', 140);
  const summary = document.createElement('p'); summary.textContent = normalizeText(item.resumo || item.texto, 240);
  const button = document.createElement('button'); button.className = 'text-button'; button.type = 'button'; button.textContent = 'Ler notícia →'; button.addEventListener('click', () => showNews(item));
  meta.append(chip, time); body.append(meta, title, summary, button); article.append(body); return article;
}

function showNews(item) {
  if (state.commentsStop) state.commentsStop();
  const root = $('#newsDetail'); root.replaceChildren();
  const category = document.createElement('span'); category.className = 'chip'; category.textContent = normalizeText(item.categoria || 'Notícias', 40);
  const title = document.createElement('h2'); title.id = 'newsDialogTitle'; title.textContent = normalizeText(item.titulo, 140);
  const meta = document.createElement('p'); meta.className = 'news-detail-meta'; meta.textContent = `Publicado em ${formatDate(item.data, true)}`;
  root.append(category, title, meta);
  const image = safeImageUrl(item.imagem);
  if (image) { const img = document.createElement('img'); img.className = 'news-detail-image'; img.src = image; img.alt = ''; img.addEventListener('error', () => img.remove(), { once: true }); root.append(img); }
  const content = document.createElement('div'); content.className = 'news-content'; content.textContent = normalizeText(item.texto); root.append(content);
  if (ADMIN_ROLES.has(state.role)) {
    const del = document.createElement('button'); del.className = 'small-button danger'; del.type = 'button'; del.textContent = 'Excluir notícia'; del.addEventListener('click', () => deleteNews(item)); root.append(del);
  }
  root.append(createComments(item.id));
  openDialog('newsDialog');
}

function createComments(newsId) {
  const section = document.createElement('section'); section.className = 'comments';
  const heading = document.createElement('h3'); heading.textContent = 'Comentários da comunidade';
  const list = document.createElement('div'); list.className = 'comment-list'; list.textContent = 'Carregando…';
  const form = document.createElement('form'); form.className = 'comment-form';
  const nameLabel = document.createElement('label'); nameLabel.textContent = 'Nome'; const name = document.createElement('input'); name.name = 'nome'; name.maxLength = 80; name.placeholder = 'Opcional'; nameLabel.append(name);
  const textLabel = document.createElement('label'); textLabel.textContent = 'Comentário'; const text = document.createElement('input'); text.name = 'texto'; text.required = true; text.minLength = 2; text.maxLength = 500; textLabel.append(text);
  const submit = document.createElement('button'); submit.className = 'button button-primary'; submit.type = 'submit'; submit.textContent = 'Enviar';
  form.append(nameLabel, textLabel, submit);
  form.addEventListener('submit', event => submitComment(event, newsId));
  section.append(heading, list, form);
  state.commentsStop = onValue(query(ref(db, `comentarios_noticias/${newsId}`), limitToLast(30)), snapshot => {
    list.replaceChildren();
    const comments = Object.values(snapshot.val() || {}).sort((a, b) => Number(a.data || 0) - Number(b.data || 0));
    if (!comments.length) { list.textContent = 'Ainda não há comentários.'; return; }
    for (const comment of comments) {
      const item = document.createElement('article'); item.className = 'comment';
      const author = document.createElement('strong'); author.textContent = normalizeText(comment.nome || 'Anônimo', 80);
      const time = document.createElement('time'); time.textContent = formatDate(comment.data, true);
      const body = document.createElement('p'); body.textContent = normalizeText(comment.texto, 500);
      item.append(author, time, body); list.append(item);
    }
  }, () => { list.textContent = 'Comentários temporariamente indisponíveis.'; });
  return section;
}

async function submitComment(event, newsId) {
  event.preventDefault(); const form = event.currentTarget;
  if (!state.user) return toast('Aguarde a sessão segura ser iniciada.', 'error');
  setBusy(form, true);
  try {
    const data = new FormData(form);
    await push(ref(db, `comentarios_noticias/${newsId}`), { nome: normalizeText(data.get('nome'), 80) || 'Anônimo', texto: normalizeText(data.get('texto'), 500), data: serverTimestamp(), uid: state.user.uid });
    form.reset(); toast('Comentário enviado.', 'success');
  } catch (error) { console.error(error); toast('Não foi possível enviar o comentário.', 'error'); }
  finally { setBusy(form, false); }
}

async function submitFeedback(event) {
  event.preventDefault(); const form = event.currentTarget;
  if (!state.user) return toast('Aguarde a sessão segura ser iniciada.', 'error');
  setBusy(form, true);
  let uploaded = null;
  try {
    const data = new FormData(form); const file = data.get('anexo'); uploaded = await uploadImage(file, 'complaint-evidence');
    await push(ref(db, 'reclamacoes_pendentes'), { tipo: normalizeText(data.get('tipo'), 20), nome: normalizeText(data.get('nome'), 80) || 'Anônimo', turma: normalizeText(data.get('turma'), 40), titulo: normalizeText(data.get('titulo'), 120), texto: normalizeText(data.get('texto'), 2000), anexoPath: uploaded.path, data: serverTimestamp(), uid: state.user.uid, status: 'pendente' });
    form.reset(); $('[data-count="texto"]').value = 0; closeDialog($('#ouvidoriaDialog')); toast('Mensagem enviada para análise.', 'success');
  } catch (error) {
    console.error(error); if (uploaded?.path) deleteObject(storageRef(storage, uploaded.path)).catch(() => {}); toast(error.message || 'Não foi possível enviar.', 'error');
  } finally { setBusy(form, false); }
}

async function submitRadioRequest(event) {
  event.preventDefault(); const form = event.currentTarget;
  if (!state.user) return toast('Aguarde a sessão segura ser iniciada.', 'error');
  setBusy(form, true);
  try {
    const data = new FormData(form);
    await push(ref(db, 'radio_musicas'), { solicitante: normalizeText(data.get('solicitante'), 80), serieSolicitante: normalizeText(data.get('serieSolicitante'), 40), musica: normalizeText(data.get('musica'), 160), mensagem: normalizeText(data.get('mensagem'), 300), tipo: data.get('mensagem') ? 'dedicatoria' : 'normal', status: 'pendente', data: serverTimestamp(), uid: state.user.uid });
    form.reset(); closeDialog($('#radioDialog')); toast('Pedido enviado para a curadoria.', 'success');
  } catch (error) { console.error(error); toast('Não foi possível enviar o pedido.', 'error'); }
  finally { setBusy(form, false); }
}

function loadSchedule() {
  const date = new Date(); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  $('#scheduleDate').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).format(date);
  onValue(ref(db, `radio_programacao/${key}`), snapshot => {
    const list = $('#scheduleList'); list.replaceChildren(); const tracks = Object.values(snapshot.val() || {}).slice(0, 5);
    if (!tracks.length) { const empty = document.createElement('li'); empty.className = 'muted'; empty.textContent = 'A programação de hoje será divulgada em breve.'; list.append(empty); return; }
    tracks.forEach((track, index) => { const li = document.createElement('li'); const number = document.createElement('span'); number.className = 'track-number'; number.textContent = String(index + 1).padStart(2, '0'); const wrap = document.createElement('div'); const title = document.createElement('div'); title.className = 'track-title'; title.textContent = normalizeText(track.musica, 160); const meta = document.createElement('div'); meta.className = 'track-meta'; meta.textContent = `Pedido de ${normalizeText(track.solicitante || 'comunidade', 80)}`; const type = document.createElement('span'); type.className = 'track-meta'; type.textContent = track.tipo === 'dedicatoria' ? 'Dedicatória' : 'Música'; wrap.append(title, meta); li.append(number, wrap, type); list.append(li); });
  }, () => { $('#scheduleList').textContent = 'Programação temporariamente indisponível.'; });
}

async function loginAdmin(event) {
  event.preventDefault(); const form = event.currentTarget; setBusy(form, true, 'Verificando…');
  const data = new FormData(form);
  try {
    state.authTransition = true;
    await signOut(auth); const credential = await signInWithEmailAndPassword(auth, normalizeText(data.get('email'), 200), String(data.get('password') || ''));
    const token = await credential.user.getIdTokenResult(true); const role = token.claims.role;
    if (!ADMIN_ROLES.has(role)) { await signOut(auth); throw new Error('Esta conta não possui permissão administrativa.'); }
    state.role = role; state.user = credential.user; updateIdentity(); form.reset(); closeDialog($('#loginDialog')); openAdmin(); toast('Acesso autorizado.', 'success');
  } catch (error) { console.error(error); toast(error.message?.includes('permissão') ? error.message : 'E-mail ou senha inválidos.', 'error'); }
  finally { state.authTransition = false; if (!auth.currentUser) signInAnonymously(auth).catch(() => {}); setBusy(form, false); }
}

async function logoutAdmin() {
  state.adminStops.splice(0).forEach(stop => stop());
  await signOut(auth); closeDialog($('#adminDialog')); toast('Sessão encerrada.', 'success');
}

function openAdmin() {
  if (!ADMIN_ROLES.has(state.role)) return openDialog('loginDialog');
  state.adminStops.splice(0).forEach(stop => stop());
  state.adminStops.push(onValue(query(ref(db, 'reclamacoes_pendentes'), limitToLast(100)), snapshot => renderInbox(snapshot.val() || {}), () => { $('#inboxList').textContent = 'Sem permissão para carregar a caixa de entrada.'; }));
  state.adminStops.push(onValue(query(ref(db, 'radio_musicas'), limitToLast(100)), snapshot => renderRequests(snapshot.val() || {}), () => { $('#requestList').textContent = 'Sem permissão para carregar pedidos.'; }));
  openDialog('adminDialog');
}

function switchAdminTab(name) {
  $$('.admin-tabs [data-tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
  $$('[data-panel]').forEach(panel => panel.hidden = panel.dataset.panel !== name);
}

async function publishNews(event) {
  event.preventDefault(); const form = event.currentTarget;
  if (!ADMIN_ROLES.has(state.role)) return toast('Sessão administrativa necessária.', 'error');
  setBusy(form, true, 'Publicando…'); let upload = null;
  try {
    const data = new FormData(form); upload = await uploadImage(data.get('imagem'), 'news');
    await push(ref(db, 'noticias'), { titulo: normalizeText(data.get('titulo'), 140), categoria: normalizeText(data.get('categoria'), 40), resumo: normalizeText(data.get('resumo'), 240), texto: normalizeText(data.get('texto'), 10000), imagem: upload.url, imagemPath: upload.path, data: serverTimestamp(), autorUid: state.user.uid });
    form.reset(); toast('Notícia publicada.', 'success');
  } catch (error) { console.error(error); if (upload?.path) deleteObject(storageRef(storage, upload.path)).catch(() => {}); toast(error.message || 'Falha ao publicar.', 'error'); }
  finally { setBusy(form, false); }
}

async function deleteNews(item) {
  if (!ADMIN_ROLES.has(state.role) || !confirm('Excluir esta notícia permanentemente?')) return;
  try {
    await remove(ref(db, `noticias/${item.id}`)); await remove(ref(db, `comentarios_noticias/${item.id}`));
    if (item.imagemPath) await deleteObject(storageRef(storage, item.imagemPath)).catch(() => {});
    closeDialog($('#newsDialog')); toast('Notícia excluída.', 'success');
  } catch (error) { console.error(error); toast('Não foi possível excluir.', 'error'); }
}

function renderInbox(data) {
  const list = $('#inboxList'); list.replaceChildren();
  const items = Object.entries(data).map(([id, value]) => ({ id, ...value })).sort((a, b) => timestamp(b.data) - timestamp(a.data));
  if (!items.length) { list.textContent = 'Nenhuma mensagem pendente.'; return; }
  items.forEach(item => {
    const card = document.createElement('article'); card.className = 'admin-item';
    const head = document.createElement('div'); head.className = 'admin-item-head'; const title = document.createElement('h3'); title.textContent = `${normalizeText(item.tipo, 20)} • ${normalizeText(item.titulo, 120)}`; const time = document.createElement('time'); time.textContent = formatDate(item.data, true); head.append(title, time);
    const author = document.createElement('small'); author.textContent = `${normalizeText(item.nome || 'Anônimo', 80)}${item.turma ? ` • ${normalizeText(item.turma, 40)}` : ''}`;
    const body = document.createElement('p'); body.textContent = normalizeText(item.texto, 2000);
    const actions = document.createElement('div'); actions.className = 'admin-item-actions'; const archive = actionButton('Arquivar', 'approve', () => archiveInbox(item)); const discard = actionButton('Excluir', 'danger', () => discardInbox(item)); actions.append(archive, discard); card.append(head, author, body, actions); list.append(card);
  });
}

function renderRequests(data) {
  const list = $('#requestList'); list.replaceChildren(); const items = Object.entries(data).map(([id, value]) => ({ id, ...value })).sort((a, b) => timestamp(b.data) - timestamp(a.data));
  if (!items.length) { list.textContent = 'Nenhum pedido recebido.'; return; }
  items.forEach(item => { const card = document.createElement('article'); card.className = 'admin-item'; const head = document.createElement('div'); head.className = 'admin-item-head'; const title = document.createElement('h3'); title.textContent = normalizeText(item.musica, 160); const status = document.createElement('span'); status.className = 'chip'; status.textContent = normalizeText(item.status || 'pendente', 20); head.append(title, status); const body = document.createElement('p'); body.textContent = `${normalizeText(item.solicitante, 80)} • ${normalizeText(item.serieSolicitante, 40)}${item.mensagem ? `\n${normalizeText(item.mensagem, 300)}` : ''}`; const actions = document.createElement('div'); actions.className = 'admin-item-actions'; actions.append(actionButton('Aprovar', 'approve', () => updateRequest(item.id, 'aprovada')), actionButton('Negar', 'danger', () => updateRequest(item.id, 'negada'))); card.append(head, body, actions); list.append(card); });
}

function actionButton(label, className, handler) { const button = document.createElement('button'); button.type = 'button'; button.className = `small-button ${className}`; button.textContent = label; button.addEventListener('click', handler); return button; }

async function archiveInbox(item) {
  try { const archived = { ...item }; delete archived.id; archived.arquivadoEm = serverTimestamp(); archived.arquivadoPor = state.user.uid; await set(ref(db, `mensagens_arquivadas/${item.id}`), archived); await remove(ref(db, `reclamacoes_pendentes/${item.id}`)); toast('Mensagem arquivada.', 'success'); } catch (error) { console.error(error); toast('Falha ao arquivar.', 'error'); }
}

async function discardInbox(item) {
  if (!confirm('Excluir esta mensagem permanentemente?')) return;
  try { await remove(ref(db, `reclamacoes_pendentes/${item.id}`)); if (item.anexoPath) await deleteObject(storageRef(storage, item.anexoPath)).catch(() => {}); toast('Mensagem excluída.', 'success'); } catch (error) { console.error(error); toast('Falha ao excluir.', 'error'); }
}

async function updateRequest(id, status) {
  try { await update(ref(db, `radio_musicas/${id}`), { status, moderadoEm: serverTimestamp(), moderadoPor: state.user.uid }); toast(`Pedido ${status}.`, 'success'); } catch (error) { console.error(error); toast('Falha ao atualizar o pedido.', 'error'); }
}

initializeShell();
loadNews();
loadSchedule();
