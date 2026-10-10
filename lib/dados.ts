import { parseCsv } from "./csv";
import {
  Dados, linhasParaRespostas, montarMetricas, montarTemas, textoSinteseTemas, Resposta,
} from "./analise";
import { sinteseIA } from "./sintese-ia";
import { farmerDe, farmersAtualizadoEm } from "./farmers";

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
  // Export CSV primeiro: o gviz descarta valores "fora do tipo" da coluna (ex.: "(48) 9..." no meio de números) e o WhatsApp vinha vazio.
  const urls = process.env.SHEET_CSV_URL
    ? [process.env.SHEET_CSV_URL]
    : [`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`, `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`];
  let res: Response | null = null;
  let txt = "";
  for (const url of urls) {
    res = await fetch(url, { cache: "no-store", redirect: "follow" });
    txt = await res.text();
    if (res.ok && !/^\s*<(!doctype|html)/i.test(txt)) break;
  }
  if (!res || !res.ok || /^\s*<(!doctype|html)/i.test(txt)) {
    throw new Error(
      "Não consegui ler a planilha. Em Compartilhar, deixe \"Qualquer pessoa com o link: Leitor\" (ou use Arquivo > Compartilhar > Publicar na Web e informe SHEET_CSV_URL)."
    );
  }
  return txt;
}

export async function carregarDados(): Promise<Dados> {
  const demo = process.env.DEMO === "1";
  const respostas: Resposta[] = linhasParaRespostas(parseCsv(await baixarCsv())).map((r) => ({ ...r, farmer: farmerDe(r.chave) }));
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
  return { atualizadoEm: new Date().toISOString(), demo, respostas, metricas, temas, sintese, farmersAtualizadoEm };
}
