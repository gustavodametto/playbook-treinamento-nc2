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
