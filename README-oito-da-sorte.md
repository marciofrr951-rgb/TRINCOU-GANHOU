# Palpite da Sorte — plataforma de jogos

Estrutura do site após a reformulação:

| Arquivo | O que é |
|---|---|
| `index.html` | **Home da plataforma** "Palpite da Sorte" (lista de jogos) |
| `trincou-ganhou.html` | Jogo **Trincou Ganhou** (era o antigo `index.html`) |
| `oito-da-sorte.html` | Jogo novo **08 da Sorte** |
| `functions/` | Funções Cloudflare (proxy, pagamento PIX, webhook) — compartilhadas |
| `apps-script/oito-da-sorte.gs` | Código pra colar no seu Google Apps Script |

A navegação: a pessoa entra em `index.html`, escolhe o jogo, e cada jogo tem um link **← Voltar para Palpite da Sorte**.

---

## Como o 08 da Sorte funciona

- Cada jogador paga uma **cota** (padrão R$ 20,00) e escolhe **8 números de 01 a 80**.
- Todos os dias usamos o resultado da **Quina** (5 números sorteados).
- Cada número do jogador que já tiver sido sorteado (desde a data de início da rodada) vale **1 ponto**.
- Quem **completar os 8 primeiro** leva o prêmio principal. Empate → prêmio dividido.
- A **menor pontuação ao final** leva o prêmio de consolação.
- O **quadro de jogadores é público**: mostra nome + os 8 números (os já sorteados ficam marcados) + pontos. O telefone **não** aparece publicamente.

O cálculo de pontos e a marcação dos acertos são feitos no navegador, cruzando as cotas com os resultados da Quina (`acao=resultado`).

---

## ⚙️ O que VOCÊ precisa fazer (uma vez) — Google Apps Script

O site fala com a mesma planilha do Trincou via Apps Script. Para o 08 da Sorte funcionar:

1. Abra a planilha do Google → **Extensões → Apps Script**.
2. Cole **todo** o conteúdo de `apps-script/oito-da-sorte.gs` no fim do seu `Código.gs`.
3. Na sua função **`doGet(e)`** já existente, adicione como primeira linha:
   ```js
   var _o = handleOitoGet_(e); if (_o) return _o;
   ```
4. Na sua função **`doPost(e)`** já existente, adicione como primeira linha:
   ```js
   var _o = handleOitoPost_(e); if (_o) return _o;
   ```
5. Salve e republique: **Implantar → Gerenciar implantações → (lápis) Editar → Versão: Nova versão → Implantar**. A URL continua a mesma.

Na primeira execução ele cria sozinho duas abas:

- **`OitoDaSorte`** — onde ficam as cotas (rodada, cota, id, nome, telefone, números, status, cambista, datas).
- **`OitoConfig`** — onde você ajusta a rodada:

| chave | valor (exemplo) | o que é |
|---|---|---|
| `totalCotas` | 100 | quantas cotas a rodada tem |
| `valorCota` | 20 | valor de cada cota (R$) |
| `premioPrincipal` | 1200 | prêmio de quem fecha os 8 primeiro |
| `premioConsolacao` | 200 | prêmio da menor pontuação |
| `percOrganizador` | 20 | sua % (informativo) |
| `dataInicio` | 2026-06-15 | **a partir dessa data** os sorteios contam pontos |
| `rodada` | 1 | número da rodada atual |

> Para **abrir uma rodada**: defina `dataInicio` (formato `AAAA-MM-DD`) e os valores. Para **começar outra rodada do zero**, aumente `rodada` (ex.: 2) e ajuste `dataInicio` — as cotas antigas ficam guardadas, e o quadro passa a mostrar só a rodada atual.

### PIN do cambista (pagamento em dinheiro)
O pagamento em dinheiro valida o PIN na sua aba de cambistas. No topo do `.gs`, ajuste se necessário:
```js
var OITO_CAMBISTAS_ABA = 'Cambistas'; // nome da sua aba de cambistas
var OITO_CAMBISTA_COL_NOME = 1;        // coluna do nome (A=1)
var OITO_CAMBISTA_COL_PIN  = 2;        // coluna do PIN (B=2)
```

---

## Pagamento (PIX)

Já está integrado e reaproveita o Mercado Pago do Trincou:
- `functions/pagamento.js` agora aceita `jogo: 'oito'` e marca isso no pagamento.
- `functions/webhook.js` detecta o jogo e dá baixa na aba certa (`oito_baixa`) quando o PIX é aprovado.

Nenhuma variável de ambiente nova é necessária (usa `APPS_SCRIPT_URL` e `MP_ACCESS_TOKEN` já existentes).

---

## Pendências / próximos passos sugeridos
- Trocar os ícones em emoji/CSS pelas **logos oficiais** (de preferência PNG com fundo transparente) na home e no 08 da Sorte.
- Painel admin para abrir/fechar rodadas sem mexer na planilha (hoje é via aba `OitoConfig`).
- Definir as regras de desempate fino do "menor pontuação" ao final da rodada.
