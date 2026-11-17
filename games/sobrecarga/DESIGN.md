# Sobrecarga / Overload

## Pitch
Três pilhas de fichas, um limite: 13. Escolha em segredo o valor e a cor da sua ficha — quem fizer
a pilha desabar leva todas as fichas para casa como penalidade.

## Players
2–16. Com 2 as pilhas enchem devagar (partida tática); com 16 desabam quase todo turno (caos).
~25 min com 14 rodadas e 6 jogadores (o Host escolhe 7, 14, 21, 28 ou 35 rodadas).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| carta (0–6) e cor enviadas na rodada | só o dono | playerView (`mySub`) | fase `reveal` da rodada |
| cartas e cores que restam na mão | só o dono | playerView (`hand`) | nunca diretamente; com `showSpent` a TV mostra o que já foi gasto (dedutível) |
| quem foi sorteado/automático | todos (após revelar) | publicView `plays[id].auto` | `reveal` |

Feedback que pode vazar: nenhum — recusas só acontecem por regras públicas (não é sua vez, já passou).

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | `intro` 5 min (safety) | Host avança/pula | slide do tutorial + demo | Host: Voltar/Próximo/Pular | — |
| submit | `submitSeconds`, 60 s | todos os conectados enviaram | pilhas, quem já enviou, contagem | escolhe carta + cor, Enviar (pode trocar) | — |
| reveal | 7 s fixo | — | cores, depois cartas (drumroll), ordem de jogada | "Olhe a TV" + sua posição | — |
| place | `turnSeconds` por vez, 15 s | — (cada vez termina na ação) | ordem, vez atual, pilha recebendo a ficha, desabamento | na sua vez: Empilhar / Passar; arco-íris escolhe a pilha | — |
| roundEnd | 6 s (8 s na última) | — | penalidades da rodada, novo marcador, aviso de mão nova | resumo | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'submit', card, color}` | phone | `submit`, carta e cor na mão | grava/troca o envio |
| `{type:'place', stack?}` | phone | `place`, é a sua vez; `stack` obrigatório só com arco-íris | empilha; se a soma ≥ 13 recolhe as fichas anteriores como penalidade |
| `{type:'pass'}` | phone | `place`, é a sua vez, ainda não passou nesta rodada | vai para o fim; passes resolvem em ordem reversa |
| `{type:'intro', dir}` / `{type:'tvRules', page}` | Host | intro / sempre | tutorial e regras na TV |

Ordem: arco-íris primeiro (carta maior antes), depois carta maior → menor; empate: marcador, depois
sentido horário (ordem do lobby) a partir dele.

## Scoring and end
Penalidade = nº de fichas recolhidas (a ficha que estourou fica; ficha 0 também conta). Ranking:
menos penalidades; empate → fica atrás quem foi penalizado por último. `ctx.end` com pontos por
colocação: N−1 para o 1º … 0 para o último (empates exatos — ninguém penalizado — dividem a posição).
Fim após a rodada `rounds`.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| rounds | number | 14 | 7–35, passo 7 |
| submitSeconds | number | 60 | 30–180, passo 15 |
| turnSeconds | number | 15 | 10–30, passo 5 |
| showSpent | boolean | true | TV mostra cartas e cores gastas |

## Dealer
Não usado.

## Disconnects
`onPlayerTimeout` marca o jogador como automático enquanto estiver fora: no envio recebe carta e
cor sorteadas; na vez dele empilha sozinho em 1,5 s (arco-íris → pilha mais baixa), nunca passa.
Se voltar, joga normalmente de novo. Host fora durante o tutorial → a partida começa.

## Tutorial and rules
Slides: 1 Como jogar (objetivo + créditos; demo: três pilhas), 2 Suas fichas (cartas 0–6 e cores;
demo: mão), 3 A ordem (arco-íris, maior carta, marcador; demo: fila ordenada), 4 Empilhar ou passar
(demo: passes no fim da fila), 5 Desabou! (demo: pilha 9+5 → penalidade 2).
Regras: Visão geral → Peças → Envio → Ordem de jogada → Empilhar e passar → Desabamento e marcador
→ Mãos novas e fim → Situações especiais → Pontuação → Créditos.

## Credits
Inspirado no jogo "Peso 13" do reality "O Jogo do Diabo" (The Devil's Plan, Netflix), temporada 3,
episódio 2. Nome, textos e arte próprios; versão não oficial. Ver CREDITS.md.

## Remote players
Nada muda.

## Edge cases
- Vários arco-íris: carta maior antes, depois marcador/horário.
- Todos passam: o primeiro a passar é o último a empilhar; quem já passou não passa de novo.
- Ninguém penalizado na rodada: marcador gira no sentido horário.
- 2 jogadores: funciona igual. 16: TV em duas fileiras compactas.
- Ninguém envia: tudo sorteado.

## Defaults chosen
- Primeiro marcador sorteado.
- Ficha 0 conta como 1 ficha na penalidade.
- Auto-empilhar do arco-íris vai para a pilha de menor soma (empate: vermelha, verde, azul).
- Pausa de 1,4 s entre vezes (3,2 s após um desabamento) para a TV animar.
