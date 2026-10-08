import { parseCsv } from "./csv";

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

export async function carregarCronograma(): Promise<Disparo[]> {
  const id = process.env.CRONO_SHEET_ID || "1nyVoQuxGqJIRwVZ1jXXeLx3-NXuvHdEgx7_nyF_fm7k";
  const gid = process.env.CRONO_SHEET_GID || "855533029";
  const url = process.env.CRONO_CSV_URL || `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  const txt = await res.text();
  if (!res.ok || /^\s*<(!doctype|html)/i.test(txt)) {
    throw new Error("Não consegui ler a planilha do cronograma. Em Compartilhar, deixe \"Qualquer pessoa com o link: Leitor\".");
  }

  const linhas = parseCsv(txt);
  if (linhas.length < 2) return [];
  const head = linhas[0].map(norm);
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const c = {
    data: col(/^data$/), dia: col(/^dia$/), horario: col(/horario|hora/), base: col(/^base/), tipo: col(/^tipo/),
    mensagem: col(/^mensagem$/), gancho: col(/gancho/), objetivo: col(/objetivo/), texto: col(/whatsapp|copiar/),
    enviados: col(/^enviados/), recebidos: col(/^recebidos/), lidos: col(/^lidos/), cliques: col(/clique/),
    inscritos: col(/^inscritos/), obs: col(/observa/), status: col(/status/),
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
      let id = `${data}-${base.replace(/\s+/g, "").toLowerCase()}-${(codigo || "msg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
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
        texto: get(r, c.texto),
        obs: get(r, c.obs),
        status: get(r, c.status),
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
