// Abas Lidas – Modo Gravação
// Guarda os IDs das abas ainda não lidas em storage.session
// (sobrevive ao service worker dormir, é apagado ao fechar o navegador).

const KEY = 'naoLidas';

async function getNaoLidas() {
  const r = await chrome.storage.session.get(KEY);
  return new Set(r[KEY] || []);
}

async function salvar(set) {
  await chrome.storage.session.set({ [KEY]: [...set] });
  atualizarBadge(set.size);
}

function atualizarBadge(n) {
  chrome.action.setBadgeBackgroundColor({ color: '#e01b24' });
  chrome.action.setBadgeText({ text: n ? String(n) : '' });
}

// ---------- Funções injetadas na página (precisam ser autossuficientes) ----------

function aplicarMarca(num) {
  const P = '🔴 ';
  const S = window.__abasLidas || (window.__abasLidas = {});
  const head = document.head || document.documentElement;

  // Desenha a bolinha vermelha com o número
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#e01b24';
  g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  const tam = num > 99 ? 26 : num > 9 ? 36 : 44;
  g.font = `bold ${tam}px Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(num), 32, 35);
  const dataUrl = c.toDataURL('image/png');

  if (!S.ativo) {
    S.ativo = true;
    S.icones = [];
    S.link = document.createElement('link');
    S.link.rel = 'icon';
    S.link.type = 'image/png';
    S.link.setAttribute('data-abas-lidas', '1');

    S.reforcar = () => {
      if (!S.ativo) return;
      // Tira os ícones do site (guardando para restaurar depois)
      document.querySelectorAll('link[rel~="icon"]').forEach((l) => {
        if (l !== S.link) { S.icones.push(l); l.remove(); }
      });
      if (!S.link.isConnected) head.appendChild(S.link);
      if (!document.title.startsWith(P)) document.title = P + document.title;
    };

    S.obs = new MutationObserver(S.reforcar);
    S.obs.observe(head, { childList: true, subtree: true, characterData: true });
  }

  S.link.href = dataUrl;
  S.reforcar();
}

function removerMarca() {
  const P = '🔴 ';
  const S = window.__abasLidas;
  if (!S || !S.ativo) return;
  S.ativo = false;
  S.obs.disconnect();
  S.link.remove();
  if (document.title.startsWith(P)) document.title = document.title.slice(P.length);

  const head = document.head || document.documentElement;
  if (S.icones.length) {
    S.icones.forEach((l) => head.appendChild(l));
  } else {
    const l = document.createElement('link');
    l.rel = 'icon';
    l.href = location.origin + '/favicon.ico';
    head.appendChild(l);
  }
  S.icones = [];
}

// ---------- Ações ----------

async function marcar(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: aplicarMarca,
      args: [tab.index + 1],
    });
  } catch (e) {
    // Páginas internas (brave://, loja de extensões, PDFs) ou abas suspensas.
    // Abas suspensas são marcadas assim que carregarem.
  }
}

async function desmarcar(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: removerMarca });
  } catch (e) {}
}

async function limpar() {
  const set = await getNaoLidas();
  await Promise.all([...set].map(desmarcar));
  await salvar(new Set());
}

async function iniciar() {
  await limpar();
  const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
  const set = new Set();
  for (const t of tabs) {
    if (t.active) continue; // a aba em que você está já conta como "lendo"
    set.add(t.id);
  }
  await salvar(set);
  await Promise.all(tabs.filter((t) => set.has(t.id)).map(marcar));
}

// ---------- Eventos ----------

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const set = await getNaoLidas();
  if (set.delete(tabId)) {
    await salvar(set);
    desmarcar(tabId);
  }
});

// Se uma aba não lida recarregar ou só agora carregar, marca de novo
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete') return;
  const set = await getNaoLidas();
  if (set.has(tabId) && !tab.active) marcar(tab);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const set = await getNaoLidas();
  if (set.delete(tabId)) await salvar(set);
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'iniciar') iniciar();
  if (cmd === 'limpar') limpar();
});

chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
  const acao = msg === 'iniciar' ? iniciar : msg === 'limpar' ? limpar : null;
  if (!acao) return;
  acao().then(() => responder(true));
  return true;
});

getNaoLidas().then((s) => atualizarBadge(s.size));
