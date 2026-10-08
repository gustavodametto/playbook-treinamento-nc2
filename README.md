# Playbook · Treinamento Novo Campeche Spot II

Painel em Next.js (VS Code + Vercel) com 4 abas:

| Aba | O que mostra |
|---|---|
| Painel | Inscritos (WhatsApp únicos), já venderam, têm investidor, inscrições por dia, últimas inscrições |
| Respostas | Todas as respostas do Forms, com busca; repetidos marcados |
| Síntese das dificuldades | Temas da pergunta "Qual a sua maior dificuldade na hora de vender?" com exemplos e síntese (IA opcional) |
| Cronograma de disparos | 10 disparos do WhatsApp com a mensagem, botão Copiar, check de enviado, nº de pessoas que receberam e prévia de como chega no WhatsApp |

Atualiza sozinho a cada 5 segundos (e no botão Atualizar), lendo a planilha de respostas ao vivo.

## Rodar no VS Code

```bash
npm install
npm run dev
```

Abre em http://localhost:3100. Para ver com dados fictícios, crie `.env.local` com `DEMO=1`.

## Publicar no Vercel

1. Suba a pasta para um repositório e importe no Vercel (ou `npx vercel`).
2. Em Settings > Environment Variables, defina (veja `.env.example`):
   - `APP_PASSWORD`: senha do painel (a base tem nome e WhatsApp, não deixe aberto).
   - `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`: Marketplace > Upstash Redis. Faz o check de "enviado" ser compartilhado. Sem isso, o check fica só no navegador de quem marcou.
   - `ANTHROPIC_API_KEY` (opcional): síntese por IA. Sem ela, usa a classificação por temas.
3. A planilha precisa estar com "Qualquer pessoa com o link: Leitor". Se preferir não abrir, use Arquivo > Compartilhar > Publicar na Web (CSV) e informe `SHEET_CSV_URL`.

## Como os dados são tratados

- Colunas são achadas pelo texto do cabeçalho (Carimbo, Nome, WhatsApp, vendeu, investidor, dificuldade), então reordenar o Forms não quebra.
- Inscrito único = WhatsApp canônico (sem 55 e sem 9º dígito). Repetidos aparecem na aba Respostas, mas não entram na contagem.
- Síntese: não há categorias pré-definidas. As respostas da pergunta de dificuldade são agrupadas só quando são iguais (sem diferenciar maiúsculas, acentos e pontuação) e cada grupo mostra o texto que o parceiro escreveu.
- Cronograma: edite `data/cronograma.ts` para mudar datas, bases ou textos.
