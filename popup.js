async function mostrarStatus() {
  const r = await chrome.storage.session.get('naoLidas');
  const n = (r.naoLidas || []).length;
  document.getElementById('status').textContent =
    n ? `Faltam ${n} aba${n > 1 ? 's' : ''} para ler.` : 'Nenhuma aba marcada.';
}

document.getElementById('iniciar').onclick = async () => {
  await chrome.runtime.sendMessage('iniciar');
  mostrarStatus();
};

document.getElementById('limpar').onclick = async () => {
  await chrome.runtime.sendMessage('limpar');
  mostrarStatus();
};

mostrarStatus();
