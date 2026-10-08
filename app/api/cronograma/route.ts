import { NextResponse } from "next/server";
import { carregarCronograma } from "@/lib/cronograma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ disparos: await carregarCronograma(), atualizadoEm: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
