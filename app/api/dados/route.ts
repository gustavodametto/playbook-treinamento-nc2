import { NextResponse } from "next/server";
import { carregarDados } from "@/lib/dados";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await carregarDados(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
