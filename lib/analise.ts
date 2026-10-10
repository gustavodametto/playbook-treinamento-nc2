export type Resposta = {
  ts: string | null; // ISO
  nome: string;
  whatsapp: string;
  chave: string; // telefone canônico (sem 55, sem 9º dígito)
  vendeu: boolean | null;
  investidor: boolean | null;
  dificuldade: string;
  duplicado: boolean;
  farmer?: string | null; // farmer responsável (Nekt), pelo telefone
};

export type Tema = { id: string; titulo: string; qtd: number; pct: number; exemplos: string[] };

export type Dados = {
  atualizadoEm: string;
  demo: boolean;
  respostas: Resposta[];
  metricas: {
    respostasBrutas: number;
    inscritos: number; // únicos por WhatsApp
    duplicados: number;
    jaVenderam: number;
    nuncaVenderam: number;
    comInvestidor: number;
    semInvestidor: number;
    comDificuldade: number;
    porDia: { dia: string; qtd: number }[];
  };
  temas: Tema[];
  sintese: { texto: string | null; origem: "ia" | "temas" | "vazio" };
  farmersAtualizadoEm?: string;
};

// Chave canônica de telefone BR: sem 55 e sem o 9º dígito (evita contar a mesma pessoa duas vezes).
export function chaveTelefone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.length === 11 && d[2] === "9") d = d.slice(0, 2) + d.slice(3);
  return d;
}

function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function simNao(v: string): boolean | null {
  const n = norm(v);
  if (!n) return null;
  if (n.startsWith("sim") || n.startsWith("ja vend") || n.startsWith("tenho") || n.startsWith("s ")) return true;
  if (n.startsWith("nao") || n.startsWith("ainda nao") || n.startsWith("n ")) return false;
  return null;
}

// "08/10/2026 10:30:15" (pt-BR) ou ISO -> ISO (horário de Brasília tratado como UTC-3)
export function parseTs(v: string): string | null {
  const m = (v || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${s.padStart(2, "0")}-03:00`;
    return isNaN(Date.parse(iso)) ? null : iso;
  }
  const t = Date.parse(v);
  return isNaN(t) ? null : new Date(t).toISOString();
}

// Agrupa só respostas IGUAIS (ignorando maiúsculas, acentos, pontuação e espaços). Nenhum tema é inventado:
// o título de cada grupo é a própria resposta preenchida no Forms.
function chaveResposta(texto: string) {
  return norm(texto).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function montarTemas(respostas: Resposta[]): Tema[] {
  const base = respostas.filter((r) => !r.duplicado && r.dificuldade.trim());
  const total = base.length || 1;
  const grupos = new Map<string, { redacoes: Map<string, number>; qtd: number }>();
  for (const r of base) {
    const original = r.dificuldade.trim();
    const k = chaveResposta(original) || original.toLowerCase();
    const g = grupos.get(k) ?? { redacoes: new Map<string, number>(), qtd: 0 };
    g.qtd++;
    g.redacoes.set(original, (g.redacoes.get(original) ?? 0) + 1);
    grupos.set(k, g);
  }
  return [...grupos.entries()]
    .map(([id, g]) => {
      const redacoes = [...g.redacoes.entries()].sort((x, y) => y[1] - x[1]).map(([t]) => t);
      return { id, titulo: redacoes[0], qtd: g.qtd, pct: Math.round((g.qtd / total) * 100), exemplos: redacoes.slice(1, 4) };
    })
    .sort((x, y) => y.qtd - x.qtd || x.titulo.localeCompare(y.titulo, "pt-BR"));
}

// Resumo sem IA: só conta o que foi escrito. Nada é interpretado.
export function textoSinteseTemas(temas: Tema[], totalComResposta: number): string | null {
  if (!totalComResposta || !temas.length) return null;
  const repetidas = temas.filter((t) => t.qtd > 1).slice(0, 3);
  if (!repetidas.length) return `${totalComResposta} resposta(s) preenchida(s), todas diferentes entre si. Veja a lista abaixo, resposta por resposta.`;
  const lista = repetidas.map((t) => `"${t.titulo}" (${t.qtd})`).join("; ");
  return `Entre ${totalComResposta} respostas preenchidas, as mais repetidas são: ${lista}.`;
}

export function montarMetricas(respostas: Resposta[]) {
  const unicos = respostas.filter((r) => !r.duplicado);
  const porDiaMap = new Map<string, number>();
  for (const r of unicos) {
    if (!r.ts) continue;
    const dia = new Date(new Date(r.ts).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
    porDiaMap.set(dia, (porDiaMap.get(dia) ?? 0) + 1);
  }
  const porDia = [...porDiaMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, qtd]) => ({ dia, qtd }));
  return {
    respostasBrutas: respostas.length,
    inscritos: unicos.length,
    duplicados: respostas.length - unicos.length,
    jaVenderam: unicos.filter((r) => r.vendeu === true).length,
    nuncaVenderam: unicos.filter((r) => r.vendeu === false).length,
    comInvestidor: unicos.filter((r) => r.investidor === true).length,
    semInvestidor: unicos.filter((r) => r.investidor === false).length,
    comDificuldade: unicos.filter((r) => r.dificuldade.trim()).length,
    porDia,
  };
}

// Converte linhas da planilha em respostas, achando as colunas pelo texto do cabeçalho.
export function linhasParaRespostas(linhas: string[][]): Resposta[] {
  if (linhas.length < 2) return [];
  const head = linhas[0].map(norm);
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iTs = col(/carimbo|data/), iNome = col(/nome/), iZap = col(/whatsapp|telefone|celular/);
  const iVend = col(/vendeu/), iInv = col(/investidor/), iDif = col(/dificuldade/);
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  const vistos = new Set<string>();
  const out: Resposta[] = [];
  for (const r of linhas.slice(1)) {
    const whatsapp = get(r, iZap);
    const chave = chaveTelefone(whatsapp);
    const id = chave || `${get(r, iNome)}-${get(r, iTs)}`;
    const duplicado = vistos.has(id);
    vistos.add(id);
    out.push({
      ts: parseTs(get(r, iTs)),
      nome: get(r, iNome),
      whatsapp,
      chave,
      vendeu: simNao(get(r, iVend)),
      investidor: simNao(get(r, iInv)),
      dificuldade: get(r, iDif),
      duplicado,
    });
  }
  return out.sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? ""));
}
