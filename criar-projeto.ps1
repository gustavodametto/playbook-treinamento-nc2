# Instalador do Playbook Treinamento NC2
# Uso: salve este arquivo como criar-projeto.ps1 e rode no terminal:  pwsh -File .\criar-projeto.ps1
# Cria a pasta treinamento-nc2 com todos os arquivos, instala as dependencias e sobe em http://localhost:3100
param([switch]$SemInstalar)
$ErrorActionPreference = 'Stop'
$raiz = Join-Path (Get-Location) 'treinamento-nc2'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Gravar([string]$caminho, [string]$conteudo) {
  $destino = Join-Path $raiz $caminho
  New-Item -ItemType Directory -Force -Path (Split-Path $destino) | Out-Null
  [System.IO.File]::WriteAllText($destino, $conteudo.TrimEnd() + "`n", $utf8)
  Write-Host "criado: $caminho"
}

Gravar 'package.json' @'
{
  "name": "treinamento-nc2",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start -p 3100"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
'@

Gravar 'tsconfig.json' @'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@

Gravar 'next.config.mjs' @'
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
'@

Gravar '.gitignore' @'
node_modules
.next
.env
.env.local
.vercel
next-env.d.ts
*.tsbuildinfo
'@

Gravar '.env.example' @'
# Planilha de respostas do Forms (a do link). Defaults já apontam para ela.
SHEET_ID=1YjRi_2b3R_ZR7YbRX3Ir5KUll9AFrW-87HPhouDsa50
SHEET_GID=298661079
# Opcional: URL de CSV "Publicar na Web" (substitui SHEET_ID/GID)
# SHEET_CSV_URL=

# Protege o painel com senha (HTTP Basic Auth). Recomendado: a base tem nome e WhatsApp.
APP_PASSWORD=

# Check de "enviado" compartilhado entre pessoas (Vercel Marketplace > Upstash Redis).
# Sem isso, o check fica salvo só no navegador de quem marcou.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Opcional: síntese por IA das dificuldades (sem isso, usa só a contagem das respostas)
ANTHROPIC_API_KEY=

# Para testar o layout com dados fictícios: DEMO=1
DEMO=
'@

Gravar 'middleware.ts' @'
import { NextRequest, NextResponse } from "next/server";

// Senha simples (HTTP Basic). Defina APP_PASSWORD no Vercel; qualquer usuário serve.
export function middleware(req: NextRequest) {
  const senha = process.env.APP_PASSWORD;
  if (!senha) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(/:(.*)/s);
    if (pass === senha) return NextResponse.next();
  }
  return new NextResponse("Acesso restrito", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Treinamento NC2"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
'@

Gravar 'app/layout.tsx' @'
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playbook Treinamento NC2",
  description: "Painel de inscrições, síntese de dificuldades e cronograma de disparos do treinamento Novo Campeche Spot II.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
'@

Gravar 'app/page.tsx' @'
import Playbook from "@/components/Playbook";

export default function Page() {
  return <Playbook />;
}
'@

Gravar 'app/globals.css' @'
:root {
  --bg: #f4f6f9;
  --card: #ffffff;
  --ink: #14222e;
  --muted: #5d6b78;
  --line: #e1e6ec;
  --brand: #0b3d5c;
  --brand-2: #1a7fb5;
  --ok: #1e8e5a;
  --warn: #c77d0a;
  --bad: #c0392b;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e1620;
    --card: #16212d;
    --ink: #e8eef4;
    --muted: #94a3b2;
    --line: #243241;
    --brand: #5fb3e0;
    --brand-2: #3d9ad1;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.shell { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
.side { background: var(--card); border-right: 1px solid var(--line); padding: 22px 14px; display: flex; flex-direction: column; gap: 18px; position: sticky; top: 0; height: 100vh; }
.brand { font-size: 20px; font-weight: 700; color: var(--brand); padding: 0 8px; letter-spacing: -0.01em; }
.brand small { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-top: 2px; }
.menu { display: flex; flex-direction: column; gap: 4px; }
.menu button { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: 0; background: transparent; padding: 10px 10px; border-radius: 10px; color: var(--ink); font-weight: 600; }
.menu button:hover { background: var(--bg); }
.menu button.on { background: var(--brand); color: #fff; }
@media (prefers-color-scheme: dark) { .menu button.on { color: #0e1620; } }
.menu .idx { width: 24px; height: 24px; border-radius: 7px; background: var(--line); display: grid; place-items: center; font-size: 12px; color: var(--muted); flex: none; }
.menu button.on .idx { background: rgba(255,255,255,.22); color: inherit; }
.menu .lbl { flex: 1; }
.menu .badge { font-size: 12px; padding: 1px 8px; border-radius: 999px; background: var(--line); color: var(--muted); }
.menu button.on .badge { background: rgba(255,255,255,.22); color: inherit; }
.side-foot { margin-top: auto; display: flex; flex-direction: column; gap: 8px; padding: 0 6px; }
.main { padding: 26px 24px 64px; max-width: 1180px; width: 100%; }
@media (max-width: 820px) {
  .shell { grid-template-columns: 1fr; }
  .side { position: static; height: auto; flex-direction: column; padding: 14px 12px; }
  .menu { flex-direction: row; overflow-x: auto; }
  .menu button { width: auto; white-space: nowrap; }
  .side-foot { margin-top: 0; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .main { padding: 16px 12px 48px; }
}
header.top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
h1 { margin: 0; font-size: 24px; letter-spacing: -0.01em; }
.sub { color: var(--muted); font-size: 13px; }
.status { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); display: inline-block; }
.dot.off { background: var(--bad); }
button, .btn { font: inherit; cursor: pointer; border: 1px solid var(--line); background: var(--card); color: var(--ink); padding: 6px 12px; border-radius: 8px; }
button:hover { border-color: var(--brand-2); }
button.primary { background: var(--brand); color: #fff; border-color: var(--brand); }
@media (prefers-color-scheme: dark) { button.primary { color: #0e1620; } }
nav.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); margin-bottom: 20px; overflow-x: auto; }
nav.tabs button { border: 0; border-bottom: 3px solid transparent; border-radius: 0; background: transparent; padding: 10px 14px; color: var(--muted); font-weight: 600; white-space: nowrap; }
nav.tabs button.on { color: var(--brand); border-bottom-color: var(--brand-2); }
.grid { display: grid; gap: 14px; }
.kpis { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.kpi .n { font-size: 36px; font-weight: 700; line-height: 1.1; color: var(--brand); }
.kpi .l { color: var(--muted); font-size: 13px; margin-top: 2px; }
.kpi .s { font-size: 12px; color: var(--muted); margin-top: 6px; }
.two { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-top: 14px; }
h2 { font-size: 16px; margin: 0 0 12px; }
.bars { display: flex; align-items: flex-end; gap: 8px; height: 150px; padding-top: 8px; }
.bar { flex: 1; min-width: 28px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; font-size: 12px; color: var(--muted); }
.bar i { display: block; width: 100%; max-width: 44px; background: var(--brand-2); border-radius: 6px 6px 0 0; min-height: 3px; }
.bar b { color: var(--ink); font-size: 12px; margin-bottom: 3px; }
.row { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 14px; }
.row .name { width: 44%; }
.track { flex: 1; height: 10px; background: var(--line); border-radius: 6px; overflow: hidden; }
.track i { display: block; height: 100%; background: var(--brand-2); }
.track.ok i { background: var(--ok); }
.row .val { width: 70px; text-align: right; color: var(--muted); font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; position: sticky; top: 0; background: var(--card); }
.tablewrap { overflow-x: auto; }
input[type=search] { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--ink); width: 100%; max-width: 360px; }
.tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; background: var(--line); color: var(--muted); }
.tag.sim { background: rgba(30,142,90,.15); color: var(--ok); }
.tag.dup { background: rgba(199,125,10,.15); color: var(--warn); }
.err { background: rgba(192,57,43,.1); border: 1px solid var(--bad); color: var(--bad); padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; }
.note { background: rgba(26,127,181,.1); border: 1px solid var(--brand-2); padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; }
.quote { color: var(--muted); font-size: 13px; border-left: 3px solid var(--line); padding-left: 10px; margin: 6px 0; }
.sintese { font-size: 16px; line-height: 1.6; }
.msg { white-space: pre-wrap; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-top: 10px; }
.dia { margin: 22px 0 8px; font-weight: 700; display: flex; gap: 8px; align-items: baseline; }
.dia small { color: var(--muted); font-weight: 400; }
.disp { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; margin-bottom: 10px; }
.disp.done { opacity: .75; border-color: var(--ok); }
.disp input[type=checkbox] { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--ok); cursor: pointer; }
.disp .meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 4px; }
.empty { color: var(--muted); padding: 24px; text-align: center; }
@media (max-width: 640px) {
  .row .name { width: 38%; }
  .disp { grid-template-columns: auto 1fr; }
  .disp .acts { grid-column: 2; }
}

.disp .acts { display: flex; flex-direction: column; gap: 8px; min-width: 190px; }
.qtd { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.qtd input { font: inherit; font-size: 15px; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); width: 100%; }

.filtros { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
.filtros label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.filtros select { font: inherit; font-size: 14px; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--ink); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { border-radius: 999px; padding: 5px 12px; font-size: 13px; }
.chips button.on { background: var(--brand); color: #fff; border-color: var(--brand); }
@media (prefers-color-scheme: dark) { .chips button.on { color: #0e1620; } }
.tag.nivel-alta { background: rgba(192,57,43,.15); color: var(--bad); }
.tag.nivel-media { background: rgba(199,125,10,.15); color: var(--warn); }
.tag.nivel-baixa { background: rgba(30,142,90,.15); color: var(--ok); }
'@

Gravar 'app/api/dados/route.ts' @'
import { NextResponse } from "next/server";
import { carregarDados } from "@/lib/dados";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await carregarDados(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
'@

Gravar 'app/api/envios/route.ts' @'
import { NextResponse } from "next/server";
import { gravarEnvio, lerEnvios, storeConfigurado } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!storeConfigurado()) return NextResponse.json({ compartilhado: false, envios: {} });
  try {
    return NextResponse.json({ compartilhado: true, envios: await lerEnvios() });
  } catch (e) {
    return NextResponse.json({ compartilhado: false, envios: {}, erro: (e as Error).message });
  }
}

export async function POST(req: Request) {
  if (!storeConfigurado()) return NextResponse.json({ compartilhado: false }, { status: 200 });
  const { id, enviado, em, qtd } = (await req.json()) as { id?: string; enviado?: boolean; em?: string | null; qtd?: number | null };
  if (!id || typeof enviado !== "boolean") return NextResponse.json({ erro: "id e enviado são obrigatórios" }, { status: 400 });
  const q = typeof qtd === "number" && Number.isFinite(qtd) && qtd >= 0 ? Math.floor(qtd) : null;
  await gravarEnvio(id, { enviado, em: enviado ? (em ?? new Date().toISOString()) : null, qtd: q });
  return NextResponse.json({ compartilhado: true, ok: true });
}
'@

Gravar 'lib/csv.ts' @'
// Parser de CSV simples (aspas, vírgulas e quebras de linha dentro de campo).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}
'@

Gravar 'lib/analise.ts' @'
export type Resposta = {
  ts: string | null; // ISO
  nome: string;
  whatsapp: string;
  chave: string; // telefone canônico (sem 55, sem 9º dígito)
  vendeu: boolean | null;
  investidor: boolean | null;
  dificuldade: string;
  duplicado: boolean;
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
'@

Gravar 'lib/dados.ts' @'
import { parseCsv } from "./csv";
import {
  Dados, linhasParaRespostas, montarMetricas, montarTemas, textoSinteseTemas, Resposta,
} from "./analise";
import { sinteseIA } from "./sintese-ia";

const DEMO_CSV = `Carimbo de data/hora,Seu nome,WhatsApp (com DDD),Você já vendeu Spots Seazone?,Você tem algum investidor em mente para indicar?,Qual a sua maior dificuldade na hora de vender?
08/10/2026 10:12:03,Ana Souza,(48) 99911-2233,Sim,Sim,Contornar o "vou pensar" do cliente
08/10/2026 11:40:10,Bruno Lima,(11) 98877-6655,Não,Sim,Explicar o retorno de forma convincente
08/10/2026 15:02:44,Carla Dias,(62) 99100-2020,Sim,Não,Encontrar investidores qualificados
09/10/2026 09:15:00,Diego Ramos,(21) 97766-5544,Não,Não,Gerar confiança porque o cliente não conhece a Seazone
09/10/2026 12:30:21,Elisa Prado,(48) 99911-2233,Sim,Sim,Contornar o "vou pensar" do cliente
09/10/2026 18:05:09,Fábio Torres,(85) 98899-1122,Sim,Sim,Preço e condições de entrada para o cliente
10/10/2026 08:44:31,Gabi Nunes,(41) 99955-8800,Não,Sim,Fechar a venda e fazer follow-up sem esfriar`;

async function baixarCsv(): Promise<string> {
  if (process.env.DEMO === "1") return DEMO_CSV;
  const id = process.env.SHEET_ID || "1YjRi_2b3R_ZR7YbRX3Ir5KUll9AFrW-87HPhouDsa50";
  const gid = process.env.SHEET_GID || "298661079";
  const url = process.env.SHEET_CSV_URL || `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  const txt = await res.text();
  if (!res.ok || /^\s*<(!doctype|html)/i.test(txt)) {
    throw new Error(
      "Não consegui ler a planilha. Em Compartilhar, deixe \"Qualquer pessoa com o link: Leitor\" (ou use Arquivo > Compartilhar > Publicar na Web e informe SHEET_CSV_URL)."
    );
  }
  return txt;
}

export async function carregarDados(): Promise<Dados> {
  const demo = process.env.DEMO === "1";
  const respostas: Resposta[] = linhasParaRespostas(parseCsv(await baixarCsv()));
  const metricas = montarMetricas(respostas);
  const temas = montarTemas(respostas);
  const textosDif = respostas.filter((r) => !r.duplicado && r.dificuldade.trim()).map((r) => r.dificuldade.trim());

  let sintese: Dados["sintese"] = { texto: null, origem: "vazio" };
  if (textosDif.length) {
    const ia = await sinteseIA(textosDif);
    sintese = ia
      ? { texto: ia, origem: "ia" }
      : { texto: textoSinteseTemas(temas, textosDif.length), origem: "temas" };
  }
  return { atualizadoEm: new Date().toISOString(), demo, respostas, metricas, temas, sintese };
}
'@

Gravar 'lib/sintese-ia.ts' @'
// Síntese opcional por IA. Sem ANTHROPIC_API_KEY, o painel usa só a contagem das respostas.
let cache: { chave: string; texto: string; em: number } | null = null;

export async function sinteseIA(respostas: string[]): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const chave = `${respostas.length}:${respostas.join("|").length}:${respostas.slice(-3).join("|")}`;
  if (cache && cache.chave === chave && Date.now() - cache.em < 10 * 60_000) return cache.texto;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 600,
        messages: [{
          role: "user",
          content:
            "Estas são respostas de parceiros de vendas à pergunta \"Qual a sua maior dificuldade na hora de vender?\" antes de um treinamento sobre o Novo Campeche Spot II.\n" +
            "Escreva, em português do Brasil e em no máximo 5 linhas, uma síntese direta: os 3 principais padrões (com a contagem aproximada) e uma sugestão de pauta para quem conduz o treinamento. Sem emoji e sem inventar dado que não esteja nas respostas.\n\n" +
            respostas.map((r, i) => `${i + 1}. ${r.slice(0, 400)}`).join("\n"),
        }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const texto = (json?.content?.[0]?.text as string | undefined)?.trim();
    if (!texto) return null;
    cache = { chave, texto, em: Date.now() };
    return texto;
  } catch {
    return null;
  }
}
'@

Gravar 'lib/store.ts' @'
// Guarda o "check de enviado". Compartilhado via Upstash Redis (REST) quando configurado.
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "treinamento-nc2:envios";

export type Envio = { enviado: boolean; em: string | null; qtd: number | null };
export type Envios = Record<string, Envio>;

export const storeConfigurado = () => Boolean(URL_ && TOKEN);

async function redis(cmd: (string | number)[]) {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result;
}

export async function lerEnvios(): Promise<Envios> {
  const raw: string[] | null = await redis(["HGETALL", KEY]);
  const out: Envios = {};
  if (raw) for (let i = 0; i < raw.length; i += 2) out[raw[i]] = JSON.parse(raw[i + 1]);
  return out;
}

export async function gravarEnvio(id: string, envio: Envio) {
  await redis(["HSET", KEY, id, JSON.stringify(envio)]);
}
'@

Gravar 'data/cronograma.ts' @'
// Edite aqui as mensagens (M1..M5) e a agenda de disparos. Cada linha de AGENDA vira um card no app.
const LINK = "[LINK DE INSCRIÇÃO]";
const LINK_ACESSO = "[LINK DE ACESSO AO TREINAMENTO]";

const MENSAGENS = {
  M1: {
    nome: "Convite para a roda",
    gancho: "Roda aberta + condições únicas",
    texto: `NOVO CAMPECHE SPOT II + TODOS OS SPOTS: você foi chamado para a RODA ABERTA Seazone 🔥

{{nome}}, quinta (15/10), às 19h00, a gente abre a mesa AO VIVO. 🎙️

Sem script e sem enrolação: você pergunta, o time responde.

🏝️ Novo Campeche Spot II e todos os Spots do portfólio na roda
🎯 Quebra de objeção: o que trava o seu cliente, a gente destrincha na hora
🔒 Unidades LIMITADAS com condições únicas, reveladas SÓ na live

As condições serão apresentadas ao vivo e não saem em tabela nenhuma. Quem estiver na roda sai na frente. 🚀

👉 Garanta o seu lugar (1 minuto): ${LINK}

E já me responde aqui: qual Spot você mais quer ver na roda? 👇`,
  },
  M2: {
    nome: "Enquete: você escolhe a pauta",
    gancho: "Enquete que gera resposta",
    texto: `NOVO CAMPECHE SPOT II + TODOS OS SPOTS: a pauta da roda é sua, vota aqui! 🗳️

{{nome}}, na roda aberta de quinta (15/10), às 19h00, quem decide o assunto é você.

Responde só com o número:

1️⃣ Novo Campeche Spot II a fundo
2️⃣ Comparativo de todos os Spots: qual indicar para qual cliente
3️⃣ Quebra de objeções: "vou pensar", "está caro", "e se ficar vazio?"
4️⃣ As condições únicas que vamos revelar na live 👀

O tema mais votado abre a conversa. 🎤

E lembra: as unidades são limitadas e as condições únicas serão reveladas só na live. 🔒

👉 Se inscreve para entrar na roda: ${LINK}`,
  },
  M3: {
    nome: "Escassez + sua pergunta",
    gancho: "Unidades limitadas + mande sua objeção",
    texto: `NOVO CAMPECHE SPOT II + TODOS OS SPOTS: tem uma condição que só existe na roda ⏳

{{nome}}, faltam poucos dias para a roda aberta (quinta, 15/10, às 19h00).

O que ninguém te conta por mensagem fica para ser falado lá:
🔒 Unidades limitadas com condições únicas, apresentadas só ao vivo
🏝️ Novo Campeche Spot II e o portfólio inteiro, sem filtro
🎯 Resposta ao vivo para a objeção que mais trava as suas indicações

Quer que a sua dúvida seja a primeira respondida? Manda aqui, em uma frase, a objeção que mais trava o seu cliente. ✍️ A gente leva para a roda.

E garante o seu lugar, porque as unidades são limitadas:
👉 ${LINK}`,
  },
  M4: {
    nome: "Véspera: é amanhã",
    gancho: 'Contagem regressiva + "eu vou"',
    texto: `NOVO CAMPECHE SPOT II + TODOS OS SPOTS: É AMANHÃ! ⏰🔥

{{nome}}, 19h00, ao vivo. A roda aberta Seazone começa amanhã.

O que vai rolar:
🏝️ Novo Campeche Spot II e todos os Spots, sem rodeio
🎯 Objeções destrinchadas na prática
🔒 Unidades limitadas e as condições únicas reveladas ao vivo

🔔 Ainda não se inscreveu? Última chamada: ${LINK}

✋ Já se inscreveu? Responde aqui com EU VOU e leva a sua maior dúvida para a roda.`,
  },
  M5: {
    nome: "É hoje! Já estamos entrando no ar",
    gancho: "Estamos no ar",
    texto: `🔴 NOVO CAMPECHE SPOT II + TODOS OS SPOTS: É HOJE! Já estamos entrando no ar! 🎙️

{{nome}}, a roda aberta começa às 19h00 e a mesa já está montada.

👉 ENTRA AGORA: ${LINK_ACESSO}

Hoje, ao vivo:
🏝️ Novo Campeche Spot II e todos os Spots
🎯 Quebra de objeções e tira-dúvidas
🔒 As condições únicas das unidades limitadas saem ao vivo

Ainda não se inscreveu? Faz agora e entra em seguida: ${LINK}

Manda um 🙋 aqui quando entrar, que a gente te recebe na sala!`,
  },
} as const;

type Chave = keyof typeof MENSAGENS;

// [dia do mês de outubro/2026, dia da semana, horário, base, tipo, mensagem, observação]
const AGENDA: [number, string, string, string, string, Chave, string][] = [
  [8, "Quinta", "09h30", "Base A", "Turno", "M1", ""],
  [9, "Sexta", "09h30", "Base B", "Turno", "M1", ""],
  [10, "Sábado", "09h30", "Base A", "Turno", "M2", ""],
  [11, "Domingo", "09h30", "Base B", "Turno", "M2", "Domingo: confirmar se envia ou move para segunda"],
  [12, "Segunda (feriado)", "09h30", "Base A", "Turno", "M3", "Feriado de N. Sra. Aparecida"],
  [13, "Terça", "09h30", "Base B", "Turno", "M3", ""],
  [14, "Quarta", "09h30", "Base A", "Turno", "M4", ""],
  [14, "Quarta", "09h30", "Base B", "Reforço", "M4", "Reforço final: Base B recebe também hoje"],
  [15, "Quinta", "18h30", "Base B", "Turno", "M5", "Dia do treinamento"],
  [15, "Quinta", "18h30", "Base A", "Reforço", "M5", "Reforço final: Base A recebe também hoje"],
];

export const cronograma = AGENDA.map(([d, dia, horario, base, tipo, m, obs]) => {
  const data = `2026-10-${String(d).padStart(2, "0")}`;
  return {
    id: `${data}-${base.replace(" ", "").toLowerCase()}-${m.toLowerCase()}`,
    data, dia, horario, base, tipo, mensagem: m as string, obs,
    nome: MENSAGENS[m].nome as string,
    gancho: MENSAGENS[m].gancho as string,
    texto: MENSAGENS[m].texto as string,
  };
});
'@

Gravar 'components/Playbook.tsx' @'
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cronograma } from "@/data/cronograma";
import type { Dados } from "@/lib/analise";

type Aba = "painel" | "respostas" | "sintese" | "cronograma";
type Envio = { enviado: boolean; em: string | null; qtd: number | null };
type Envios = Record<string, Envio>;

const ABAS: { id: Aba; nome: string }[] = [
  { id: "painel", nome: "Painel" },
  { id: "respostas", nome: "Respostas" },
  { id: "sintese", nome: "Síntese das dificuldades" },
  { id: "cronograma", nome: "Cronograma de disparos" },
];
const POLL_MS = 5_000;
const LS_KEY = "treinamento-nc2:envios";

const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const fmtDia = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export default function Playbook() {
  const [aba, setAba] = useState<Aba>("painel");
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Envios>({});
  const [compartilhado, setCompartilhado] = useState(false);
  const editando = useRef(false); // não sobrescreve o campo enquanto a pessoa digita

  useEffect(() => {
    const h = window.location.hash.replace("#", "") as Aba;
    if (ABAS.some((a) => a.id === h)) setAba(h);
  }, []);
  const trocar = (a: Aba) => { setAba(a); window.history.replaceState(null, "", `#${a}`); };

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/dados", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Falha ao carregar");
      setDados(j); setErro(null);
    } catch (e) {
      const m = (e as Error).message;
      setErro(/failed to fetch|networkerror|load failed/i.test(m)
        ? "Sem conexão com o servidor. Se estiver no VS Code, confira se o npm run dev está rodando (porta 3100). Tentando de novo a cada 5 segundos."
        : m);
    }
  }, []);

  const carregarEnvios = useCallback(async () => {
    try {
      const r = await fetch("/api/envios", { cache: "no-store" });
      const j = await r.json();
      if (j.compartilhado) { setCompartilhado(true); if (!editando.current) setEnvios(j.envios); return; }
    } catch {}
    setCompartilhado(false);
    if (!editando.current) { try { setEnvios(JSON.parse(localStorage.getItem(LS_KEY) || "{}")); } catch {} }
  }, []);

  // Tempo real: consulta a cada 5s enquanto a aba está visível e atualiza na hora ao voltar para ela.
  useEffect(() => {
    const tick = () => { if (!document.hidden) { carregar(); carregarEnvios(); } };
    carregar(); carregarEnvios();
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); window.removeEventListener("focus", tick); };
  }, [carregar, carregarEnvios]);

  const persistir = async (id: string, e: Envio, todos: Envios) => {
    if (compartilhado) {
      await fetch("/api/envios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...e }) }).catch(() => {});
    } else {
      try { localStorage.setItem(LS_KEY, JSON.stringify(todos)); } catch {}
    }
  };
  // Atualiza na tela na hora; grava (Redis ou navegador) quando gravar=true.
  const atualizar = (id: string, patch: Partial<Envio>, gravar = true) => {
    const atual: Envio = envios[id] ?? { enviado: false, em: null, qtd: null };
    const novo: Envio = { ...atual, ...patch };
    if (patch.enviado === true && !atual.em) novo.em = new Date().toISOString();
    if (patch.enviado === false) novo.em = null;
    const todos = { ...envios, [id]: novo };
    setEnvios(todos);
    if (gravar) persistir(id, novo, todos);
  };

  const feitos = cronograma.filter((c) => envios[c.id]?.enviado).length;
  const badge: Record<Aba, string> = {
    painel: dados ? String(dados.metricas.inscritos) : "",
    respostas: dados ? String(dados.metricas.respostasBrutas) : "",
    sintese: dados ? String(dados.metricas.comDificuldade) : "",
    cronograma: `${feitos}/${cronograma.length}`,
  };
  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          Playbook
          <small>Treinamento Novo Campeche Spot II</small>
        </div>
        <nav className="menu">
          {ABAS.map((a, i) => (
            <button key={a.id} className={aba === a.id ? "on" : ""} onClick={() => trocar(a.id)}>
              <span className="idx">{i + 1}</span>
              <span className="lbl">{a.nome}</span>
              {badge[a.id] && <span className="badge">{badge[a.id]}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="status">
            <span className={`dot ${erro ? "off" : ""}`} />
            {dados ? `Ao vivo · atualizado às ${new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Carregando..."}
          </div>
          <button onClick={() => { carregar(); carregarEnvios(); }}>Atualizar agora</button>
          <div className="sub">Quinta-feira, 15/10/2026, às 19h</div>
        </div>
      </aside>

      <main className="main">
      <header className="top">
        <h1>{atual.nome}</h1>
      </header>

      {erro && <div className="err">{erro}</div>}
      {dados?.demo && <div className="note">Modo demonstração: dados fictícios (DEMO=1). Remova a variável para ler a planilha real.</div>}

      {aba === "cronograma" ? (
        <Cronograma envios={envios} atualizar={atualizar} persistir={persistir} editando={editando} compartilhado={compartilhado} />
      ) : !dados ? (
        <div className="empty">Carregando respostas...</div>
      ) : aba === "painel" ? (
        <Painel d={dados} />
      ) : aba === "respostas" ? (
        <Respostas d={dados} />
      ) : (
        <Sintese d={dados} />
      )}
      </main>
    </div>
  );
}

function Kpi({ n, l, s }: { n: number | string; l: string; s?: string }) {
  return (
    <div className="card kpi">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}

function Barra({ nome, qtd, total, ok }: { nome: string; qtd: number; total: number; ok?: boolean }) {
  const pct = total ? Math.round((qtd / total) * 100) : 0;
  return (
    <div className="row">
      <div className="name">{nome}</div>
      <div className={`track ${ok ? "ok" : ""}`}><i style={{ width: `${pct}%` }} /></div>
      <div className="val">{qtd} ({pct}%)</div>
    </div>
  );
}

function Painel({ d }: { d: Dados }) {
  const m = d.metricas;
  const maxDia = Math.max(1, ...m.porDia.map((x) => x.qtd));
  return (
    <>
      <div className="grid kpis">
        <Kpi n={m.inscritos} l="Inscritos (WhatsApp únicos)" s={m.duplicados ? `${m.duplicados} inscrição(ões) repetida(s) descontada(s)` : `${m.respostasBrutas} respostas no Forms`} />
        <Kpi n={m.jaVenderam} l="Já venderam Spot" s={`${m.nuncaVenderam} nunca venderam`} />
        <Kpi n={m.comInvestidor} l="Têm investidor para indicar" s={`${m.semInvestidor} sem investidor por ora`} />
        <Kpi n={m.comDificuldade} l="Contaram sua maior dificuldade" />
      </div>
      <div className="grid two">
        <div className="card">
          <h2>Inscrições por dia</h2>
          {m.porDia.length ? (
            <div className="bars">
              {m.porDia.map((x) => (
                <div className="bar" key={x.dia}>
                  <b>{x.qtd}</b>
                  <i style={{ height: `${(x.qtd / maxDia) * 100}%` }} />
                  <span>{fmtDia(x.dia)}</span>
                </div>
              ))}
            </div>
          ) : <div className="empty">Ainda sem inscrições.</div>}
        </div>
        <div className="card">
          <h2>Perfil dos inscritos</h2>
          <Barra nome="Já vendeu Spot" qtd={m.jaVenderam} total={m.inscritos} ok />
          <Barra nome="Nunca vendeu" qtd={m.nuncaVenderam} total={m.inscritos} />
          <Barra nome="Tem investidor em mente" qtd={m.comInvestidor} total={m.inscritos} ok />
          <Barra nome="Sem investidor ainda" qtd={m.semInvestidor} total={m.inscritos} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>Últimas inscrições</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Quando</th><th>Nome</th><th>Já vendeu</th><th>Investidor</th></tr></thead>
            <tbody>
              {d.respostas.filter((r) => !r.duplicado).slice(0, 6).map((r, i) => (
                <tr key={i}>
                  <td>{fmtData(r.ts)}</td><td>{r.nome}</td>
                  <td><span className={`tag ${r.vendeu ? "sim" : ""}`}>{r.vendeu === null ? "-" : r.vendeu ? "Sim" : "Não"}</span></td>
                  <td><span className={`tag ${r.investidor ? "sim" : ""}`}>{r.investidor === null ? "-" : r.investidor ? "Sim" : "Não"}</span></td>
                </tr>
              ))}
              {!d.respostas.length && <tr><td colSpan={4} className="empty">Nenhuma resposta ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Respostas({ d }: { d: Dados }) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const n = q.toLowerCase();
    return d.respostas.filter((r) => !n || `${r.nome} ${r.whatsapp} ${r.dificuldade}`.toLowerCase().includes(n));
  }, [d, q]);
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Respostas do Forms ({lista.length})</h2>
        <input type="search" placeholder="Buscar por nome, WhatsApp ou dificuldade" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Quando</th><th>Nome</th><th>WhatsApp</th><th>Já vendeu</th><th>Investidor</th><th>Maior dificuldade</th></tr></thead>
          <tbody>
            {lista.map((r, i) => (
              <tr key={i}>
                <td>{fmtData(r.ts)}</td>
                <td>{r.nome} {r.duplicado && <span className="tag dup">repetido</span>}</td>
                <td>{r.whatsapp}</td>
                <td>{r.vendeu === null ? "-" : r.vendeu ? "Sim" : "Não"}</td>
                <td>{r.investidor === null ? "-" : r.investidor ? "Sim" : "Não"}</td>
                <td>{r.dificuldade}</td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={6} className="empty">Nada por aqui ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Nivel = "alta" | "media" | "baixa";
type NivelFiltro = "todas" | Nivel;
type OrdemTema = "mais" | "menos" | "nome";

// Repetição = % das respostas preenchidas que são iguais a esta. Alta: 30% ou mais. Média: 15% a 29%. Baixa: menos de 15%.
const nivelDoTema = (pct: number): Nivel => (pct >= 30 ? "alta" : pct >= 15 ? "media" : "baixa");
const NIVEL_ROTULO: Record<Nivel, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

function Sintese({ d }: { d: Dados }) {
  const total = d.metricas.comDificuldade;
  const [nivel, setNivel] = useState<NivelFiltro>("todas");
  const [ordem, setOrdem] = useState<OrdemTema>("mais");

  const contagem = useMemo(() => {
    const c: Record<Nivel, number> = { alta: 0, media: 0, baixa: 0 };
    for (const t of d.temas) c[nivelDoTema(t.pct)]++;
    return c;
  }, [d.temas]);

  const temas = useMemo(() => {
    const filtrados = d.temas.filter((t) => nivel === "todas" || nivelDoTema(t.pct) === nivel);
    return [...filtrados].sort((a, b) => {
      if (ordem === "nome") return a.titulo.localeCompare(b.titulo, "pt-BR");
      return ordem === "mais" ? b.qtd - a.qtd : a.qtd - b.qtd;
    });
  }, [d.temas, nivel, ordem]);

  return (
    <>
      <div className="card">
        <h2>Síntese {d.sintese.origem === "ia" ? "(gerada por IA)" : ""}</h2>
        {d.sintese.texto ? <p className="sintese">{d.sintese.texto}</p> : <div className="empty">Aguardando as primeiras respostas preenchidas.</div>}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>O que os parceiros escreveram ({total} respostas)</h2>
        <div className="filtros">
          <div className="chips" role="group" aria-label="Filtrar por nível de repetição">
            <button className={nivel === "todas" ? "on" : ""} onClick={() => setNivel("todas")}>Todas ({d.temas.length})</button>
            {(["alta", "media", "baixa"] as Nivel[]).map((n) => (
              <button key={n} className={nivel === n ? "on" : ""} onClick={() => setNivel(n)}>
                {NIVEL_ROTULO[n]} ({contagem[n]})
              </button>
            ))}
          </div>
          <label>
            Ordenar por
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemTema)}>
              <option value="mais">Mais repetidas</option>
              <option value="menos">Menos repetidas</option>
              <option value="nome">Nome (A-Z)</option>
            </select>
          </label>
        </div>
        {temas.map((t) => {
          const n = nivelDoTema(t.pct);
          return (
            <div key={t.id} style={{ marginBottom: 16 }}>
              <Barra nome={t.titulo} qtd={t.qtd} total={total} />
              <span className={`tag nivel-${n}`}>Repetição {NIVEL_ROTULO[n].toLowerCase()}</span>
              {t.exemplos.slice(0, 3).map((e, i) => <div className="quote" key={i}>{e}</div>)}
            </div>
          );
        })}
        {!d.temas.length && <div className="empty">Sem dados ainda.</div>}
        {!!d.temas.length && !temas.length && <div className="empty">Nenhuma resposta neste nível.</div>}
      </div>
    </>
  );
}

type Disp = (typeof cronograma)[number];

function Cronograma({ envios, atualizar, persistir, editando, compartilhado }: {
  envios: Envios;
  atualizar: (id: string, patch: Partial<Envio>, gravar?: boolean) => void;
  persistir: (id: string, e: Envio, todos: Envios) => Promise<void>;
  editando: { current: boolean };
  compartilhado: boolean;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const total = cronograma.length;
  const feitos = cronograma.filter((c) => envios[c.id]?.enviado).length;
  const pessoas = cronograma.reduce((s, c) => s + (envios[c.id]?.qtd ?? 0), 0);
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

  const porDia = useMemo(() => {
    const m = new Map<string, Disp[]>();
    for (const c of cronograma) m.set(c.data, [...(m.get(c.data) ?? []), c]);
    return [...m.entries()];
  }, []);

  const copiar = async (c: Disp) => {
    try { await navigator.clipboard.writeText(c.texto); setCopiado(c.id); setTimeout(() => setCopiado(null), 1500); } catch {}
  };

  return (
    <>
      {!compartilhado && (
        <div className="note">
          O check e as quantidades estão salvos só neste navegador. Para compartilhar entre pessoas, configure o Upstash Redis no Vercel (veja o README).
        </div>
      )}
      <div className="card">
        <Barra nome={`Disparos enviados (${feitos} de ${total})`} qtd={feitos} total={total} ok />
        <div className="sub">Soma de pessoas que receberam, nos disparos preenchidos: <strong>{pessoas.toLocaleString("pt-BR")}</strong></div>
      </div>
      {porDia.map(([data, itens]) => (
        <div key={data}>
          <div className="dia">
            {fmtDia(data)}/{data.slice(0, 4)} · {itens[0].dia}
            {data === hoje && <span className="tag sim">hoje</span>}
            <small>{itens.length} disparo(s)</small>
          </div>
          {itens.map((c) => {
            const e = envios[c.id];
            return (
              <div key={c.id} className={`card disp ${e?.enviado ? "done" : ""}`}>
                <input type="checkbox" checked={!!e?.enviado} onChange={(ev) => atualizar(c.id, { enviado: ev.target.checked })} aria-label="Marcar como enviado" />
                <div>
                  <div className="meta">
                    <strong>{c.mensagem} · {c.nome}</strong>
                    <span className="tag">{fmtDia(c.data)}/{c.data.slice(0, 4)} · {c.dia}</span>
                    <span className="tag">{c.horario}</span>
                    <span className="tag">{c.base}</span>
                    <span className="tag">{c.tipo}</span>
                    {e?.enviado && <span className="tag sim">enviado {fmtData(e.em)}</span>}
                  </div>
                  <div className="sub">{c.gancho}{c.obs ? ` · ${c.obs}` : ""}</div>
                  <div className="msg">{c.texto}</div>
                </div>
                <div className="acts">
                  <label className="qtd">
                    Pessoas que receberam
                    <input
                      type="number" min={0} inputMode="numeric" placeholder="0"
                      value={e?.qtd ?? ""}
                      onFocus={() => { editando.current = true; }}
                      onChange={(ev) => atualizar(c.id, { qtd: ev.target.value === "" ? null : Math.max(0, Number(ev.target.value)) }, false)}
                      onBlur={() => { editando.current = false; const atual = envios[c.id]; if (atual) persistir(c.id, atual, envios); }}
                    />
                  </label>
                  <button className="primary" onClick={() => copiar(c)}>{copiado === c.id ? "Copiado" : "Copiar mensagem"}</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
'@

Write-Host ''
Write-Host 'Arquivos criados em' $raiz
if (-not $SemInstalar) {
  Set-Location $raiz
  npm install
  Write-Host 'Abrindo em http://localhost:3100 (Ctrl+C para parar)'
  npm run dev
}
