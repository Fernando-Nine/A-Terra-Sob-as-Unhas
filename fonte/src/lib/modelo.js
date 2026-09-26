// O modelo da ficha. A ficha e uma lista de secoes; cada secao tem um tipo e
// uma lista de itens. Nada do layout e fixo. Este formato e o mesmo da versao
// anterior, entao fichas salvas e arquivos exportados continuam valendo.

export const str = (v) => (v == null ? '' : String(v));
export const uid = () => Math.random().toString(36).slice(2, 10);
export const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
export const inteiro = (v) => { const n = parseInt(str(v).trim(), 10); return Number.isNaN(n) ? null : n; };
export const metade = (v) => Math.floor((inteiro(v) ?? 0) / 2);
export const quinto = (v) => Math.floor((inteiro(v) ?? 0) / 5);
export const fracTexto = (v) => (inteiro(v) === null ? '' : `${metade(v)} · ${quinto(v)}`);

export const CORES = ['verde', 'rosa', 'neutro'];
export const NOME_COR = { verde: 'Verde', rosa: 'Rosa', neutro: 'Sem cor' };

export const TIPOS = {
  atributos: {
    nome: 'Atributos', add: 'Atributo', titulo: 'Atributos', cor: 'verde',
    descricao: 'FOR, DES, INT… com metade e quinto',
    novoItem: () => ({ rotulo: 'NOVO', valor: '50', fracoes: true, rolavel: true, maximo: null, texto: false }),
  },
  status: {
    // Nao e um tipo de verdade: cria uma secao de atributos com PV, PM e SAN.
    nome: 'Status', descricao: 'PV, PM e SAN com máximo e − / +', atalho: true,
  },
  pericias: {
    nome: 'Perícias', add: 'Perícia', titulo: 'Perícias', cor: 'verde',
    descricao: 'lista com valor e rolagem',
    novoItem: () => ({ rotulo: 'Nova perícia', valor: '5' }),
  },
  itens: {
    nome: 'Lista de itens', add: 'Item', titulo: 'Equipamento', cor: 'neutro',
    descricao: 'equipamento, com quantidade',
    novoItem: () => ({ nome: '', qtd: '' }),
  },
  texto: { nome: 'Texto', titulo: 'Anotações', cor: 'neutro', descricao: 'segredos, histórico, notas' },
  marcadores: {
    nome: 'Marcadores', add: 'Marcador', titulo: 'Marcadores', cor: 'neutro',
    descricao: 'trilhas de caixinhas',
    novoItem: () => ({ rotulo: 'Marcador', total: 5, marcados: [], cor: 'verde' }),
  },
  campos: {
    nome: 'Campos', add: 'Campo', titulo: 'Dados', cor: 'neutro',
    descricao: 'ocupação, idade, jogador…',
    novoItem: () => ({ rotulo: 'Novo campo', valor: '' }),
  },
};

export const ORDEM_NOVAS = ['status', 'atributos', 'pericias', 'itens', 'texto', 'marcadores', 'campos'];

export function normalizarItem(tipo, bruto) {
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
  if (tipo === 'itens') { n.nome = str(n.nome); n.qtd = str(n.qtd); }
  if (tipo === 'marcadores') {
    n.total = limitar(inteiro(n.total) || 1, 1, 40);
    const m = Array.isArray(it.marcados) ? it.marcados : [];
    n.marcados = Array.from({ length: n.total }, (_, i) => !!m[i]);
    n.cor = n.cor === 'rosa' ? 'rosa' : 'verde';
  }
  return n;
}

export function normalizar(bruto) {
  const f = { titulo: str(bruto && bruto.titulo), secoes: [] };
  const secoes = bruto && Array.isArray(bruto.secoes) ? bruto.secoes : [];
  const vistos = new Set();
  for (const s of secoes) {
    if (!s || !TIPOS[s.tipo] || TIPOS[s.tipo].atalho) continue;
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

export const fichaVazia = () => ({ titulo: '', secoes: [] });

export function novaSecao(tipo) {
  if (tipo === 'status') {
    const A = (rotulo, v) => ({ rotulo, valor: String(v), maximo: String(v), fracoes: false, rolavel: false, texto: false });
    const s = normalizar({ secoes: [{ tipo: 'atributos', titulo: 'Status', cor: 'rosa', itens: [A('PV', 10), A('PM', 10), A('SAN', 50)] }] }).secoes[0];
    s.itens[2].rolavel = true; // SAN costuma ser rolada
    return s;
  }
  const base = { tipo, titulo: TIPOS[tipo].titulo, cor: TIPOS[tipo].cor };
  if (tipo === 'texto') base.texto = '';
  else base.itens = [TIPOS[tipo].novoItem()];
  return normalizar({ secoes: [base] }).secoes[0];
}

export function copiarSecao(s) {
  const c = structuredClone(s);
  c.id = uid();
  if (c.itens) c.itens.forEach((it) => { it.id = uid(); });
  return c;
}

export const nomeDoItem = (tipo, it) => (tipo === 'itens' ? it.nome : it.rotulo);

// Status que os outros na sala veem: atributos com maximo (PV, PM, SAN…) ou com
// nome de status conhecido, e os marcadores. Pequeno de proposito: vai pra todos.
const NOME_STATUS = /^(pv|pm|san|sanidade|vida|hp|mp|sorte|pontos de vida|pontos de magia)$/i;
export function resumoStatus(ficha) {
  const contadores = [];
  const marcadores = [];
  for (const s of ficha.secoes) {
    if (s.tipo === 'atributos') {
      for (const it of s.itens) {
        if (it.maximo !== null || NOME_STATUS.test(it.rotulo.trim())) {
          contadores.push({ rotulo: it.rotulo.slice(0, 24), valor: it.valor.slice(0, 12), max: it.maximo === null ? '' : it.maximo.slice(0, 12) });
        }
      }
    } else if (s.tipo === 'marcadores') {
      for (const it of s.itens) {
        marcadores.push({ rotulo: it.rotulo.slice(0, 24), total: it.total, marcados: it.marcados.filter(Boolean).length, cor: it.cor });
      }
    }
  }
  return { nome: ficha.titulo.slice(0, 60), contadores: contadores.slice(0, 8), marcadores: marcadores.slice(0, 8) };
}
