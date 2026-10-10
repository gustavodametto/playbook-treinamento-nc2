"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dados } from "@/lib/analise";
import type { Disparo } from "@/lib/cronograma";
import WhatsAppPreview from "./WhatsAppPreview";

type Aba = "painel" | "respostas" | "sintese" | "cronograma" | "premium";
type Envio = { enviado: boolean; em: string | null; qtd: number | null };
type Envios = Record<string, Envio>;

const ABAS: { id: Aba; nome: string }[] = [
  { id: "painel", nome: "Painel" },
  { id: "respostas", nome: "Respostas" },
  { id: "sintese", nome: "Síntese das dificuldades" },
  { id: "cronograma", nome: "Cronograma de disparos" },
  { id: "premium", nome: "Cronograma Premium" },
];
const POLL_MS = 5_000;
const LS_KEY = "treinamento-nc2:envios";

const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
// "08/10/2026 às 14:32" (horário de Brasília)
const fmtDataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(", ", " às ") : "-";
const fmtDia = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export default function Playbook() {
  const [aba, setAba] = useState<Aba>("painel");
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Envios>({});
  const [compartilhado, setCompartilhado] = useState(false);
  const [cronograma, setCronograma] = useState<Disparo[] | null>(null);
  const [erroCrono, setErroCrono] = useState<string | null>(null);
  const [premium, setPremium] = useState<Disparo[] | null>(null);
  const [erroPremium, setErroPremium] = useState<string | null>(null);
  const [fontePremium, setFontePremium] = useState("");
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

  const carregarCrono = useCallback(async () => {
    try {
      const r = await fetch("/api/cronograma", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Falha ao carregar o cronograma");
      setCronograma(j.disparos); setErroCrono(null);
    } catch (e) {
      setErroCrono((e as Error).message);
    }
  }, []);

  const carregarPremium = useCallback(async () => {
    try {
      const r = await fetch("/api/cronograma?lista=premium", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Falha ao carregar o cronograma Premium");
      setPremium(j.disparos); setErroPremium(null); setFontePremium(j.fonte || "");
    } catch (e) {
      setErroPremium((e as Error).message);
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
    const tick = () => { if (!document.hidden) { carregar(); carregarEnvios(); carregarCrono(); carregarPremium(); } };
    carregar(); carregarEnvios(); carregarCrono(); carregarPremium();
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); window.removeEventListener("focus", tick); };
  }, [carregar, carregarEnvios, carregarCrono, carregarPremium]);

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

  const feitos = (cronograma ?? []).filter((c) => envios[c.id]?.enviado || enviadoNaPlanilha(c)).length;
  const badge: Record<Aba, string> = {
    painel: dados ? String(dados.metricas.inscritos) : "",
    respostas: dados ? String(dados.metricas.respostasBrutas) : "",
    sintese: dados ? String(dados.metricas.comDificuldade) : "",
    cronograma: cronograma ? `${feitos}/${cronograma.length}` : "",
    premium: premium ? `${premium.filter((c) => envios[c.id]?.enviado || enviadoNaPlanilha(c)).length}/${premium.length}` : "",
  };
  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="logo">S</span>
          <div>
            Playbook
            <small>Rodada de Negócios · Novo Campeche Spot II</small>
          </div>
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
          <button onClick={() => { carregar(); carregarEnvios(); carregarCrono(); carregarPremium(); }}>Atualizar agora</button>
          <div className="sub">Quinta-feira, 15/10/2026, às 19h</div>
        </div>
      </aside>

      <main className="main">
      <header className="top">
        <h1>{atual.nome}</h1>
      </header>

      {erro && <div className="err">{erro}</div>}
      {aba === "cronograma" && erroCrono && <div className="err">{erroCrono}</div>}
      {aba === "premium" && erroPremium && <div className="err">{erroPremium}</div>}
      {dados?.demo && <div className="note">Modo demonstração: dados fictícios (DEMO=1). Remova a variável para ler a planilha real.</div>}

      {aba === "cronograma" ? (
        <Cronograma lista={cronograma} envios={envios} atualizar={atualizar} persistir={persistir} editando={editando} compartilhado={compartilhado} />
      ) : aba === "premium" ? (
        <Cronograma lista={premium} envios={envios} atualizar={atualizar} persistir={persistir} editando={editando} compartilhado={compartilhado}
          fonte={fontePremium === "embutido" ? "Cronograma Premium v2 (embutido no site até a aba Premium entrar na planilha)" : "Cronograma Treinamento NC2 Spot · aba Premium"} />
      ) : !dados ? (
        <div className="empty">Carregando respostas...</div>
      ) : aba === "painel" ? (
        <Painel d={dados} verTodas={() => trocar("respostas")} />
      ) : aba === "respostas" ? (
        <Respostas d={dados} />
      ) : (
        <Sintese d={dados} />
      )}
      </main>
    </div>
  );
}

const EVENTO = new Date("2026-10-15T19:00:00-03:00");
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaBRT = (t: number) => new Date(t - 3 * 3600_000).toISOString().slice(0, 10);

// Relógio só no navegador (evita diferença entre servidor e tela na hidratação).
function useAgora(ms = 30_000) {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    setT(Date.now());
    const i = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return t;
}

function Contagem() {
  const agora = useAgora();
  if (agora === null) return <div className="countdown" />;
  const diff = EVENTO.getTime() - agora;
  if (agora > EVENTO.getTime() + 3 * 3600_000) return <div className="countdown"><div><b>Encerrado</b><span>obrigado!</span></div></div>;
  if (diff <= 0) return <div className="countdown live"><div><b>No ar</b><span>agora</span></div></div>;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return (
    <div className="countdown" aria-label={`Faltam ${d} dias, ${h} horas e ${m} minutos`}>
      <div><b>{d}</b><span>dia{d === 1 ? "" : "s"}</span></div>
      <div><b>{h}</b><span>hora{h === 1 ? "" : "s"}</span></div>
      <div><b>{m}</b><span>min</span></div>
    </div>
  );
}

function Kpi({ n, l, s }: { n: number | string; l: string; s?: string }) {
  return (
    <div className="card kpi">
      <div className="l">{l}</div>
      <div className="n">{n}</div>
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

// Barra 100% dividida em Sim / Não / Sem resposta, com legenda e números.
function Divisao({ titulo, sim, nao, total, rotSim, rotNao }: { titulo: string; sim: number; nao: number; total: number; rotSim: string; rotNao: string }) {
  const sem = Math.max(0, total - sim - nao);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const partes = [
    { k: "sim", n: sim, rot: rotSim },
    { k: "nao", n: nao, rot: rotNao },
    { k: "sem", n: sem, rot: "Sem resposta" },
  ].filter((p) => p.n > 0);
  return (
    <div className="divisao">
      <div className="divisao-t">{titulo}</div>
      <div className="stack" role="img" aria-label={partes.map((p) => `${p.rot}: ${p.n}`).join(", ")}>
        {total ? partes.map((p) => <i key={p.k} className={p.k} style={{ flexGrow: p.n }} title={`${p.rot}: ${p.n} (${pct(p.n)}%)`} />) : <i className="vazio" />}
      </div>
      <div className="legenda">
        <span><i className="sim" />{rotSim} <b>{sim}</b> <em>{pct(sim)}%</em></span>
        <span><i className="nao" />{rotNao} <b>{nao}</b> <em>{pct(nao)}%</em></span>
        {sem > 0 && <span><i className="sem" />Sem resposta <b>{sem}</b></span>}
      </div>
    </div>
  );
}

function Painel({ d, verTodas }: { d: Dados; verTodas: () => void }) {
  const m = d.metricas;
  const agora = useAgora();
  const pctInv = m.inscritos ? Math.round((m.comInvestidor / m.inscritos) * 100) : 0;
  const hoje = agora ? m.porDia.find((x) => x.dia === diaBRT(agora))?.qtd ?? 0 : 0;
  const maxDia = Math.max(1, ...m.porDia.map((x) => x.qtd));
  const unicos = d.respostas.filter((r) => !r.duplicado);
  const ultima = unicos[0]?.ts ?? null;
  const [ultData, ultHora] = ultima ? fmtDataHora(ultima).split(" às ") : ["", ""];

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow"><span className="dot" /> Rodada de negócios · ao vivo</span>
          <h2>Novo Campeche Spot II</h2>
          <p>Quinta-feira, 15/10/2026, às 19h00 · 10 studios com condição que só existe durante a live</p>
        </div>
        <Contagem />
      </section>

      <div className="hero-kpis">
        <div className="card big">
          <div className="big-l">Inscritos</div>
          <div className="big-n">{m.inscritos}</div>
          <div className="big-s">
            {hoje ? <span className="pill">+{hoje} hoje</span> : <span className="pill neutro">nenhum hoje ainda</span>}
            WhatsApp únicos{m.duplicados ? ` · ${m.duplicados} repetido(s) fora da conta` : ""}
          </div>
        </div>
        <div className="card big destaque">
          <div className="big-l">Têm cliente para indicar</div>
          <div className="big-n">{m.comInvestidor}<small>{pctInv}% dos inscritos</small></div>
          <div className="meter" role="img" aria-label={`${pctInv}% dos inscritos têm cliente para indicar`}><i style={{ width: `${pctInv}%` }} /></div>
          <div className="big-s">{m.semInvestidor} ainda sem cliente em mente</div>
        </div>
      </div>

      <div className="grid kpis">
        <Kpi n={m.jaVenderam} l="Já venderam Spot" s={m.inscritos ? `${Math.round((m.jaVenderam / m.inscritos) * 100)}% dos inscritos` : undefined} />
        <Kpi n={m.nuncaVenderam} l="Nunca venderam" s="oportunidade de capacitar" />
        <Kpi n={m.comDificuldade} l="Contaram a maior dificuldade" s="veja a aba Síntese" />
        <Kpi n={ultHora || "-"} l="Última inscrição" s={ultData || "aguardando a primeira"} />
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Inscrições por dia</h2>
          {m.porDia.length ? (
            <div className="bars">
              {m.porDia.map((x) => {
                const dt = new Date(`${x.dia}T12:00:00-03:00`);
                return (
                  <div className="bar" key={x.dia} tabIndex={0}>
                    <span className="tip">{fmtDia(x.dia)} ({SEMANA[dt.getUTCDay()]}): <b>{x.qtd}</b> inscrição(ões)</span>
                    <b>{x.qtd}</b>
                    <i style={{ height: `${(x.qtd / maxDia) * 100}%` }} />
                    <span>{fmtDia(x.dia)}</span>
                  </div>
                );
              })}
            </div>
          ) : <div className="empty">Ainda sem inscrições.</div>}
        </div>
        <div className="card">
          <h2>Perfil dos inscritos</h2>
          <Divisao titulo="Têm cliente para indicar?" sim={m.comInvestidor} nao={m.semInvestidor} total={m.inscritos} rotSim="Tem cliente" rotNao="Ainda não" />
          <Divisao titulo="Já venderam Spot Seazone?" sim={m.jaVenderam} nao={m.nuncaVenderam} total={m.inscritos} rotSim="Já vendeu" rotNao="Nunca vendeu" />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Inscrições recentes</h2>
          {unicos.length > 8 && <button onClick={verTodas}>Ver todas ({unicos.length})</button>}
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Data da inscrição</th><th>Nome</th><th>Já vendeu</th><th>Cliente para indicar</th></tr></thead>
            <tbody>
              {unicos.slice(0, 8).map((r, i) => (
                <tr key={i}>
                  <td className="nowrap">{fmtDataHora(r.ts)}</td><td><b>{r.nome}</b></td>
                  <td><span className={`tag ${r.vendeu ? "sim" : ""}`}>{r.vendeu === null ? "-" : r.vendeu ? "Sim" : "Não"}</span></td>
                  <td><span className={`tag ${r.investidor ? "sim" : ""}`}>{r.investidor === null ? "-" : r.investidor ? "Tem cliente" : "Ainda não"}</span></td>
                </tr>
              ))}
              {!unicos.length && <tr><td colSpan={4} className="empty">Nenhuma inscrição ainda. Assim que alguém preencher o Forms, aparece aqui em segundos.</td></tr>}
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
          <thead><tr><th>Data da inscrição</th><th>Nome</th><th>WhatsApp</th><th>Já vendeu</th><th>Cliente para indicar</th><th>Maior dificuldade</th></tr></thead>
          <tbody>
            {lista.map((r, i) => (
              <tr key={i}>
                <td className="nowrap">{fmtDataHora(r.ts)}</td>
                <td>{r.nome} {r.duplicado && <span className="tag dup">repetido</span>}</td>
                <td>{r.whatsapp}</td>
                <td>{r.vendeu === null ? "-" : r.vendeu ? "Sim" : "Não"}</td>
                <td><span className={`tag ${r.investidor ? "sim" : ""}`}>{r.investidor === null ? "-" : r.investidor ? "Tem cliente" : "Ainda não"}</span></td>
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

type Disp = Disparo;

// A planilha manda: "Enviado"/"Disparado" na coluna Status do disparo conta como enviado.
const enviadoNaPlanilha = (c: Disp) => /enviad|disparad|conclu|feito/.test(c.status.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
// Mensagens de 2 blocos: o que vem abaixo desta linha é o texto pronto para o investidor.
const SEP_BLOCO = "━━━━━━━━━━━━";
const blocoInvestidor = (t: string) => (t.includes(SEP_BLOCO) ? t.split(SEP_BLOCO).slice(1).join(SEP_BLOCO).trim() : null);
const fmtNum = (n: number | null) => (n === null ? "-" : n.toLocaleString("pt-BR"));

function Cronograma({ lista, envios, atualizar, persistir, editando, compartilhado, fonte = "Cronograma Treinamento NC2 Spot" }: {
  fonte?: string;
  lista: Disp[] | null;
  envios: Envios;
  atualizar: (id: string, patch: Partial<Envio>, gravar?: boolean) => void;
  persistir: (id: string, e: Envio, todos: Envios) => Promise<void>;
  editando: { current: boolean };
  compartilhado: boolean;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Disp | null>(null);
  const [nomeEx, setNomeEx] = useState("Maria");
  const agora = useAgora();
  const hoje = agora ? diaBRT(agora) : "";
  const itensLista = lista ?? [];

  const porDia = useMemo(() => {
    const m = new Map<string, Disp[]>();
    for (const c of itensLista) m.set(c.data, [...(m.get(c.data) ?? []), c]);
    return [...m.entries()];
  }, [itensLista]);

  if (!lista) return <div className="empty">Carregando cronograma da planilha...</div>;

  const feito = (c: Disp) => !!envios[c.id]?.enviado || enviadoNaPlanilha(c);
  const total = lista.length;
  const feitos = lista.filter(feito).length;
  const pessoas = lista.reduce((s, c) => s + (envios[c.id]?.qtd ?? c.numeros.enviados ?? 0), 0);
  const proximo = lista.find((c) => !feito(c) && c.data >= hoje);

  const copiar = async (c: Disp, so: "tudo" | "investidor" = "tudo") => {
    const txt = so === "investidor" ? blocoInvestidor(c.texto) ?? c.texto : c.texto;
    const chave = `${c.id}:${so}`;
    try { await navigator.clipboard.writeText(txt); setCopiado(chave); setTimeout(() => setCopiado(null), 1500); } catch {}
  };

  return (
    <>
      {!compartilhado && (
        <div className="note">
          <b>Os checks e as quantidades estão salvos só neste navegador.</b> Para todo mundo ver o mesmo, conecte o banco no Vercel: Storage → Upstash Redis → Connect ao projeto → Redeploy.
        </div>
      )}
      <div className="grid kpis" style={{ marginTop: 0 }}>
        <div className="card kpi">
          <div className="l">Disparos feitos</div>
          <div className="n">{feitos}<span className="de"> de {total}</span></div>
          <div className="meter ok" style={{ marginTop: 8 }}><i style={{ width: `${total ? (feitos / total) * 100 : 0}%` }} /></div>
        </div>
        <Kpi n={pessoas.toLocaleString("pt-BR")} l="Pessoas que receberam" s="soma dos disparos preenchidos" />
        <Kpi n={proximo ? `${fmtDia(proximo.data)} · ${proximo.horario}` : "-"} l="Próximo disparo" s={proximo ? `${proximo.mensagem} · ${proximo.base}` : "nenhum pendente"} />
      </div>
      <div className="sub" style={{ marginTop: 10 }}>Mensagens lidas de <b>{fonte}</b>. Mudou o texto lá, muda aqui em segundos.</div>

      {porDia.map(([data, itens]) => (
        <div key={data}>
          <div className="dia">
            {fmtDia(data)}/{data.slice(0, 4)} · {itens[0].dia}
            {data === hoje && <span className="tag hoje">hoje</span>}
            <small>{itens.length} disparo(s)</small>
          </div>
          {itens.map((c) => {
            const e = envios[c.id];
            const naPlanilha = enviadoNaPlanilha(c);
            const done = !!e?.enviado || naPlanilha;
            const n = c.numeros;
            const temNumeros = Object.values(n).some((v) => v !== null);
            return (
              <div key={c.id} className={`card disp ${done ? "done" : ""}`}>
                <input
                  type="checkbox" checked={done} disabled={naPlanilha}
                  title={naPlanilha ? "Marcado como enviado na planilha" : "Marcar como enviado"}
                  onChange={(ev) => atualizar(c.id, { enviado: ev.target.checked })} aria-label="Marcar como enviado"
                />
                <div style={{ minWidth: 0 }}>
                  <div className="meta">
                    <strong>{c.mensagem} · {c.nome}</strong>
                    <span className="tag">{c.horario}</span>
                    <span className="tag">{c.base}</span>
                    <span className="tag">{c.tipo}</span>
                    {done
                      ? <span className="tag sim">enviado{e?.em ? ` ${fmtData(e.em)}` : ""}</span>
                      : c.status && <span className="tag">{c.status}</span>}
                  </div>
                  <div className="sub"><b>Gancho:</b> {c.gancho}{c.objetivo ? <> · <b>Objetivo:</b> {c.objetivo}</> : null}</div>
                  {c.obs && <div className="sub">⚠️ {c.obs}</div>}
                  <div className="msg-wrap">
                    {c.arte && <a href={c.arte} target="_blank" rel="noreferrer" className="arte" title="Abrir a arte em tamanho real"><img src={c.arte} alt={`Arte da ${c.mensagem}`} /></a>}
                    <div className="msg">{c.texto}</div>
                  </div>
                  {temNumeros && (
                    <div className="nums">
                      <span>Enviados <b>{fmtNum(n.enviados)}</b></span>
                      <span>Recebidos <b>{fmtNum(n.recebidos)}</b></span>
                      <span>Lidos <b>{fmtNum(n.lidos)}</b></span>
                      <span>Cliques <b>{fmtNum(n.cliques)}</b></span>
                      <span>Inscritos <b>{fmtNum(n.inscritos)}</b></span>
                    </div>
                  )}
                </div>
                <div className="acts">
                  <button className="primary" onClick={() => copiar(c)}>{copiado === `${c.id}:tudo` ? "Copiado ✓" : "Copiar mensagem"}</button>
                  {blocoInvestidor(c.texto) && (
                    <button onClick={() => copiar(c, "investidor")} title="Copia só o texto abaixo da linha, que o parceiro encaminha">
                      {copiado === `${c.id}:investidor` ? "Copiado ✓" : "Copiar texto do investidor"}
                    </button>
                  )}
                  <button className="wa-btn" onClick={() => setPrevia(c)}>Ver no WhatsApp</button>
                  <label className="qtd">
                    Pessoas que receberam
                    <input
                      type="number" min={0} inputMode="numeric" placeholder={n.enviados !== null ? String(n.enviados) : "0"}
                      value={e?.qtd ?? ""}
                      onFocus={() => { editando.current = true; }}
                      onChange={(ev) => atualizar(c.id, { qtd: ev.target.value === "" ? null : Math.max(0, Number(ev.target.value)) }, false)}
                      onBlur={() => { editando.current = false; const atual = envios[c.id]; if (atual) persistir(c.id, atual, envios); }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {!lista.length && <div className="empty">A planilha do cronograma está sem disparos.</div>}
      {previa && (
        <WhatsAppPreview
          texto={previa.texto} arte={previa.arte} horario={previa.horario} nome={nomeEx} setNome={setNomeEx}
          titulo={`${previa.mensagem} · ${fmtDia(previa.data)} · ${previa.base}`}
          fechar={() => setPrevia(null)}
        />
      )}
    </>
  );
}
