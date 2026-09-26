// Painel do mestre: assina a sala e desenha, so para leitura, a ficha de cada
// jogador e o feed de rolagens. Tudo que chega da rede e de terceiros, entao
// todo texto passa por esc() antes de virar HTML.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const str = (v) => (v == null ? '' : String(v));
  const esc = (s) => str(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inteiro = (v) => { const n = parseInt(str(v).trim(), 10); return isNaN(n) ? null : n; };
  const fracTexto = (v) => { const n = inteiro(v); return n === null ? '' : `${Math.floor(n / 2)} · ${Math.floor(n / 5)}`; };
  const CORES = ['verde', 'rosa', 'neutro'];
  const lista = (v) => (Array.isArray(v) ? v : []);

  const jogadores = new Map(); // cid -> { ficha, t, online, recolhido }
  let t = null;

  // ---------- abrir / criar sala ----------
  const params = new URLSearchParams(location.search);
  const codigo = window.Sala ? Sala.limparCodigo(params.get('sala')) : '';

  function irPara(c) {
    const u = new URL(location.href);
    u.searchParams.set('sala', c);
    location.href = u.toString();
  }
  $('criar-sala').addEventListener('click', () => irPara(Sala.novoCodigo()));
  $('form-abrir').addEventListener('submit', (e) => {
    e.preventDefault();
    const c = Sala.limparCodigo($('codigo-existente').value);
    if (c) irPara(c); else $('codigo-existente').focus();
  });

  if (!codigo) {
    $('abrir-sala').hidden = false;
    return;
  }

  // ---------- painel ----------
  $('painel').hidden = false;
  $('codigo').textContent = codigo;
  document.title = `Mestre · Sala ${codigo}`;
  const link = new URL('./', location.href);
  link.search = '';
  link.searchParams.set('sala', codigo);
  if (params.get('broker')) link.searchParams.set('broker', params.get('broker'));
  $('link-jogadores').value = link.toString();
  $('copiar-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('link-jogadores').value);
      toast('Link copiado');
    } catch (e) {
      $('link-jogadores').select();
      toast('Selecionei o link: copie com Ctrl+C');
    }
  });

  const TEXTO = {
    conectando: 'Conectando à sala…',
    conectado: 'Ao vivo',
    reconectando: 'Conexão caiu, tentando de novo…',
    'sem-conexao': 'Sem conexão. Tentando de novo…',
  };
  t = Sala.topicos(codigo);
  const cliente = Sala.conectar({
    aoMudar: (e) => {
      $('conexao').textContent = `Sala ${codigo} · ${TEXTO[e] || e}`;
      $('conexao').dataset.estado = e;
    },
    aoConectar: (c) => c.subscribe([t.todasFichas, t.todosOnline, t.rolagem], { qos: 1 }),
    aoReceber: receber,
  });

  function receber(topico, texto) {
    if (topico === t.rolagem) { novaRolagem(texto); return; }
    const cid = Sala.cidDoTopico(topico);
    if (!/^[a-z0-9]{2,24}$/i.test(cid)) return;

    if (topico === t.online(cid)) {
      const j = jogadores.get(cid);
      if (!texto) { if (j) { j.online = false; desenharCartao(cid); } return; }
      if (j) { j.online = texto === '1'; desenharCartao(cid); }
      else jogadores.set(cid, { ficha: null, t: 0, online: texto === '1', recolhido: false });
      return;
    }
    if (topico === t.ficha(cid)) {
      if (!texto) { jogadores.delete(cid); removerCartao(cid); return; } // jogador saiu da sala
      let dados;
      try { dados = JSON.parse(texto); } catch (e) { return; }
      if (!dados || !dados.ficha || !Array.isArray(dados.ficha.secoes)) return;
      const j = jogadores.get(cid) || { online: false, recolhido: false };
      const nova = !j.ficha;
      j.ficha = dados.ficha;
      j.t = Number(dados.t) || Date.now();
      jogadores.set(cid, j);
      desenharCartao(cid, !nova);
    }
  }

  // ---------- cartoes ----------
  function quando(ms) {
    if (!ms) return '';
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 10) return 'agora';
    if (s < 60) return `há ${s} s`;
    const m = Math.round(s / 60);
    if (m < 60) return `há ${m} min`;
    const h = Math.round(m / 60);
    return h < 24 ? `há ${h} h` : new Date(ms).toLocaleDateString('pt-BR');
  }

  function ordenar() {
    const cont = $('cartoes');
    [...jogadores.entries()]
      .filter(([, j]) => j.ficha)
      .sort((a, b) => str(a[1].ficha.titulo).localeCompare(str(b[1].ficha.titulo), 'pt-BR'))
      .forEach(([cid]) => { const el = cont.querySelector(`[data-cid="${cid}"]`); if (el) cont.appendChild(el); });
    const n = [...jogadores.values()].filter((j) => j.ficha).length;
    $('contagem').textContent = n ? `· ${n}` : '';
    $('fichas-vazio').hidden = n > 0;
  }

  function desenharCartao(cid, mudou) {
    const j = jogadores.get(cid);
    if (!j || !j.ficha) return;
    const cont = $('cartoes');
    let el = cont.querySelector(`[data-cid="${cid}"]`);
    const novo = !el;
    if (novo) {
      el = document.createElement('article');
      el.className = 'cartao';
      el.dataset.cid = cid;
      cont.appendChild(el);
    }
    const f = j.ficha;
    el.classList.toggle('recolhido', j.recolhido);
    el.innerHTML = `
      <header class="cartao-cab">
        <span class="ponto-online${j.online ? ' on' : ''}" title="${j.online ? 'Online' : 'Offline'}"></span>
        <h3>${esc(f.titulo) || '<span class="sem-nome">Personagem sem nome</span>'}</h3>
        <span class="cartao-hora" data-t="${j.t}">${quando(j.t)}</span>
        <button type="button" class="ferr" data-acao="recolher" aria-expanded="${!j.recolhido}">${j.recolhido ? 'Abrir' : 'Recolher'}</button>
        <button type="button" class="ferr perigo" data-acao="remover">Remover</button>
      </header>
      <div class="cartao-corpo leitura">${lista(f.secoes).map(secaoLeitura).join('') || '<p class="dica">Ficha em branco por enquanto.</p>'}</div>`;
    if (mudou) {
      el.classList.remove('piscou');
      void el.offsetWidth;
      el.classList.add('piscou');
    }
    if (novo) ordenar();
    else if (mudou) ordenar();
  }

  function removerCartao(cid) {
    const el = $('cartoes').querySelector(`[data-cid="${cid}"]`);
    if (el) el.remove();
    ordenar();
  }

  $('cartoes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const el = b.closest('.cartao');
    const cid = el.dataset.cid;
    const j = jogadores.get(cid);
    if (!j) return;
    if (b.dataset.acao === 'recolher') {
      j.recolhido = !j.recolhido;
      desenharCartao(cid);
    } else if (b.dataset.acao === 'remover') {
      // Confirma no proprio botao: o segundo toque remove.
      if (b.dataset.confirmar !== '1') {
        b.dataset.confirmar = '1';
        b.textContent = 'Remover mesmo?';
        setTimeout(() => { if (b.isConnected) { b.dataset.confirmar = ''; b.textContent = 'Remover'; } }, 4000);
        return;
      }
      cliente.publish(t.ficha(cid), '', { qos: 1, retain: true });
      cliente.publish(t.online(cid), '', { qos: 1, retain: true });
      jogadores.delete(cid);
      removerCartao(cid);
      toast('Ficha removida da sala. Se o jogador continuar na sala, ela volta na próxima mudança.');
    }
  });

  setInterval(() => {
    document.querySelectorAll('.cartao-hora').forEach((s) => { s.textContent = quando(+s.dataset.t); });
    document.querySelectorAll('.feed-hora').forEach((s) => { s.textContent = quando(+s.dataset.t); });
  }, 15000);

  // ---------- desenho so-leitura ----------
  function secaoLeitura(s) {
    if (!s || typeof s !== 'object') return '';
    const cor = CORES.includes(s.cor) ? s.cor : 'neutro';
    const corpo = (CORPO[s.tipo] || (() => ''))(s);
    if (!corpo) return '';
    const titulo = s.titulo ? `<h4 class="secao-titulo">${esc(s.titulo)}</h4>` : '';
    return `<section class="secao cor-${cor} tipo-${esc(s.tipo)}">${titulo}${corpo}</section>`;
  }

  const CORPO = {
    campos: (s) => `<dl class="campos-leitura">${lista(s.itens).map((it) =>
      `<div><dt>${esc(it.rotulo)}</dt><dd>${esc(it.valor) || '—'}</dd></div>`).join('')}</dl>`,

    atributos: (s) => `<div class="grade">${lista(s.itens).map((it) => {
      const max = it.maximo == null ? '' : `<span class="frac">máx ${esc(it.maximo)}</span>`;
      const frac = it.fracoes ? `<span class="frac">${fracTexto(it.valor)}</span>` : '';
      return `<div class="celula"><span class="rot">${esc(it.rotulo)}</span><span class="val-leitura">${esc(it.valor) || '—'}</span>${frac}${max}</div>`;
    }).join('')}</div>`,

    pericias: (s) => `<div class="pericias">${lista(s.itens).map((it) =>
      `<div class="pericia-leitura"><span class="marca-leitura">${it.marcada ? '✓' : ''}</span><span class="nome">${esc(it.rotulo)}</span><span class="valor-leitura">${esc(it.valor)}</span><span class="frac">${fracTexto(it.valor)}</span></div>`).join('')}</div>`,

    itens: (s) => {
      const its = lista(s.itens).filter((it) => str(it.nome).trim());
      return its.length ? `<ul class="itens-leitura">${its.map((it) =>
        `<li><span>${esc(it.nome)}</span>${str(it.qtd).trim() ? `<span class="qtd">${esc(it.qtd)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="dica">Nenhum item.</p>';
    },

    texto: (s) => str(s.texto).trim() ? `<p class="texto-leitura">${esc(s.texto)}</p>` : '<p class="dica">—</p>',

    marcadores: (s) => `<div class="trilhas">${lista(s.itens).map((it) => {
      const marc = lista(it.marcados).slice(0, 40);
      const n = marc.filter(Boolean).length;
      return `<div class="trilha trilha-${it.cor === 'rosa' ? 'rosa' : 'verde'}"><span class="trilha-rot">${esc(it.rotulo)} <span class="frac">${n}/${marc.length}</span></span><div class="caixas">${marc.map((m) => `<span class="caixa${m ? ' on' : ''}"></span>`).join('')}</div></div>`;
    }).join('')}</div>`,
  };

  // ---------- rolagens ----------
  function novaRolagem(texto) {
    let r;
    try { r = JSON.parse(texto); } catch (e) { return; }
    if (!r || typeof r !== 'object') return;
    const j = jogadores.get(str(r.cid));
    const nome = str(r.nome) || (j && j.ficha && j.ficha.titulo) || 'Sem nome';
    const li = document.createElement('li');
    const classe = r.classe === 'sucesso' || r.classe === 'falha' ? r.classe : '';
    li.innerHTML = `
      <span class="feed-num">${esc(r.num)}</span>
      <div class="feed-txt">
        <div><b>${esc(nome)}</b> · <span class="veredito-mini ${classe}">${esc(r.veredito)}</span></div>
        <div class="contra">${esc(r.contra)}</div>
      </div>
      <span class="feed-hora" data-t="${Number(r.t) || Date.now()}">agora</span>`;
    const feed = $('feed');
    feed.prepend(li);
    while (feed.children.length > 40) feed.lastElementChild.remove();
    $('feed-vazio').hidden = true;
  }

  // ---------- aviso ----------
  let timer = null;
  function toast(txt) {
    $('toast-txt').textContent = txt;
    $('toast').hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { $('toast').hidden = true; }, 3500);
  }
})();
