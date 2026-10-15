# Surto / Outbreak

## Pitch
Dois de vocês já estão infectados — e ninguém sabe quem. Encoste a mão nos outros para somar pontos
sem pegar o Surto, e desconfie de cada toque.

## Players
5–12. Abaixo de 5 a dedução acaba no primeiro toque; acima de 12 a lista de alvos no celular fica
longa demais. ~30 min com os padrões (3 rodadas × 8 min + intervalos).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Papel inicial (Zumbi Inicial / Humano) | só o jogador | Dealer (modo `dealer`) ou celular segure-para-ver (modo `phone`), só na fase de papéis | revelação final |
| Status atual (infectado ou não) | ninguém, nem o próprio jogador | nunca | revelação final |
| Resultado de um toque (ponto ou infecção) | ninguém | celular só diz "Toque registrado" | revelação final |
| Pontos de cada jogador | ninguém | nunca durante o jogo | revelação final |
| Uso de cura e se funcionou | quem tomou sabe que tomou; ninguém sabe se funcionou | celular: "Cura tomada" | revelação final |
| Doação de cura | doador e destinatário | celular do destinatário: "Bruno te deu uma cura" | revelação final |
| Nº de curas que o jogador tem | só o jogador | celular | nunca |
| Com quem cada um tocou | os dois do toque | TV mostra os 3 toques mais recentes (pares, sem resultado) | — (pares são públicos, resultados não) |
| Nº total de Zumbis e Humanos | todos | TV, na revelação de cada rodada | fim de cada rodada |

Recusas que poderiam vazar: nenhuma. A cura nunca diz se funcionou; o botão de cura funciona igual
para Zumbis Iniciais (consome sem efeito); pedidos de toque só são recusados por motivos públicos
(já tocou nessa rodada, o outro está ocupado).

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| `roles` | dealer: 30 s + 20 s/jogador; phone: 45 s | todos viram o papel | "Descubra seu papel", quem já viu | dealer: ir ao Dealer / phone: segurar para ver, "Entendi" | o papel do visitante, enorme |
| `round` | `roundMin` (8 min) | — | rodada x/y, cronômetro, 3 toques recentes, nº de toques | lista de alvos, pedidos, códigos, curas | — |
| `interval` | max(8 s, `intervalSec` 60 s) | — | nº de Zumbis e de Humanos | dar cura; "Olhe para a TV" | — |
| `final` | 25 s | — | linha do tempo: Zumbis Iniciais, infecções, curas, doações, pontos, cenário | "Olhe para a TV" | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'seen'}` | phone | `roles`, modo phone | marca papel visto |
| `{type:'touch', target}` | phone | `round`, sem pedido aberto dos dois, não tocaram nessa rodada, target ≠ self | cria pedido (expira 45 s) |
| `{type:'accept'}` / `{type:'decline'}` | phone (alvo) | pedido pendente para ele | gera um código de 2 dígitos para cada / cancela |
| `{type:'cancel'}` | phone | tem pedido aberto | cancela |
| `{type:'code', value}` | phone | pedido aceito, ainda não confirmou | se igual ao código do outro: confirma; senão +1 erro (3 erros cancela). Os dois confirmados → toque resolvido |
| `{type:'cure'}` | phone | `round`, curas ≥ 1 | consome 1; cura se infectado por toque nesta rodada há ≤ `cureWindowMin` e não é Zumbi Inicial |
| `{type:'give', target}` | phone | `round` ou `interval`, curas ≥ 1, target ≠ self | transfere 1 cura |

## Scoring and end
Toque: Z+Z nada; H+Z → H infectado; H+H +1 ponto cada. Fim de rodada: Humano sem nenhum toque vira
Zumbi (incurável). Depois da última rodada, ou se Humanos = 0 numa revelação → `final` → `ctx.end`.
- Humanos sobreviventes: seus pontos de toque; os de maior pontuação (empates inclusos) +3.
- Zumbis (iniciais e infectados): 0 pontos, sempre. Se todos viraram Zumbis, os Zumbis Iniciais
  vencem a partida (destaque na TV), mas sem pontos.
Sem Morte Súbita.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| rounds | number | 3 | 1–5 |
| roundMin | number | 8 | 2–30 |
| cureWindowMin | number | 3 | 1–10 |
| intervalSec | number | 60 | 0–180, step 15 |
| zombies | select | auto | auto (2; 1 com < 7 jogadores), 1, 2, 3 |
| roleReveal | select | dealer | dealer, phone |

## Dealer
Usado só no modo `dealer`, só na fase `roles`: cada jogador visita uma vez e vê o próprio papel.
Fecha ao fim da fase. Remotos veem no celular.

## Disconnects
`onPlayerTimeout`: pedidos abertos do jogador são cancelados; na fase `roles` conta como visto. Ele
continua no jogo e pode virar Zumbi por não tocar.

## Remote players
Papel no próprio celular (Dealer remoto). Toque com remoto exige trocar o código por voz/vídeo.

## Edge cases
- Pedido aberto quando a rodada acaba: cancelado.
- Zumbi infectado nesta rodada toca outro Humano antes de se curar: o outro continua infectado.
- Cura tomada por quem não estava infectado, por Zumbi Inicial, ou fora da janela: consumida sem efeito.
- Infecção da rodada anterior não é curável.
- Ninguém sobrevive: cenário Zumbis. Um só sobrevivente: ele é o maior (+3).
- Mínimo 5: 1 Zumbi Inicial no auto. Máximo 12: 2.

## Defaults chosen
- Pedido expira em 45 s; 3 códigos errados cancelam; códigos de 2 dígitos (10–99), diferentes no par.
- Tempo da fase de papéis (dealer 30 s + 20 s/jogador; phone 45 s); final 25 s; revelação mínima 8 s.
- Um jogador só tem 1 pedido aberto (enviado ou recebido) por vez.
- Celular nunca mostra papel depois da fase `roles`, nem para Zumbis Iniciais.
