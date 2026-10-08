import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playbook Treinamento NC2",
  description: "Painel de inscrições, síntese de dificuldades e cronograma de disparos do treinamento Novo Campeche Spot II.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
