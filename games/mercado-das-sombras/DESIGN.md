# Mercado das Sombras / Shadow Market

## Pitch
Sete ações, regras de preço escondidas. Descubra o padrão antes dos outros e fique milionário.

## Players
3–16. Cada um por si; abaixo de 3 as regras de volume perdem graça. 24 rodadas de 1 a 5 min
(padrão 5 min, ~2 h; com 1 min, ~30 min).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Regra de cada empresa (palavra a palavra) | ninguém | palavras reveladas em publicView/playerView/dealerIdleView; trechos ocultos viram um □□□ fixo | 1 palavra-pista no início; ~25/50/75% nas rodadas 5/10/15; tudo na 20 |
| Ordem de revelação | ninguém | trechos da próxima leva marcados (`next`) | quando revelados |
| Caixa e carteira de cada jogador | o próprio | playerView | nunca (só o patrimônio total, no ranking) |
| Compras/vendas da rodada | ninguém | — | no fechamento, somadas por empresa |
| Pedido de Segredo | quem pediu | playerView | nunca (só a empresa oculta aparece) |
| Empresa sob Segredo (rodadas r+1, r+2) | ninguém, nem quem ativou | `???` em todos os devices | o preço volta quando a rodada r+3 entra na tela; os fechamentos r e r+1 nunca voltam ao gráfico |
| Patrimônios enquanto há Segredo | ninguém | ranking mostra a ordem, valores `???` | quando nenhum Segredo está ativo |
| Caixa de quem negociou às cegas | ninguém | o próprio vê `???` | fim do Segredo |

Feedback que vaza: comprar além do caixa numa ação oculta seria recusado e revelaria o preço —
por isso a compra é preenchida até o máximo pagável, sem mensagem.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | `intro` 10 min (rede de segurança) | Host avança/pula | slide + demo | Host: Anterior/Próximo/Pular | — |
| trading | `roundSeconds`, 300 s | nunca | painel (logo, RODADA N, contagem, 7 cards, ranking) | comprar/vender, Segredo | — |
| closing | 8 s (14 s antes das rodadas 5/10/15/20) | — | novos preços ▲/▼, volumes, ranking; nos marcos, a revelação das regras | "Mercado fechado" | — |
| final | 14 s | — | todas as regras + ranking final com pontos | patrimônio final e pontos | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'trade', company, qty}` | phone | trading; 0≤company<7; qty inteiro ≠0, \|qty\|≤9999 | qty>0 compra até o caixa; qty<0 vende até o que tem; ao preço atual |
| `{type:'secret', company \| null}` | phone | trading, Segredo não usado, rodada < 24 | marca/troca/cancela o Segredo; vale no fechamento |
| `{type:'intro', dir}` | Host | intro | navega o tutorial |
| `{type:'tvRules', page \| null}` | Host | sempre | mostra/tira página de regras na TV |

## Scoring and end
Fim no fechamento da rodada 24. Patrimônio = caixa + ações × último preço. Pontos: ≥$1,5 mi = 1,
≥$3 mi = 2, ≥$6 mi = 3; 1º lugar +1 (empatados no 1º, todos). `ctx.end` após a fase final.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | — |
| roundSeconds | select | "300" | 60 / 90 / 120 / 180 / 300 |
| noise | select | "off" | off / light ±2% / strong ±5% |
| dealerHints | boolean | false | — |

## Dealer
Sem visitas (`usesDealer: false`). Opção do Host `dealerHints` (padrão desligada): a tela do Dealer vira um painel fixo (`dealerIdleView`) só com as dicas públicas das regras; com telas remotas, qualquer jogador pode abri-lo (`dealerAudience`).

## Disconnects
Pausa da plataforma; depois do timeout o jogo segue. O jogador mantém caixa e ações; um Segredo
pedido antes vale no fechamento. Host que sai no tutorial → começa a rodada 1.

## Tutorial and rules
Slides: Como jogar (demo: dois cards) · Regras ocultas (pílula □□□ e revelação) · Comprar e vender
(mini celular) · O Segredo (card com ???) · A rodada e os pontos (faixas). Regras: Visão geral ·
Painel da TV · Comprar e vender · Regras ocultas · O Segredo · A rodada · Situações especiais ·
Pontuação e fim · Créditos. Faixa rolante (text crawl) no rodapé da TV, sob os cards, com as dicas de todas as regras. O demo do tutorial mostra só □□□, nunca o formato de uma regra.

## Credits
Adaptação do "Mystery Stock Market" de The Devil's Plan T3E4 — ver CREDITS.md.

## Remote players
Nada muda.

## Edge cases
Empate no ranking divide posição; ninguém negocia → preços seguem as regras; Segredos simultâneos
na mesma empresa → um efeito, todos gastos; Segredo na rodada 24 bloqueado; preço mínimo $100;
16 jogadores cabem no ranking da TV.

## Hidden rule bank
20 modelos (condição → efeito com números sorteados): total em carteira numa faixa; por ação de
variação no total; compras vs. outra empresa; vendas > compras; ninguém comprou; nº de detentores;
total subiu; o líder tem a ação; humor do mercado (efeito na rodada seguinte); contrária à maioria;
segue/inverte outra empresa; mais barata que outra; ciclo (cai n, sobe 1); rodadas ímpares/pares;
a cada m rodadas; antes/depois da rodada r; reversão a um preço; Segredo em outra empresa; sob
Segredo. Cada partida sorteia 7 distintos (2–4 dependentes dos jogadores, 1–3 de padrão, ≤1 de
mercado) e simula 24 rodadas (sem trocas e com bots); refaz o sorteio se mais de 1 rodada tiver
tudo subindo ou tudo caindo, se menos de 2 empresas terminarem acima/abaixo do preço inicial ou se
algum preço passar de $4 mi.

## Defaults chosen
Limiares escalados pelo nº de jogadores; regras cruzadas no mesmo fechamento só olham empresas já
avaliadas (sem ciclos); os pontos do gráfico ocultos por um Segredo ficam como buraco para sempre (como no original);
nomes das empresas sorteados de 3 opções por setor; revelação palavra a palavra: a primeira é sempre uma pista (nunca conectivo, número ou nome de
empresa); conectivos e pistas se misturam; números, valores e nomes por último.
