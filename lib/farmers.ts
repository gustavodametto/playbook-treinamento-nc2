import mapa from "@/data/farmers.json";

// Farmer responsável por cada parceiro, pelo telefone (chave canônica: DDD + 8 últimos dígitos).
// Fonte: Nekt — campo "Farmer Parcerias" da organização no Pipedrive ou, sem ele, o executivo do portal de parceiros.
// O arquivo data/farmers.json é uma foto: para atualizar, gere de novo a partir do Nekt.
type Mapa = { atualizadoEm: string; farmers: string[]; mapa: Record<string, number> };
const M = mapa as unknown as Mapa;

export const farmersAtualizadoEm = M.atualizadoEm;

export function farmerDe(chave: string): string | null {
  const i = chave ? M.mapa[chave] : undefined;
  return i === undefined ? null : M.farmers[i] ?? null;
}
