// Rolagens. d100 no estilo Chamado de Cthulhu 7a ed.: metade = dificil,
// quinto = extremo, 01 = critico, 100 (ou 96+ com alvo abaixo de 50) = desastre.
import { inteiro, str, uid } from './modelo.js';

export function aleatorio(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

// modo: -1 penalidade, 0 normal, 1 bonus
export function rolarD100(nome, alvoTxt, modo = 0) {
  const alvo = inteiro(alvoTxt);
  if (alvo === null) return null;
  const uni = aleatorio(10);
  const valores = Array.from({ length: 1 + Math.abs(modo) }, () => (aleatorio(10) * 10 + uni) || 100);
  const r = modo > 0 ? Math.min(...valores) : modo < 0 ? Math.max(...valores) : valores[0];
  let veredito; let classe;
  if (r === 1) { veredito = 'Crítico!'; classe = 'sucesso'; }
  else if (r === 100 || (alvo < 50 && r >= 96)) { veredito = 'Desastre'; classe = 'falha'; }
  else if (r <= Math.floor(alvo / 5)) { veredito = 'Sucesso extremo'; classe = 'sucesso'; }
  else if (r <= Math.floor(alvo / 2)) { veredito = 'Sucesso difícil'; classe = 'sucesso'; }
  else if (r <= alvo) { veredito = 'Sucesso'; classe = 'sucesso'; }
  else { veredito = 'Falha'; classe = 'falha'; }
  const extra = modo ? ` · ${modo > 0 ? 'bônus' : 'penalidade'} (${valores.join(' / ')})` : '';
  return {
    id: uid(), t: Date.now(), num: String(r).padStart(2, '0'), veredito, classe,
    contra: `${nome} ${alvo} · ${Math.floor(alvo / 2)} · ${Math.floor(alvo / 5)}${extra}`,
  };
}

export function rolarExpressao(expr, nome) {
  const limpo = str(expr).toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
  if (!limpo || !/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(limpo)) return null;
  let total = 0;
  const partes = [];
  for (const termo of limpo.match(/[+-]?(\d*d\d+|\d+)/g)) {
    const sinal = termo[0] === '-' ? -1 : 1;
    const corpo = termo.replace(/^[+-]/, '');
    const pref = sinal < 0 ? '− ' : partes.length ? '+ ' : '';
    if (corpo.includes('d')) {
      const [q, f] = corpo.split('d');
      const qtd = q === '' ? 1 : +q;
      const faces = +f;
      if (qtd < 1 || qtd > 100 || faces < 2 || faces > 1000) return null;
      const rs = Array.from({ length: qtd }, () => 1 + aleatorio(faces));
      total += sinal * rs.reduce((x, y) => x + y, 0);
      partes.push(`${pref}${qtd}d${faces} [${rs.join(', ')}]`);
    } else {
      total += sinal * +corpo;
      partes.push(`${pref}${corpo}`);
    }
  }
  return {
    id: uid(), t: Date.now(), num: String(total), veredito: nome || limpo, classe: '',
    contra: partes.join(' '),
  };
}
