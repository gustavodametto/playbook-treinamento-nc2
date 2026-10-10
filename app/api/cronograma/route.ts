import { NextResponse } from "next/server";
import { carregarCronograma, type Lista } from "@/lib/cronograma";

export const dynamic = "force-dynamic";

// ?lista=premium devolve o cronograma Premium; sem parâmetro (ou ?lista=pool), o do Pool.
export async function GET(req: Request) {
  const lista: Lista = new URL(req.url).searchParams.get("lista") === "premium" ? "premium" : "pool";
  try {
    const { disparos, fonte, aviso } = await carregarCronograma(lista);
    return NextResponse.json({ lista, fonte, aviso: aviso ?? null, disparos, atualizadoEm: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
