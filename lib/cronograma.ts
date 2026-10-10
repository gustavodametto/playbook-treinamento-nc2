import { parseCsv } from "./csv";
import { CSV_PREMIUM } from "@/data/cronograma-premium";

// Lê ao vivo a aba de cronograma da planilha "Cronograma Treinamento NC2 Spot - 15102026".
// Colunas achadas pelo cabeçalho: reordenar ou incluir colunas na planilha não quebra.
export type Disparo = {
  id: string;
  data: string; // aaaa-mm-dd
  dia: string;
  horario: string;
  base: string;
  tipo: string;
  mensagem: string; // código, ex.: M1
  nome: string; // ex.: Convite
  gancho: string;
  objetivo: string;
  texto: string;
  obs: string;
  status: string; // "Status do disparo" da planilha
  arte: string | null; // /artes/mN.jpeg quando existe arte para a mensagem
  numeros: { enviados: number | null; recebidos: number | null; lidos: number | null; cliques: number | null; inscritos: number | null };
};

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const numero = (v: string): number | null => {
  const d = (v || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return d === "" || isNaN(Number(d)) ? null : Math.round(Number(d));
};

// "08/10/2026" -> "2026-10-08"
const isoData = (v: string) => {
  const m = (v || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : (v || "").trim();
};

// Link de confirmação do investidor (bloco B das mensagens). Se a planilha ainda tiver o marcador, o site já troca.
const LINK_INVESTIDOR = process.env.LINK_INVESTIDOR || "https://forms.gle/UHxkLakC5uN8JTsd7";
const comLinks = (t: string) => t.replaceAll("[LINK DE CONFIRMAÇÃO DO INVESTIDOR]", LINK_INVESTIDOR);

// Artes em PNG em public/artes. Escolhe pelo assunto da mensagem (vale para o layout de 5 ou de 6 mensagens);
// sem assunto reconhecido, usa a arte do mesmo número (m1.png ... m6.png).
const ARTES = new Set(["m1", "m2", "m3", "m4", "m5", "m6"]);
function arteDe(codigo: string, nome: string): string | null {
  const n = norm(nome);
  if (/entrando no ar|e hoje/.test(n)) return "/artes/m6.png";
  if (/sem entrada/.test(n)) return "/artes/m5.png";
  const k = codigo.toLowerCase().replace(/^p(?=\d)/, "m"); // P1..P5 (Premium) usam as artes M1..M5
  return ARTES.has(k) ? `/artes/${k}.png` : null;
}

export type Lista = "pool" | "premium";

// De onde vem cada cronograma (sobrescreva por variável de ambiente no Vercel, se mudar de aba).
// Pool = "Cronograma Treinamento NC2 Spot - 15102026", aba gid 531412351.
// Premium = planilha própria, aba gid 1951678217. Se ela não abrir (sem compartilhamento), usa o CSV embutido em data/cronograma-premium.ts.
const FONTES: Record<Lista, { planilha: string; gid: string; url?: string; nome: string }> = {
  pool: {
    planilha: process.env.CRONO_SHEET_ID || "1nyVoQuxGqJIRwVZ1jXXeLx3-NXuvHdEgx7_nyF_fm7k",
    gid: process.env.CRONO_SHEET_GID || "531412351",
    url: process.env.CRONO_CSV_URL,
    nome: "Cronograma Treinamento NC2 Spot · aba Pool",
  },
  premium: {
    planilha: process.env.CRONO_PREMIUM_SHEET_ID || "1Z7tQbT7Q2WetBKstF77tItS-SpwrLjxDnnndIOdWYd8",
    gid: process.env.CRONO_PREMIUM_GID || "1951678217",
    url: process.env.CRONO_PREMIUM_CSV_URL,
    nome: "Cronograma Premium",
  },
};

const ERRO_ACESSO = "Não consegui ler a planilha do cronograma. Em Compartilhar, deixe \"Qualquer pessoa com o link: Leitor\".";

async function baixarCsv(lista: Lista): Promise<{ txt: string; fonte: string; aviso?: string }> {
  const f = FONTES[lista];
  const url = f.url || `https://docs.google.com/spreadsheets/d/${f.planilha}/gviz/tq?tqx=out:csv&gid=${f.gid}`;
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    const txt = await res.text();
    if (!res.ok || /^\s*<(!doctype|html)/i.test(txt)) throw new Error(ERRO_ACESSO);
    return { txt, fonte: f.nome };
  } catch (e) {
    if (lista !== "premium") throw e;
    return {
      txt: CSV_PREMIUM,
      fonte: "cópia salva no site (Cronograma Premium)",
      aviso: "A planilha Premium não está compartilhada: mostrando a cópia salva no site. Em Compartilhar, deixe \"Qualquer pessoa com o link: Leitor\" para o painel ler ao vivo.",
    };
  }
}

export async function carregarCronograma(lista: Lista = "pool"): Promise<{ disparos: Disparo[]; fonte: string; aviso?: string }> {
  const { txt, fonte, aviso } = await baixarCsv(lista);
  return { disparos: montar(txt, lista), fonte, aviso };
}

function montar(txt: string, lista: Lista): Disparo[] {
  const linhas = parseCsv(txt);
  if (linhas.length < 2) return [];
  const head = linhas[0].map(norm);
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const c = {
    data: col(/^data$/), dia: col(/^dia$/), horario: col(/horario|hora/), base: col(/^base/), tipo: col(/^tipo/),
    mensagem: col(/^mensagem$/), gancho: col(/gancho/), objetivo: col(/objetivo/), texto: col(/whatsapp|copiar/),
    enviados: col(/^enviados/), recebidos: col(/^recebidos/), lidos: col(/^lidos/), cliques: col(/clique/),
    inscritos: col(/^inscritos/), obs: col(/observa/), status: col(/status/), arte: col(/^arte/),
  };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  const usados = new Map<string, number>();
  return linhas.slice(1)
    .filter((r) => get(r, c.data) && get(r, c.texto))
    .map((r) => {
      const data = isoData(get(r, c.data));
      const base = get(r, c.base);
      const msg = get(r, c.mensagem);
      const [codigo, ...resto] = msg.split("·").map((x) => x.trim());
      // Mesmo formato de id da versão anterior (data-base-mN), para manter os checks já marcados.
      // Premium ganha prefixo próprio para nunca misturar o check com o do Pool.
      let id = `${lista === "premium" ? "premium:" : ""}${data}-${base.replace(/\s+/g, "").toLowerCase()}-${(codigo || "msg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const n = (usados.get(id) ?? 0) + 1;
      usados.set(id, n);
      if (n > 1) id += `-${n}`;
      return {
        id, data, base,
        dia: get(r, c.dia),
        horario: get(r, c.horario),
        tipo: get(r, c.tipo),
        mensagem: codigo || msg,
        nome: resto.join(" · ") || msg,
        gancho: get(r, c.gancho),
        objetivo: get(r, c.objetivo),
        texto: comLinks(get(r, c.texto)),
        obs: get(r, c.obs),
        status: get(r, c.status),
        arte: arteDe(codigo || "", resto.join(" · ") || msg),
        numeros: {
          enviados: numero(get(r, c.enviados)),
          recebidos: numero(get(r, c.recebidos)),
          lidos: numero(get(r, c.lidos)),
          cliques: numero(get(r, c.cliques)),
          inscritos: numero(get(r, c.inscritos)),
        },
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
}
