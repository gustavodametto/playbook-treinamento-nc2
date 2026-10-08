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
