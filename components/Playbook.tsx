"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cronograma } from "@/data/cronograma";
import type { Dados } from "@/lib/analise";
import WhatsAppPreview from "./WhatsAppPreview";

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
  const [previa, setPrevia] = useState<Disp | null>(null);
  const [nomeEx, setNomeEx] = useState("Maria");
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
                  <button className="wa-btn" onClick={() => setPrevia(c)}>Ver no WhatsApp</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {previa && (
        <WhatsAppPreview
          texto={previa.texto} horario={previa.horario} nome={nomeEx} setNome={setNomeEx}
          titulo={`${previa.mensagem} · ${fmtDia(previa.data)} · ${previa.base}`}
          fechar={() => setPrevia(null)}
        />
      )}
    </>
  );
}
