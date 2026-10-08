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
