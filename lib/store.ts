import { createClient } from "redis";

// Guarda o "check de enviado" e a quantidade, compartilhados entre todos que abrem o site.
// Aceita dois jeitos de conectar:
// - Redis Cloud (Marketplace do Vercel) ou qualquer Redis: REDIS_URL (redis://... ou rediss://...)
// - Upstash (REST): UPSTASH_REDIS_REST_URL/TOKEN ou KV_REST_API_URL/TOKEN
const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL;
const KEY = "treinamento-nc2:envios";

export type Envio = { enviado: boolean; em: string | null; qtd: number | null };
export type Envios = Record<string, Envio>;

export const storeConfigurado = () => Boolean((REST_URL && REST_TOKEN) || REDIS_URL);

async function rest(cmd: (string | number)[]) {
  const res = await fetch(REST_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result;
}

// Uma conexão por instância do servidor, reaproveitada entre requisições.
type Cliente = ReturnType<typeof createClient>;
const g = globalThis as unknown as { __redis?: Promise<Cliente> };
function cliente(): Promise<Cliente> {
  if (!g.__redis) {
    const c = createClient({ url: REDIS_URL, socket: { connectTimeout: 5000 } });
    c.on("error", () => {}); // erro de conexão vira erro na chamada, sem derrubar o servidor
    g.__redis = c.connect().then(() => c).catch((e) => { g.__redis = undefined; throw e; });
  }
  return g.__redis;
}

export async function lerEnvios(): Promise<Envios> {
  const out: Envios = {};
  if (REST_URL && REST_TOKEN) {
    const raw: string[] | null = await rest(["HGETALL", KEY]);
    if (raw) for (let i = 0; i < raw.length; i += 2) out[raw[i]] = JSON.parse(raw[i + 1]);
    return out;
  }
  const raw = await (await cliente()).hGetAll(KEY);
  for (const [k, v] of Object.entries(raw)) out[k] = JSON.parse(v);
  return out;
}

export async function gravarEnvio(id: string, envio: Envio) {
  if (REST_URL && REST_TOKEN) {
    await rest(["HSET", KEY, id, JSON.stringify(envio)]);
    return;
  }
  await (await cliente()).hSet(KEY, id, JSON.stringify(envio));
}
