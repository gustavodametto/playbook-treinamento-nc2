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
