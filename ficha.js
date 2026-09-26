// Ficha editavel — tudo e dado: a ficha e uma lista de secoes, cada secao
// tem um tipo e uma lista de itens. Nada do layout e fixo; a "ficha original"
// e so o estado inicial.
(function () {
  'use strict';

  const CHAVE = 'terra-sob-as-unhas:ficha:v1';
  const CHAVE_EDITANDO = 'terra-sob-as-unhas:editando';
  const CORES = ['verde', 'rosa', 'neutro'];
  const NOME_COR = { verde: 'verde', rosa: 'rosa', neutro: 'sem cor' };

  const TIPOS = {
    atributos: {
      nome: 'Atributos', add: 'Atributo', titulo: 'Atributos', cor: 'verde',
      novoItem: () => ({ rotulo: 'NOVO', valor: '50', fracoes: true, rolavel: true, maximo: null, texto: false }),
    },
    pericias: {
      nome: 'Perícias', add: 'Perícia', titulo: 'Perícias', cor: 'verde',
      novoItem: () => ({ rotulo: 'Nova perícia', valor: '5', marcada: false }),
    },
    itens: {
      nome: 'Lista de itens', add: 'Item', titulo: 'Itens', cor: 'neutro',
      novoItem: () => ({ nome: '', qtd: '' }),
    },
    texto: { nome: 'Texto', titulo: 'Texto', cor: 'neutro' },
    marcadores: {
      nome: 'Marcadores', add: 'Marcador', titulo: 'Marcadores', cor: 'neutro',
      novoItem: () => ({ rotulo: 'Marcador', total: 5, marcados: [], cor: 'verde' }),
    },
    campos: {
      nome: 'Campos', add: 'Campo', titulo: 'Campos', cor: 'neutro',
      novoItem: () => ({ rotulo: 'Novo campo', valor: '' }),
    },
  };

  const ICONE = {
    alca: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><circle cx="5.5" cy="3.5" r="1.4"/><circle cx="10.5" cy="3.5" r="1.4"/><circle cx="5.5" cy="8" r="1.4"/><circle cx="10.5" cy="8" r="1.4"/><circle cx="5.5" cy="12.5" r="1.4"/><circle cx="10.5" cy="12.5" r="1.4"/></svg>',
    opcoes: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4.5h6.5M12.5 4.5H14M2 11.5h1.5M7.5 11.5H14"/><circle cx="10.5" cy="4.5" r="1.9"/><circle cx="5.5" cy="11.5" r="1.9"/></svg>',
    fechar: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    subir: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>',
    descer: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
  };

  // ---------- utilidades ----------
  const $ = (id) => document.getElementById(id);
  const str = (v) => (v == null ? '' : String(v));
  const esc = (s) => str(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
  const inteiro = (v) => { const n = parseInt(str(v).trim(), 10); return isNaN(n) ? null : n; };
  const fracTexto = (v) => { const n = inteiro(v); return n === null ? '' : `${Math.floor(n / 2)} · ${Math.floor(n / 5)}`; };
  const idc = (s, it, campo) => `c-${s.id}-${it ? it.id + '-' : ''}${campo}`;
  function aleatorio(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }

  // ---------- modelo ----------
  function normalizarItem(tipo, bruto) {
    const it = bruto && typeof bruto === 'object' ? bruto : {};
    const n = TIPOS[tipo].novoItem();
    for (const k in n) if (it[k] !== undefined) n[k] = it[k];
    n.id = str(it.id) || uid();
    if ('rotulo' in n) n.rotulo = str(n.rotulo);
    if ('valor' in n) n.valor = str(n.valor);
    if (tipo === 'atributos') {
      n.fracoes = !!n.fracoes; n.rolavel = !!n.rolavel; n.texto = !!n.texto;
      n.maximo = n.maximo == null ? null : str(n.maximo);
    }
    if (tipo === 'pericias') n.marcada = !!n.marcada;
    if (tipo === 'itens') { n.nome = str(n.nome); n.qtd = str(n.qtd); }
    if (tipo === 'marcadores') {
      n.total = limitar(inteiro(n.total) || 1, 1, 40);
      const m = Array.isArray(it.marcados) ? it.marcados : [];
      n.marcados = Array.from({ length: n.total }, (_, i) => !!m[i]);
      n.cor = n.cor === 'rosa' ? 'rosa' : 'verde';
    }
    return n;
  }

  function normalizar(bruto) {
    const f = { titulo: str(bruto && bruto.titulo), secoes: [] };
    const secoes = bruto && Array.isArray(bruto.secoes) ? bruto.secoes : [];
    const vistos = new Set();
    for (const s of secoes) {
      if (!s || !TIPOS[s.tipo]) continue;
      let id = str(s.id) || uid();
      if (vistos.has(id)) id = uid();
      vistos.add(id);
      const n = { id, tipo: s.tipo, titulo: str(s.titulo), cor: CORES.includes(s.cor) ? s.cor : TIPOS[s.tipo].cor };
      if (s.tipo === 'texto') n.texto = str(s.texto);
      else {
        const ids = new Set();
        n.itens = (Array.isArray(s.itens) ? s.itens : []).map((it) => {
          const x = normalizarItem(s.tipo, it);
          if (ids.has(x.id)) x.id = uid();
          ids.add(x.id);
          return x;
        });
      }
      f.secoes.push(n);
    }
    return f;
  }

  function fichaOriginal() {
    const A = (rotulo, valor, extra) => Object.assign(
      { rotulo, valor: String(valor), fracoes: true, rolavel: true, maximo: null, texto: false }, extra || {});
    const P = (rotulo, valor) => ({ rotulo, valor: String(valor) });
    return normalizar({
      titulo: 'A Terra Sob as Unhas',
      secoes: [
        { tipo: 'campos', titulo: '', cor: 'neutro', itens: [
          { rotulo: 'Personagem', valor: '' }, { rotulo: 'Ocupação', valor: '' }, { rotulo: 'Jogador(a)', valor: '' },
        ] },
        { tipo: 'atributos', titulo: 'Características', cor: 'verde', itens: [
          A('FOR', 55), A('CON', 55), A('TAM', 50), A('DES', 65), A('APA', 60), A('INT', 70), A('POD', 55), A('EDU', 70),
        ] },
        { tipo: 'atributos', titulo: '', cor: 'rosa', itens: [
          A('PV', 10, { fracoes: false, rolavel: false, maximo: '10' }),
          A('PM', 11, { fracoes: false, rolavel: false, maximo: '11' }),
          A('SAN', 55, { fracoes: false, maximo: '55' }),
          A('Sorte', 50, { fracoes: false }),
          A('MOV', 9, { fracoes: false, rolavel: false }),
          A('Corp.', 0, { fracoes: false, rolavel: false }),
          A('Dano B.', '—', { fracoes: false, texto: true }),
        ] },
        { tipo: 'pericias', titulo: 'Perícias', cor: 'verde', itens: [
          P('Lábia', 60), P('Persuasão', 55), P('Escutar', 55), P('Encontrar', 55), P('Direito', 35), P('Informática', 50),
          P('Dirigir Automóvel', 45), P('Esquiva', 50), P('Fotografia', 55), P('Disfarce', 35),
          P('Português (idioma próprio)', 70), P('Inglês', 40),
        ] },
        { tipo: 'texto', titulo: 'Segredo Pequeno', cor: 'rosa',
          texto: 'Já publicou uma informação sabendo que colocaria uma fonte em risco, porque a pauta era grande demais para recusar.' },
        { tipo: 'itens', titulo: 'Equipamento', cor: 'neutro', itens: [
          'Gravador digital', 'Câmera', 'Notebook', 'Carteira de imprensa', 'Carro pequeno', 'Caderno de contatos em código próprio',
        ].map((nome) => ({ nome, qtd: '1' })) },
        { tipo: 'marcadores', titulo: 'Marcadores de jogo', cor: 'neutro', itens: [
          { rotulo: 'Sanidade', total: 10, cor: 'verde' }, { rotulo: 'Raiz', total: 5, cor: 'rosa' },
        ] },
        { tipo: 'texto', titulo: 'Anotações', cor: 'neutro', texto: '' },
      ],
    });
  }

  function novaSecao(tipo) {
    const base = { tipo, titulo: TIPOS[tipo].titulo, cor: TIPOS[tipo].cor };
    if (tipo === 'texto') base.texto = '';
    else base.itens = [TIPOS[tipo].novoItem()];
    return normalizar({ secoes: [base] }).secoes[0];
  }

  function copiarSecao(s) {
    const c = JSON.parse(JSON.stringify(s));
    c.id = uid();
    if (c.itens) c.itens.forEach((it) => { it.id = uid(); });
    return c;
  }

  // ---------- estado ----------
  function carregar() {
    try {
      const s = localStorage.getItem(CHAVE);
      if (s) {
        const o = JSON.parse(s);
        if (o && Array.isArray(o.secoes)) return normalizar(o);
      }
    } catch (e) { /* armazenamento indisponivel: comeca da ficha original */ }
    return fichaOriginal();
  }

  let estado = carregar();
  let editando = false;
  try { editando = localStorage.getItem(CHAVE_EDITANDO) === '1'; } catch (e) { /* segue sem */ }
  const pilha = [];
  let focarDepois = null;

  const secao = (id) => estado.secoes.find((s) => s.id === id);
  const item = (s, id) => (s && s.itens ? s.itens.find((i) => i.id === id) : undefined);

  // ---------- salvar ----------
  let timerSalvar = null;
  function status(t) { $('salvo').textContent = t; }
  function gravarAgora() {
    clearTimeout(timerSalvar);
    timerSalvar = null;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      status('Salvo neste aparelho');
    } catch (e) {
      status('Não consegui salvar neste navegador. Use Arquivo › Exportar para guardar uma cópia.');
    }
  }
  function salvar() {
    status('Salvando…');
    clearTimeout(timerSalvar);
    timerSalvar = setTimeout(gravarAgora, 300);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && timerSalvar) gravarAgora(); });
  window.addEventListener('pagehide', () => { if (timerSalvar) gravarAgora(); });

  // Toda mudanca de estrutura passa por aqui: guarda o estado anterior pra
  // poder desfazer, redesenha e salva.
  function mudar(fn, aviso) {
    pilha.push(JSON.stringify(estado));
    if (pilha.length > 80) pilha.shift();
    fn();
    render();
    salvar();
    atualizarDesfazer();
    if (aviso) toast(aviso, true);
  }
  function desfazer() {
    if (!pilha.length) return;
    estado = JSON.parse(pilha.pop());
    render();
    salvar();
    atualizarDesfazer();
    toast('Desfeito', false);
  }
  function atualizarDesfazer() { $('btn-desfazer').disabled = !pilha.length; }

  let timerToast = null;
  function toast(texto, comDesfazer) {
    $('toast-txt').textContent = texto;
    $('toast-desfazer').hidden = !comDesfazer;
    $('toast').hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => { $('toast').hidden = true; }, comDesfazer ? 6000 : 2500);
  }

  // ---------- desenho ----------
  const alcaItem = () => `<span class="alca alca-item" title="Arraste para mover">${ICONE.alca}</span>`;
  const botaoRemover = (s, it, nome) =>
    `<button type="button" class="mini perigo" data-acao="remover-item" data-s="${s.id}" data-i="${it.id}" title="Remover" aria-label="Remover ${esc(nome || 'item')}">${ICONE.fechar}</button>`;
  const botaoAdd = (s) =>
    `<button type="button" class="botao-add" data-acao="add-item" data-s="${s.id}">+ ${TIPOS[s.tipo].add}</button>`;
  const lista = (s, classe, conteudo) =>
    `<div class="${classe} lista-itens" data-secao="${s.id}" data-tipo="${s.tipo}">${conteudo}</div>`;

  const CORPO = {
    campos(s) {
      const html = s.itens.map((it) => {
        const idv = idc(s, it, 'valor');
        const cab = editando
          ? `<div class="item-ferr">${alcaItem()}<input id="${idc(s, it, 'rotulo')}" data-s="${s.id}" data-i="${it.id}" data-campo="rotulo" value="${esc(it.rotulo)}" aria-label="Nome do campo">${botaoRemover(s, it, it.rotulo)}</div>`
          : `<label for="${idv}">${esc(it.rotulo)}</label>`;
        return `<div class="campo item" data-item="${it.id}">${cab}<input class="val" id="${idv}" data-s="${s.id}" data-i="${it.id}" data-campo="valor" value="${esc(it.valor)}"${editando ? ` aria-label="${esc(it.rotulo)}"` : ''}></div>`;
      }).join('');
      return lista(s, 'campos', html) + (editando ? botaoAdd(s) : '');
    },

    atributos(s) {
      const html = s.itens.map((it) => {
        const ref = `data-s="${s.id}" data-i="${it.id}"`;
        const ferr = editando
          ? `<div class="item-ferr">${alcaItem()}<button type="button" class="mini" data-acao="opcoes" ${ref} title="Opções" aria-label="Opções de ${esc(it.rotulo)}">${ICONE.opcoes}</button>${botaoRemover(s, it, it.rotulo)}</div>`
          : '';
        const rotulo = editando
          ? `<input class="rot-ed" id="${idc(s, it, 'rotulo')}" ${ref} data-campo="rotulo" value="${esc(it.rotulo)}" aria-label="Nome do atributo">`
          : it.rolavel
            ? `<button type="button" class="rot" data-acao="rolar-atributo" ${ref} title="Rolar ${esc(it.rotulo)}">${esc(it.rotulo)}</button>`
            : `<span class="rot">${esc(it.rotulo)}</span>`;
        const valor = `<input class="val" id="${idc(s, it, 'valor')}" ${ref} data-campo="valor" value="${esc(it.valor)}"${it.texto ? '' : ' inputmode="numeric"'} aria-label="${esc(it.rotulo)}">`;
        const frac = it.fracoes ? `<span class="frac" data-frac="${s.id}-${it.id}">${fracTexto(it.valor)}</span>` : '';
        const max = it.maximo === null ? '' :
          `<span class="max">máx <input id="${idc(s, it, 'maximo')}" ${ref} data-campo="maximo" value="${esc(it.maximo)}" inputmode="numeric" aria-label="${esc(it.rotulo)} máximo"></span>
           <div class="ajuste"><button type="button" data-acao="menos" ${ref} aria-label="Diminuir ${esc(it.rotulo)}">−</button><button type="button" data-acao="mais" ${ref} aria-label="Aumentar ${esc(it.rotulo)}">+</button></div>`;
        return `<div class="celula item" data-item="${it.id}">${ferr}${rotulo}${valor}${frac}${max}</div>`;
      }).join('');
      return lista(s, 'grade', html) + (editando ? botaoAdd(s) : '');
    },

    pericias(s) {
      const html = s.itens.map((it) => {
        const ref = `data-s="${s.id}" data-i="${it.id}"`;
        const inicio = editando
          ? alcaItem()
          : `<input type="checkbox" id="${idc(s, it, 'marcada')}" ${ref} data-campo="marcada"${it.marcada ? ' checked' : ''} title="Marcar para evolução" aria-label="Marcar ${esc(it.rotulo)} para evolução">`;
        const nome = editando
          ? `<input class="nome" id="${idc(s, it, 'rotulo')}" ${ref} data-campo="rotulo" value="${esc(it.rotulo)}" aria-label="Nome da perícia">`
          : `<span class="nome">${esc(it.rotulo)}</span>`;
        const fim = editando
          ? botaoRemover(s, it, it.rotulo)
          : `<button type="button" class="dado" data-acao="rolar-pericia" ${ref} aria-label="Rolar ${esc(it.rotulo)}">d%</button>`;
        return `<div class="pericia item" data-item="${it.id}">${inicio}${nome}<input class="valor" id="${idc(s, it, 'valor')}" ${ref} data-campo="valor" value="${esc(it.valor)}" inputmode="numeric" aria-label="Valor de ${esc(it.rotulo)}"><span class="frac" data-frac="${s.id}-${it.id}">${fracTexto(it.valor)}</span>${fim}</div>`;
      }).join('');
      return lista(s, 'pericias', html) + (editando ? botaoAdd(s) : '');
    },

    itens(s) {
      const html = s.itens.map((it) => {
        const ref = `data-s="${s.id}" data-i="${it.id}"`;
        return `<div class="linha-item item" data-item="${it.id}">${editando ? alcaItem() : '<span class="ponto" aria-hidden="true"></span>'}<input class="nome" id="${idc(s, it, 'nome')}" ${ref} data-campo="nome" value="${esc(it.nome)}" placeholder="Nome do item" aria-label="Item"><input class="qtd" id="${idc(s, it, 'qtd')}" ${ref} data-campo="qtd" value="${esc(it.qtd)}" placeholder="qtd" inputmode="numeric" aria-label="Quantidade de ${esc(it.nome || 'item')}">${botaoRemover(s, it, it.nome)}</div>`;
      }).join('');
      // Itens entram e saem durante o jogo, entao adicionar/remover vale nos dois modos.
      return lista(s, 'lista-simples', html) + botaoAdd(s);
    },

    marcadores(s) {
      const html = s.itens.map((it) => {
        const ref = `data-s="${s.id}" data-i="${it.id}"`;
        const cab = editando
          ? `${alcaItem()}<input class="trilha-rot" id="${idc(s, it, 'rotulo')}" ${ref} data-campo="rotulo" value="${esc(it.rotulo)}" aria-label="Nome do marcador">
             <label class="total">caixas <input type="number" min="1" max="40" id="${idc(s, it, 'total')}" ${ref} data-campo="total" value="${it.total}"></label>
             <span class="cores" role="group" aria-label="Cor do marcador">${['verde', 'rosa'].map((c) => `<button type="button" class="bolinha b-${c}" data-acao="cor-trilha" ${ref} data-cor="${c}" aria-pressed="${it.cor === c}" aria-label="Cor: ${c}" title="Cor: ${c}"></button>`).join('')}</span>
             ${botaoRemover(s, it, it.rotulo)}`
          : `<span class="trilha-rot">${esc(it.rotulo)}</span>`;
        const caixas = it.marcados.map((m, k) =>
          `<button type="button" class="caixa${m ? ' on' : ''}" data-acao="caixa" ${ref} data-k="${k}" aria-pressed="${m}" aria-label="${esc(it.rotulo)} ${k + 1}"></button>`).join('');
        return `<div class="trilha trilha-${it.cor} item" data-item="${it.id}">${cab}<div class="caixas">${caixas}</div></div>`;
      }).join('');
      return lista(s, 'trilhas', html) + (editando ? botaoAdd(s) : '');
    },

    texto(s) {
      return `<textarea id="${idc(s, null, 'texto')}" data-s="${s.id}" data-campo="texto" rows="2" placeholder="Escreva aqui…" aria-label="${esc(s.titulo || 'Texto')}">${esc(s.texto)}</textarea>`;
    },
  };

  function renderSecao(s, idx) {
    const cab = [];
    if (editando) {
      cab.push(`<span class="alca alca-secao" title="Arraste para mover a seção">${ICONE.alca}</span>`);
      cab.push(`<input class="secao-titulo" id="${idc(s, null, 'titulo')}" data-s="${s.id}" data-campo="titulo" value="${esc(s.titulo)}" placeholder="Sem título" aria-label="Título da seção">`);
      cab.push(`<div class="secao-ferr">
        <span class="tipo-rot">${TIPOS[s.tipo].nome}</span>
        <span class="cores" role="group" aria-label="Cor da seção">${CORES.map((c) => `<button type="button" class="bolinha b-${c}" data-acao="cor" data-s="${s.id}" data-cor="${c}" aria-pressed="${s.cor === c}" title="Cor: ${NOME_COR[c]}" aria-label="Cor: ${NOME_COR[c]}"></button>`).join('')}</span>
        <button type="button" class="mini" data-acao="subir-secao" data-s="${s.id}" title="Subir" aria-label="Subir seção"${idx === 0 ? ' disabled' : ''}>${ICONE.subir}</button>
        <button type="button" class="mini" data-acao="descer-secao" data-s="${s.id}" title="Descer" aria-label="Descer seção"${idx === estado.secoes.length - 1 ? ' disabled' : ''}>${ICONE.descer}</button>
        <button type="button" class="ferr" data-acao="duplicar-secao" data-s="${s.id}">Duplicar</button>
        <button type="button" class="ferr perigo" data-acao="remover-secao" data-s="${s.id}">Excluir</button>
      </div>`);
    } else if (s.titulo) {
      cab.push(`<h2 class="secao-titulo">${esc(s.titulo)}</h2>`);
    }
    return `<section class="secao cor-${s.cor} tipo-${s.tipo}" data-id="${s.id}">${cab.length ? `<div class="secao-cab">${cab.join('')}</div>` : ''}${CORPO[s.tipo](s)}</section>`;
  }

  function painelNovaSecao() {
    const ordem = ['atributos', 'pericias', 'itens', 'texto', 'marcadores', 'campos'];
    return `<div class="nova-secao"><h2>Adicionar seção</h2><div>${ordem.map((t) =>
      `<button type="button" data-acao="nova-secao" data-tipo="${t}">+ ${TIPOS[t].nome}</button>`).join('')}</div></div>`;
  }

  function crescer(t) {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 2 + 'px';
  }

  function render() {
    document.body.classList.toggle('editando', editando);
    const bt = $('btn-editar');
    bt.setAttribute('aria-pressed', String(editando));
    bt.textContent = editando ? 'Concluir' : 'Editar ficha';

    const titulo = editando
      ? `<input class="titulo-ficha" id="titulo-ficha" value="${esc(estado.titulo)}" placeholder="Título da ficha" aria-label="Título da ficha">`
      : `<h1 class="titulo-ficha">${esc(estado.titulo) || 'Ficha'}</h1>`;
    const vazio = estado.secoes.length ? '' :
      `<p class="vazio">Esta ficha está vazia. ${editando ? 'Adicione uma seção abaixo.' : 'Toque em <b>Editar ficha</b> para montar a sua.'}</p>`;
    $('ficha').innerHTML = titulo + vazio +
      `<div class="secoes" id="secoes">${estado.secoes.map(renderSecao).join('')}</div>` +
      (editando ? painelNovaSecao() : '');

    document.querySelectorAll('#ficha textarea').forEach(crescer);
    ligarArrasto();
    if (focarDepois) {
      const el = $(focarDepois);
      focarDepois = null;
      if (el) { el.focus(); if (el.select) el.select(); }
    }
  }

  // ---------- arrastar ----------
  let arrastos = [];
  function ligarArrasto() {
    arrastos.forEach((a) => a.destroy());
    arrastos = [];
    if (!editando || typeof Sortable === 'undefined') return;

    arrastos.push(Sortable.create($('secoes'), {
      handle: '.alca-secao', draggable: '.secao', animation: 150,
      onEnd(e) {
        if (e.oldDraggableIndex === e.newDraggableIndex) return;
        // O Sortable ja mexeu no DOM; o estado so muda aqui, e o render refaz tudo.
        setTimeout(() => mudar(() => {
          const [s] = estado.secoes.splice(e.oldDraggableIndex, 1);
          estado.secoes.splice(e.newDraggableIndex, 0, s);
        }), 0);
      },
    }));

    document.querySelectorAll('#ficha .lista-itens').forEach((el) => {
      arrastos.push(Sortable.create(el, {
        // Mesmo "group" = da pra arrastar um item pra outra secao do mesmo tipo.
        group: el.dataset.tipo, handle: '.alca-item', draggable: '.item', animation: 150,
        onEnd(e) {
          if (e.from === e.to && e.oldDraggableIndex === e.newDraggableIndex) return;
          const de = secao(e.from.dataset.secao);
          const para = secao(e.to.dataset.secao);
          if (!de || !para) return;
          setTimeout(() => mudar(() => {
            const [it] = de.itens.splice(e.oldDraggableIndex, 1);
            para.itens.splice(e.newDraggableIndex, 0, it);
          }), 0);
        },
      }));
    });
  }

  // ---------- edicao de valores ----------
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'titulo-ficha') { estado.titulo = t.value; salvar(); return; }
    if (t.id === 'expr') return;
    const d = t.dataset;
    if (!d.campo || !d.s) return;
    const s = secao(d.s);
    if (!s) return;
    if (!d.i) {
      s[d.campo] = t.value;
      if (t.tagName === 'TEXTAREA') crescer(t);
      salvar();
      return;
    }
    const it = item(s, d.i);
    if (!it || d.campo === 'total') return; // total muda no "change", porque redesenha as caixas
    if (t.type === 'checkbox') it[d.campo] = t.checked;
    else it[d.campo] = t.value;
    if (d.campo === 'valor') {
      const fr = document.querySelector(`[data-frac="${s.id}-${it.id}"]`);
      if (fr) fr.textContent = fracTexto(it.valor);
    }
    salvar();
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'arquivo') { importar(t); return; }
    if (t.dataset.campo !== 'total') return;
    const s = secao(t.dataset.s);
    const it = item(s, t.dataset.i);
    if (!it) return;
    const total = limitar(inteiro(t.value) || 1, 1, 40);
    if (total === it.total) { t.value = total; return; }
    mudar(() => {
      it.total = total;
      it.marcados = Array.from({ length: total }, (_, i) => !!it.marcados[i]);
    });
  });

  // ---------- cliques ----------
  let opcoesAbertas = null;

  document.addEventListener('click', (e) => {
    const menu = $('menu');
    if (!menu.hidden && !e.target.closest('.menu-wrap')) fecharMenu();

    const b = e.target.closest('[data-acao]');
    if (!b || b.disabled) return;
    const a = b.dataset.acao;
    const s = b.dataset.s ? secao(b.dataset.s) : null;
    const it = s && b.dataset.i ? item(s, b.dataset.i) : null;

    switch (a) {
      case 'editar':
        editando = !editando;
        try { localStorage.setItem(CHAVE_EDITANDO, editando ? '1' : '0'); } catch (err) { /* ok */ }
        render();
        break;
      case 'desfazer': desfazer(); break;
      case 'menu': {
        const abrir = menu.hidden;
        menu.hidden = !abrir;
        b.setAttribute('aria-expanded', String(abrir));
        if (abrir) menu.querySelector('button').focus();
        break;
      }
      case 'exportar': fecharMenu(); exportar(); break;
      case 'importar': fecharMenu(); $('arquivo').click(); break;
      case 'restaurar':
        fecharMenu();
        mudar(() => { estado = fichaOriginal(); }, 'Ficha original restaurada');
        break;

      case 'mais': case 'menos': {
        if (!it) break;
        it.valor = String((inteiro(it.valor) || 0) + (a === 'mais' ? 1 : -1));
        const campo = $(idc(s, it, 'valor'));
        if (campo) campo.value = it.valor;
        const fr = document.querySelector(`[data-frac="${s.id}-${it.id}"]`);
        if (fr) fr.textContent = fracTexto(it.valor);
        salvar();
        break;
      }
      case 'caixa': {
        if (!it) break;
        const k = +b.dataset.k;
        it.marcados[k] = !it.marcados[k];
        b.classList.toggle('on', it.marcados[k]);
        b.setAttribute('aria-pressed', String(it.marcados[k]));
        salvar();
        break;
      }
      case 'rolar-atributo': if (it) rolarAtributo(it); break;
      case 'rolar-pericia': if (it) rolarD100(it.rotulo || 'Perícia', it.valor); break;
      case 'modo':
        modo = +b.dataset.modo;
        document.querySelectorAll('[data-acao="modo"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        break;

      case 'add-item':
        if (!s) break;
        mudar(() => {
          const novo = normalizarItem(s.tipo, TIPOS[s.tipo].novoItem());
          s.itens.push(novo);
          focarDepois = idc(s, novo, s.tipo === 'itens' ? 'nome' : 'rotulo');
        });
        break;
      case 'remover-item':
        if (!s || !it) break;
        mudar(() => { s.itens = s.itens.filter((x) => x !== it); },
          `${nomeDoItem(s, it) ? '“' + nomeDoItem(s, it) + '”' : 'Item'} removido`);
        break;
      case 'opcoes': if (it) abrirOpcoes(s, it); break;
      case 'cor': if (s) mudar(() => { s.cor = b.dataset.cor; }); break;
      case 'cor-trilha': if (it) mudar(() => { it.cor = b.dataset.cor; }); break;

      case 'subir-secao': case 'descer-secao': {
        const i = estado.secoes.indexOf(s);
        const j = a === 'subir-secao' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= estado.secoes.length) break;
        mudar(() => {
          estado.secoes.splice(i, 1);
          estado.secoes.splice(j, 0, s);
          focarDepois = null;
        });
        break;
      }
      case 'duplicar-secao':
        if (!s) break;
        mudar(() => { estado.secoes.splice(estado.secoes.indexOf(s) + 1, 0, copiarSecao(s)); }, 'Seção duplicada');
        break;
      case 'remover-secao':
        if (!s) break;
        mudar(() => { estado.secoes = estado.secoes.filter((x) => x !== s); },
          `Seção ${s.titulo ? '“' + s.titulo + '” ' : ''}excluída`);
        break;
      case 'nova-secao': {
        const tipo = b.dataset.tipo;
        if (!TIPOS[tipo]) break;
        mudar(() => {
          const nova = novaSecao(tipo);
          estado.secoes.push(nova);
          focarDepois = idc(nova, null, 'titulo');
        });
        break;
      }
    }
  });

  function nomeDoItem(s, it) { return s.tipo === 'itens' ? it.nome : it.rotulo; }

  function fecharMenu() {
    $('menu').hidden = true;
    $('btn-menu').setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('menu').hidden) { fecharMenu(); $('btn-menu').focus(); }
    const campo = e.target.closest && e.target.closest('input, textarea');
    if (!campo && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      desfazer();
    }
  });

  // ---------- opcoes do atributo ----------
  function abrirOpcoes(s, it) {
    opcoesAbertas = { s: s.id, i: it.id };
    $('dlg-opcoes-titulo').textContent = `Opções de ${it.rotulo || 'atributo'}`;
    $('op-fracoes').checked = it.fracoes;
    $('op-rolavel').checked = it.rolavel;
    $('op-maximo').checked = it.maximo !== null;
    $('op-texto').checked = it.texto;
    $('dlg-opcoes').returnValue = '';
    $('dlg-opcoes').showModal();
  }
  $('dlg-opcoes').addEventListener('close', () => {
    const dlg = $('dlg-opcoes');
    if (dlg.returnValue !== 'ok' || !opcoesAbertas) return;
    const s = secao(opcoesAbertas.s);
    const it = item(s, opcoesAbertas.i);
    opcoesAbertas = null;
    if (!it) return;
    mudar(() => {
      it.fracoes = $('op-fracoes').checked;
      it.rolavel = $('op-rolavel').checked;
      it.texto = $('op-texto').checked;
      if ($('op-maximo').checked) { if (it.maximo === null) it.maximo = it.valor; } else it.maximo = null;
    });
  });

  // ---------- exportar / importar ----------
  function exportar() {
    gravarAgora();
    const campoNome = estado.secoes.filter((s) => s.tipo === 'campos')
      .flatMap((s) => s.itens).find((c) => c.valor && /personagem|nome/i.test(c.rotulo));
    const base = (campoNome ? campoNome.valor : estado.titulo) || 'ficha';
    const slug = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ficha';
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Ficha exportada', false);
  }

  function importar(input) {
    const arq = input.files && input.files[0];
    input.value = '';
    if (!arq) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      let dados;
      try { dados = JSON.parse(leitor.result); } catch (e) { dados = null; }
      if (!dados || !Array.isArray(dados.secoes)) {
        toast('Esse arquivo não é uma ficha exportada daqui', false);
        return;
      }
      mudar(() => { estado = normalizar(dados); }, 'Ficha importada');
    };
    leitor.onerror = () => toast('Não consegui ler o arquivo', false);
    leitor.readAsText(arq);
  }

  // ---------- dados ----------
  // d100 no estilo Chamado de Cthulhu 7a ed.: metade = dificil, quinto = extremo,
  // 01 = critico, 100 (ou 96+ com alvo abaixo de 50) = desastre.
  let modo = 0;
  const historico = [];

  function rolarD100(nome, alvoTxt) {
    const alvo = inteiro(alvoTxt);
    if (alvo === null) { toast(`“${nome}” não tem um número para rolar contra`, false); return; }
    const uni = aleatorio(10);
    const dezenas = Array.from({ length: 1 + Math.abs(modo) }, () => aleatorio(10));
    const valores = dezenas.map((dz) => (dz * 10 + uni) || 100);
    const r = modo > 0 ? Math.min(...valores) : modo < 0 ? Math.max(...valores) : valores[0];
    let veredito; let ok;
    if (r === 1) { veredito = 'Crítico!'; ok = true; }
    else if (r === 100 || (alvo < 50 && r >= 96)) { veredito = 'Desastre'; ok = false; }
    else if (r <= Math.floor(alvo / 5)) { veredito = 'Sucesso extremo'; ok = true; }
    else if (r <= Math.floor(alvo / 2)) { veredito = 'Sucesso difícil'; ok = true; }
    else if (r <= alvo) { veredito = 'Sucesso'; ok = true; }
    else { veredito = 'Falha'; ok = false; }
    const extra = modo ? ` · ${modo > 0 ? 'bônus' : 'penalidade'} (${valores.join(' / ')})` : '';
    mostrar(String(r).padStart(2, '0'), veredito, ok ? 'sucesso' : 'falha',
      `${nome} ${alvo} · ${Math.floor(alvo / 2)} · ${Math.floor(alvo / 5)}${extra}`, `${nome} ${r}`);
  }

  function rolarExpressao(expr) {
    const limpo = str(expr).toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
    if (!limpo || !/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(limpo)) return null;
    let total = 0;
    const partes = [];
    for (const termo of limpo.match(/[+-]?(\d*d\d+|\d+)/g)) {
      const sinal = termo[0] === '-' ? -1 : 1;
      const corpo = termo.replace(/^[+-]/, '');
      if (corpo.includes('d')) {
        const [q, f] = corpo.split('d');
        const qtd = q === '' ? 1 : +q;
        const faces = +f;
        if (qtd < 1 || qtd > 100 || faces < 2 || faces > 1000) return null;
        const rs = Array.from({ length: qtd }, () => 1 + aleatorio(faces));
        total += sinal * rs.reduce((x, y) => x + y, 0);
        partes.push(`${sinal < 0 ? '−' : partes.length ? '+' : ''}${qtd}d${faces} [${rs.join(', ')}]`);
      } else {
        total += sinal * +corpo;
        partes.push(`${sinal < 0 ? '−' : partes.length ? '+' : ''}${corpo}`);
      }
    }
    return { total, detalhe: partes.join(' ') };
  }

  function rolarLivre(expr, nome) {
    const r = rolarExpressao(expr);
    if (!r) { toast(`“${expr}” não é uma rolagem. Tente algo como 1d6+1d4`, false); return; }
    mostrar(String(r.total), nome || str(expr).replace(/\s+/g, ''), '', r.detalhe, `${nome || expr} ${r.total}`);
  }

  function rolarAtributo(it) {
    if (it.texto) rolarLivre(it.valor, it.rotulo);
    else rolarD100(it.rotulo || 'Atributo', it.valor);
  }

  function mostrar(num, veredito, classe, contra, registro) {
    const n = $('r-num');
    n.textContent = num;
    n.classList.remove('girando');
    void n.offsetWidth;
    n.classList.add('girando');
    $('r-ver').textContent = veredito;
    $('r-ver').className = 'veredito' + (classe ? ' ' + classe : '');
    $('r-contra').textContent = contra;
    historico.unshift(registro);
    historico.length = Math.min(historico.length, 7);
    $('r-hist').textContent = historico.slice(1).join('  ·  ');
  }

  $('form-expr').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('expr').value.trim();
    if (v) rolarLivre(v, '');
  });

  // A barra de dados e fixa; o fim da ficha nao pode ficar escondido atras dela.
  const barra = $('barra');
  const ajustarFolga = () => { document.body.style.paddingBottom = barra.offsetHeight + 32 + 'px'; };
  if ('ResizeObserver' in window) new ResizeObserver(ajustarFolga).observe(barra);
  window.addEventListener('resize', ajustarFolga);

  render();
  ajustarFolga();
  let jaSalva = false;
  try { jaSalva = !!localStorage.getItem(CHAVE); } catch (e) { /* sem armazenamento */ }
  status(jaSalva ? 'Salvo neste aparelho' : 'Ficha original · suas mudanças salvam neste aparelho');
})();
