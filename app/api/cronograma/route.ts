import { NextResponse } from "next/server";
import { carregarCronograma, fonteDe, type Lista } from "@/lib/cronograma";

export const dynamic = "force-dynamic";

// ?lista=premium devolve o cronograma Premium; sem parâmetro, o geral.
export async function GET(req: Request) {
  const lista: Lista = new URL(req.url).searchParams.get("lista") === "premium" ? "premium" : "geral";
  try {
    return NextResponse.json({ lista, fonte: fonteDe(lista), disparos: await carregarCronograma(lista), atualizadoEm: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
