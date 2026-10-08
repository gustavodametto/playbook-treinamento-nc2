"use client";

import { Fragment, useEffect, type ReactNode } from "react";

// Formatação do WhatsApp: *negrito*, _itálico_, ~tachado~, ```mono``` e links clicáveis.
const TOKEN = /(```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;

function formatar(texto: string): ReactNode[] {
  return texto.split(TOKEN).map((p, i) => {
    if (!p) return null;
    if (p.startsWith("```") && p.endsWith("```") && p.length > 6) return <code key={i}>{p.slice(3, -3)}</code>;
    if (/^\*[^*\n]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>;
    if (/^_[^_\n]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^~[^~\n]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// Placeholders entre colchetes (ex.: [LINK DE INSCRIÇÃO]) aparecem destacados para lembrar de trocar.
function comPlaceholders(texto: string): ReactNode[] {
  return texto.split(/(\[[^\]\n]+\])/g).map((p, i) =>
    /^\[[^\]\n]+\]$/.test(p) ? <mark key={i} title="Trocar antes de enviar">{p}</mark> : <Fragment key={i}>{formatar(p)}</Fragment>,
  );
}

export default function WhatsAppPreview({ texto, nome, setNome, horario, titulo, fechar }: {
  texto: string;
  nome: string;
  setNome: (n: string) => void;
  horario: string;
  titulo: string;
  fechar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fechar]);

  const msg = texto.replaceAll("{{nome}}", nome.trim() || "Parceiro");
  const hora = horario.replace("h", ":");

  return (
    <div className="wa-overlay" onClick={fechar} role="dialog" aria-modal="true" aria-label="Prévia no WhatsApp">
      <div className="wa-box" onClick={(e) => e.stopPropagation()}>
        <div className="wa-tools">
          <strong>{titulo}</strong>
          <label>
            Nome de exemplo
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Parceiro" />
          </label>
          <button onClick={fechar}>Fechar</button>
        </div>
        <div className="wa-phone">
          <div className="wa-head">
            <span className="wa-back">‹</span>
            <span className="wa-avatar">S</span>
            <div>
              <b>Seazone Parcerias</b>
              <small>conta comercial</small>
            </div>
          </div>
          <div className="wa-chat">
            <div className="wa-day">HOJE</div>
            <div className="wa-bubble">
              {comPlaceholders(msg)}
              <span className="wa-time">{hora}</span>
            </div>
          </div>
          <div className="wa-input"><span>Mensagem</span></div>
        </div>
        <div className="sub">Assim o parceiro recebe. {"{{nome}}"} é trocado pelo nome de exemplo; trechos destacados em amarelo precisam ser substituídos antes do envio.</div>
      </div>
    </div>
  );
}
