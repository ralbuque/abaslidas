# CLAUDE.md — Abas Lidas (Modo Gravação)

Contexto para o Claude (ou qualquer assistente) que abrir este repositório em outro computador.
O dono do projeto é o Ricardo (GitHub: `ralbuque`). Converse com ele **em português**.

## O problema que a extensão resolve

O Ricardo grava vídeos. Na preparação, ele abre no **Brave** uma aba para cada tópico
que vai comentar, muitas vezes **mais de 30 abas**. Com tantas abas abertas, a barra só
mostra o favicon de cada uma, e quase todas são do mesmo site (por exemplo, várias do X/Twitter).
Durante a gravação ele se perdia e não sabia em que aba estava nem quais já tinha comentado.

O pedido original foi este: no começo do vídeo ele avisa "estou pronto para gravar".
A extensão marca todas as abas como "não lidas". Ao clicar numa aba, ela perde a marca.
Assim ele sabe o que já leu e o que falta.

## Decisões de design (e por quê)

- **A marca é o próprio favicon.** Com 30+ abas, o Brave encolhe as abas até sobrar só
  o ícone, e o texto do título não aparece. Por isso a marca troca o favicon por uma
  **bolinha vermelha com o número da aba** (posição 1, 2, 3...). Assim ele vê ao mesmo
  tempo *o que falta* e *onde está*. O título também ganha o prefixo `🔴 `, que aparece
  quando as abas são mais largas e no tooltip.
- **A aba ativa no momento de iniciar não é marcada**, porque ela conta como a que ele está lendo.
- **O estado fica em `chrome.storage.session`.** Ele sobrevive quando o service worker do
  MV3 dorme e é apagado ao fechar o navegador, o que é o comportamento desejado.
  São guardados só os IDs das abas não lidas.
- **Um MutationObserver reforça a marca.** Sites como o X trocam o favicon e o título
  dinamicamente. O observer no `<head>` reaplica a marca enquanto ela está ativa.
- **Ao desmarcar, os `<link rel=icon>` originais são restaurados.** Eles ficam guardados
  em `window.__abasLidas.icones`. Se não houver nenhum, a extensão usa `/favicon.ico`.
- **Abas recarregadas ou suspensas** (o Brave descarrega abas para poupar memória) são
  marcadas de novo no `tabs.onUpdated` quando terminam de carregar (`status === 'complete'`).
- **Limitação conhecida e aceita:** páginas internas (`brave://`, `chrome://`, Chrome Web
  Store) e alguns PDFs não permitem injeção de script, então ficam sem marca.
  O erro é engolido em `try/catch` de propósito.
- **A numeração é fixa no momento da marcação**, usando `tab.index + 1`. Se ele reordenar
  abas no meio da gravação, os números não se atualizam (só se a aba recarregar).
  Esta é uma possível melhoria futura.

## Arquivos

| Arquivo | Papel |
|---|---|
| `manifest.json` | Manifest V3. Permissões: `tabs`, `scripting`, `storage` e `host_permissions: <all_urls>`. Define os atalhos. |
| `background.js` | Service worker com toda a lógica: iniciar, limpar, eventos de abas e as funções injetadas `aplicarMarca` e `removerMarca`. |
| `popup.html` / `popup.js` | Popup com dois botões ("Estou pronto para gravar" e "Limpar marcas") e um contador de abas restantes. |

Observação: `aplicarMarca` e `removerMarca` são passadas para `chrome.scripting.executeScript`
como `func`. Por isso precisam ser **autossuficientes**, sem usar variáveis ou funções
externas do background.

## Uso

- Botão no popup ou **Alt+Shift+G** → marca todas as abas da janela atual (menos a ativa).
- **Alt+Shift+L** → limpa todas as marcas.
- O badge vermelho no ícone da extensão mostra quantas abas faltam.
- Os atalhos podem ser trocados em `brave://extensions/shortcuts`.

## Instalação (modo desenvolvedor)

1. Abra `brave://extensions` (ou `chrome://extensions`).
2. Ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione esta pasta do repositório.
4. Depois de editar o código, clique no botão ↻ da extensão para recarregar.

## Histórico

- **2026-10-31** — Criada numa conversa com o Claude (Opus 5.5) no claude.ai. Versão 1.0
  testada pelo Ricardo no Brave: "funcionou muito bem". Na mesma data, o código foi
  movido para este repositório (`~/Git/abaslidas`, remoto `github.com/ralbuque/abaslidas`).

## Ideias de melhoria (ainda não pedidas)

- Renumerar as abas quando forem reordenadas (`tabs.onMoved`).
- Opção de marcar todas as janelas, e não só a atual.
- Ícone próprio para a extensão (hoje ela usa o ícone padrão).
- Publicar na Chrome Web Store.
