import type { I18nText } from '@mp/game-sdk';

// Every visible string of the UI. Rules text is translated / condensed from the Agent Decker
// rulebook by Manuel Correia (CC BY-NC 4.0); {tokens} become the original icons.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export const L = {
  // credits
  creditsTitle: tx('Créditos', 'Credits'),
  credit1: tx(
    'Jogo original criado por Manuel Correia: gamesbymanuel.com.',
    'Original game created by Manuel Correia: gamesbymanuel.com.',
  ),
  credit2: tx(
    'O jogo original está licenciado sob a Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).',
    'The original game is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).',
  ),
  credit3: tx(
    'Esta versão digital foi desenvolvida independentemente. As alterações realizadas incluem a implementação digital das mecânicas e a adaptação da interface para a plataforma.',
    'This digital version was developed independently. The changes include the digital implementation of the mechanics and the adaptation of the interface to the platform.',
  ),
  credit4: tx(
    'Esta adaptação não é uma versão oficial e não implica endosso do criador original.',
    'This adaptation is not an official version and does not imply endorsement by the original creator.',
  ),
  footer: tx(
    'Jogo original de Manuel Correia · gamesbymanuel.com · CC BY-NC 4.0 · adaptação não oficial',
    'Original game by Manuel Correia · gamesbymanuel.com · CC BY-NC 4.0 · unofficial adaptation',
  ),
  byline: tx('Jogo solo de construção de baralho de Manuel Correia', 'Solo deckbuilding game by Manuel Correia'),

  // board
  mission: tx('Missão', 'Mission'),
  goal: tx('Objetivo', 'Goal'),
  goalWord: tx('OBJETIVO', 'GOAL'),
  goalMet: tx('Objetivo cumprido — termine o turno!', 'Goal met — end the turn!'),
  alarm: tx('Alarme', 'Alarm'),
  turn: tx('Turno', 'Turn'),
  theLine: tx('A Linha', 'The Line'),
  obDeck: tx('Obstáculos', 'Obstacles'),
  obDiscard: tx('Descarte', 'Discard'),
  deck: tx('Baralho', 'Deck'),
  discard: tx('Descarte', 'Discard'),
  playArea: tx('Área de Jogo', 'Play Area'),
  hand: tx('Mão', 'Hand'),
  equipArea: tx('Equipamento', 'Equip Area'),
  pool: tx('Recursos', 'Resources'),
  stealth: tx('Furtividade', 'Stealth'),
  fight: tx('Luta', 'Fighting'),
  interactions: tx('Interações', 'Interactions'),
  removed: tx('fora do jogo', 'out of the game'),
  empty: tx('vazio', 'empty'),
  saved: tx('guardada', 'saved'),
  choosing: tx('O agente está escolhendo…', 'The agent is choosing…'),
  in: tx('em', 'in'),

  // hints
  hintPlay: tx(
    'Jogue cartas da mão no celular para ganhar recursos: {stealth} Furtividade e {fight} Luta.',
    'Play cards from your hand on the phone to get resources: {stealth} Stealth and {fight} Fighting.',
  ),
  hintInteract: tx(
    'Você pode pagar um obstáculo: toque nele no celular e escolha Desarmar ou Nocautear.',
    'You can pay for an obstacle: tap it on the phone and choose Disarm or Knock Out.',
  ),
  hintGoal: tx(
    'Você já cumpre o objetivo da missão! Termine o turno para completá-la.',
    'You already meet the mission goal! End the turn to complete it.',
  ),
  hintEnd: tx(
    'Nada mais a fazer? Termine o turno: a carta mais à direita sai da linha e soma alarme.',
    'Nothing else to do? End the turn: the rightmost card leaves the line and raises the alarm.',
  ),

  // log
  logLeave: tx('saiu da linha', 'left the line'),
  logLeaveDown: tx('saiu nocauteado, sem alarme', 'left knocked out, no alarm'),
  logSiren: tx('Sirene! A linha inteira foi descartada', 'Siren! The whole line was discarded'),
  logFlip: tx('O Inspetor desvirou', 'The Inspector flipped'),
  logDisarm: tx('Desarmou', 'Disarmed'),
  logKnock: tx('Nocauteou', 'Knocked out'),
  logEquip: tx('Equipou', 'Equipped'),
  logItem: tx('Usou', 'Used'),
  logObShuffle: tx('Obstáculos reembaralhados', 'Obstacles reshuffled'),
  logDeckShuffle: tx('Descarte embaralhado no baralho', 'Discard shuffled into the deck'),

  // intro / mission / over
  start: tx('Começar', 'Start'),
  next: tx('Próximo', 'Next'),
  prev: tx('Anterior', 'Previous'),
  skip: tx('Pular tutorial', 'Skip tutorial'),
  introPhone: tx('Acompanhe na TV. Você controla os slides daqui.', 'Follow on the TV. You control the slides from here.'),
  briefing: tx('Sua primeira missão', 'Your first mission'),
  briefingSub: tx(
    'Você é um agente secreto recém-saído da escola de espionagem. Seu objetivo é localizar e resgatar um refém — mas antes precisa de equipamento e de se misturar.',
    "You're a secret agent who's just left spy school. Your goal is to locate and rescue a hostage, but first you need to get gear and blend in.",
  ),
  missionComplete: tx('Missão cumprida', 'Mission complete'),
  reward: tx('Recompensa', 'Reward'),
  nextMission: tx('Próxima missão', 'Next mission'),
  alarmAt: tx('Alarme ao concluir', 'Alarm when completed'),
  continue: tx('Continuar', 'Continue'),
  won: tx('Fuga limpa!', 'Clean getaway!'),
  wonSub: tx('Campanha concluída. Missão cumprida, agente.', 'Campaign complete. Mission accomplished, agent.'),
  lostAlarm: tx('Alarme disparado', 'Alarm raised'),
  lostAlarmSub: tx('O alarme chegou a 50: os guardas vieram atrás de você.', 'The alarm reached 50: the guards went after you.'),
  lostTime: tx('Sem tempo', 'Out of time'),
  lostTimeSub: tx('Não há obstáculos suficientes para completar a linha.', "There aren't enough obstacles to fill the line."),
  lostLeft: tx('Agente desconectado', 'Agent disconnected'),
  lostLeftSub: tx('A missão foi abortada.', 'The mission was aborted.'),
  results: tx('Alarme por missão', 'Alarm per mission'),
  totalAlarm: tx('Alarme total (recorde do original: quanto menor, melhor)', 'Total alarm (the original high score: lower is better)'),
  points: tx('Pontos (50 − alarme por missão)', 'Points (50 − alarm per mission)'),
  seeScore: tx('Ver placar', 'See scoreboard'),

  // phone
  yourTurn: tx('Seu turno', 'Your turn'),
  endTurn: tx('Fim do turno', 'End turn'),
  undo: tx('Desfazer', 'Undo'),
  rules: tx('Regras', 'Rules'),
  showOnTv: tx('Mostrar na TV', 'Show on TV'),
  hideFromTv: tx('Tirar da TV', 'Hide from TV'),
  close: tx('Fechar', 'Close'),
  play: tx('Jogar', 'Play'),
  equip: tx('Equipar', 'Equip'),
  rockFight: tx('+1 {fight}', '+1 {fight}'),
  rockDraw: tx('Comprar carta', 'Draw a card'),
  tapToPlay: tx('Toque numa carta da mão para jogá-la', 'Tap a card in your hand to play it'),
  tapLine: tx('Toque num obstáculo para interagir', 'Tap an obstacle to interact'),
  disarm: tx('Desarmar', 'Disarm'),
  disarmEquip: tx('Desarmar e equipar', 'Disarm and equip'),
  knock: tx('Nocautear', 'Knock out'),
  knockLeft: tx('Nocautear o vizinho à esquerda', 'Knock out the left neighbour'),
  knockRight: tx('Nocautear o vizinho à direita', 'Knock out the right neighbour'),
  payWith: tx('Pagar com', 'Pay with'),
  resources: tx('Recursos', 'Resources'),
  split: tx('Divisão do custo', 'Cost split'),
  disarmHelp: tx('Desarmar: a carta vai para sua Área de Jogo e entra no seu baralho.', 'Disarm: the card goes to your Play Area and joins your deck.'),
  knockHelp: tx('Nocautear: fica virada na linha e não soma alarme ao sair.', "Knock out: it stays face down in the line and won't raise the alarm when it leaves."),
  blockedHawk: tx(
    'Falcão na linha: não dá para interagir com cartas de custo só {stealth}.',
    "Hawk in the line: you can't interact with cards that cost only {stealth}.",
  ),
  blockedSniper: tx('Franco-atirador: só quando for o único {person} na linha.', "Sniper: only when it's the only {person} in the line."),
  blockedLimit: tx('Limite de interações deste turno atingido.', 'No interactions left this turn.'),
  blockedCost: tx('Recursos insuficientes. Jogue mais cartas.', 'Not enough resources. Play more cards.'),
  knockedOut: tx('Nocauteado: tipo e efeito ignorados, sai sem alarme.', 'Knocked out: type and effect ignored, leaves without alarm.'),
  confirm: tx('Confirmar', 'Confirm'),
  none: tx('Nenhuma', 'None'),
  missionPhone: tx('Missão cumprida! Veja a recompensa na TV.', 'Mission complete! See the reward on the TV.'),
  overPhone: tx('Veja o resultado na TV.', 'See the result on the TV.'),
  watchTv: tx('Olhe para a TV!', 'Look at the TV!'),
  pendingBin: tx('Lixeira: escolha cartas da mão para remover do jogo.', 'Bin: pick cards from your hand to remove from the game.'),
  pendingMisdirect: tx('Despistar: escolha cartas da mão (+2 {stealth} cada).', 'Misdirect: pick cards from your hand (+2 {stealth} each).'),
  pendingBurn: tx('Queimar: escolha até 2 cartas do descarte para remover do jogo.', 'Burn: pick up to 2 cards from your discard to remove from the game.'),
  pendingRecall: tx('Recuperar: escolha 1 carta do descarte para a mão.', 'Recall: pick 1 card from your discard to your hand.'),
  pendingSave: tx('Poupar Balas: escolha 1 carta da mão para guardar para o próximo turno.', 'Save Bullets: pick 1 card from your hand to keep for next turn.'),
  pendingJust: tx('Na Medida Certa: escolha 1 carta do baralho para ir ao topo.', 'Just the Thing: pick 1 card of your deck to go on top.'),
  pendingDistraction: tx('Distração: escolha um obstáculo para puxar ao início da linha.', 'Distraction: pick an obstacle to pull back to the start of the line.'),
  pendingPlan: tx(
    'Planejar: toque na carta que fica com você; depois nas outras, na ordem em que voltam ao topo (1ª = topo).',
    'Plan Ahead: tap the card you keep; then the others, in the order they go back on top (1st = top).',
  ),
  pendingForesight: tx('Antevisão: toque nas cartas na ordem em que voltam ao topo (1ª = topo).', 'Foresight: tap the cards in the order they go back on top (1st = top).'),
  keepLabel: tx('fica', 'keep'),
  reset: tx('Recomeçar escolha', 'Reset choice'),
  interLeft: tx('interações restantes', 'interactions left'),
} satisfies Record<string, I18nText>;

/** "How to play" slides between the credits and the mission briefing. */
export const SLIDES: { title: I18nText; body: I18nText[]; demo: 'overview' | 'anatomy' | 'interact' | 'turn' }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'overview',
    body: [
      tx(
        'Você é um agente secreto. A Linha mostra o que você vê ao andar pelo complexo inimigo — e eles também veem você.',
        "You're a secret agent. The Line is what you see as you walk through the enemy complex — and they see you too.",
      ),
      tx(
        'Lide com os obstáculos antes que saiam da linha: cada um que sai virado para cima aumenta o alarme. Se o alarme chegar a 50, fim de jogo.',
        'Deal with obstacles before they leave the line: each one that leaves face up raises the alarm. If the alarm reaches 50, game over.',
      ),
      tx('Complete as missões melhorando seu baralho com novas armas e habilidades.', 'Complete the missions by improving your deck with new weapons and skills.'),
    ],
  },
  {
    title: tx('As cartas', 'The cards'),
    demo: 'anatomy',
    body: [
      tx(
        'Suas cartas dão recursos: {stealth} Furtividade e {fight} Luta.',
        'Your cards give you resources: {stealth} Stealth and {fight} Fighting.',
      ),
      tx(
        'Obstáculos têm duas partes: embaixo, o obstáculo, com seu custo ({stealth}, {fight} ou {any} qualquer combinação) e o alarme {alarm} que soma se sair da linha. Em cima, o que você ganha se o desarmar.',
        'Obstacles have two halves: below, the obstacle with its cost ({stealth}, {fight} or {any} any combination) and the alarm {alarm} it raises if it leaves the line. Above, what you get if you disarm it.',
      ),
      tx(
        'Cartas com {keep} são itens: ao desarmar, você pode equipá-los na Área de Equipamento.',
        'Cards with {keep} are items: when you disarm them you may equip them in the Equip Area.',
      ),
    ],
  },
  {
    title: tx('Interagir', 'Interacting'),
    demo: 'interact',
    body: [
      tx(
        'Pague o custo de um obstáculo com seus recursos e escolha:',
        'Pay an obstacle’s cost with your resources and choose:',
      ),
      tx(
        '**Desarmar**: a carta sai da linha e vai para sua Área de Jogo — ela passa a fazer parte do seu baralho.',
        '**Disarm**: the card leaves the line and goes to your Play Area — it becomes part of your deck.',
      ),
      tx(
        '**Nocautear**: a carta fica virada para baixo na linha. Ela não soma alarme quando sair, ganhando tempo.',
        '**Knock out**: the card stays face down in the line. It won’t raise the alarm when it leaves, buying you time.',
      ),
      tx('No começo, só uma interação por turno.', 'At first, only one interaction per turn.'),
    ],
  },
  {
    title: tx('O turno', 'The turn'),
    demo: 'turn',
    body: [
      tx('**1 · Usar cartas**: jogue cartas da mão e interaja com obstáculos.', '**1 · Use cards**: play cards from your hand and interact with obstacles.'),
      tx('**2 · Checar missão**: se você cumpre o objetivo, a missão está completa.', '**2 · Mission check**: if you meet the goal, the mission is complete.'),
      tx(
        '**3 · Rolagem da Linha**: a última carta à direita sai (soma alarme se estiver virada para cima) e as outras deslizam para a direita.',
        '**3 · Line scroll**: the last card on the right leaves (raising the alarm if face up) and the others slide right.',
      ),
      tx(
        '**4 · Renovar**: novos obstáculos entram pela esquerda; mão e Área de Jogo vão para o descarte; compre 4 cartas.',
        '**4 · Card refresh**: new obstacles come in from the left; your hand and Play Area go to the discard; draw 4 cards.',
      ),
    ],
  },
];

/** The rules reader, on the phone and on the TV on request. RULE_PAGES in shared.ts must match. */
export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Agent Decker é um jogo solo de construção de baralho. Você é um agente secreto recém-saído da escola de espionagem; sua missão é localizar e resgatar um refém, mas antes precisa de equipamento e de se misturar.',
        "Agent Decker is a solo deckbuilding game. You're a secret agent who's just left spy school; your goal is to locate and rescue a hostage, but first you need to get gear and blend in.",
      ),
      tx(
        'O objetivo é completar a sequência de 5 missões sem alertar o complexo inimigo, melhorando seu baralho com novas armas e habilidades e removendo cartas desnecessárias.',
        'The goal is to complete a sequence of 5 missions without alerting the enemy complex, improving your deck with new weapons and skills while removing unnecessary cards.',
      ),
      tx(
        'Componentes: 1 carta de Alarme, 8 cartas iniciais, 22 cartas no baralho de Obstáculos e 23 no baralho de Missões.',
        'Components: 1 Alarm card, 8 starting cards, 22 cards in the Obstacle deck and 23 in the Mission deck.',
      ),
    ],
  },
  {
    title: tx('Tipos de carta', 'Types of cards'),
    body: [
      tx(
        '**Alarme**: ao andar pelo complexo você levanta suspeitas. Se o alarme chegar ao topo (50), os guardas vão atrás de você. Fim de jogo.',
        '**Alarm**: as you move around the complex you raise suspicion. If it reaches the top (50) the guards go after you. Game over.',
      ),
      tx('**Iniciais**: dão recursos — {stealth} Furtividade e {fight} Luta — para interagir com obstáculos.', '**Starting cards**: give resources — {stealth} Stealth and {fight} Fighting — to interact with obstacles.'),
      tx(
        '**Obstáculos**: a metade de baixo é o obstáculo (nome, tipo, custo e quanto o alarme sobe se a carta sair da linha); a de cima é o que você ganha ao desarmá-lo.',
        "**Obstacles**: the bottom half is the obstacle (name, type, cost and how much the alarm goes up if it leaves the line); the top half is what you get if you disarm it.",
      ),
      tx(
        '**Itens** ({keep}): ao desarmar, podem ser equipados. Alguns dão bônus todo turno; outros são descartados por um efeito — e podem ser equipados de novo quando voltarem à mão.',
        "**Items** ({keep}): when disarmed they may be equipped. Some give a bonus every turn; others are discarded for an effect — and can be equipped again when drawn.",
      ),
      tx(
        '**Missões**: Objetivos de missão (com uma recompensa) e Obstáculos de missão, que funcionam como obstáculos comuns.',
        '**Missions**: Mission Goals (with a reward) and Mission Obstacles, which work just like regular obstacles.',
      ),
    ],
  },
  {
    title: tx('Interagir', 'Interacting'),
    body: [
      tx(
        'Você pode interagir com qualquer obstáculo da linha pagando o custo indicado: {stealth}, {fight} ou {any} qualquer combinação dos dois.',
        'You can interact with any obstacle in the line by paying the cost on the card: {stealth}, {fight} or {any} any combination of the two.',
      ),
      tx(
        'Seja qual for o recurso, você escolhe **desarmar** (a carta vai para sua Área de Jogo — boa forma de conseguir equipamento) ou **nocautear** (vira para baixo e fica no lugar; não sobe o alarme na rolagem). Carta nocauteada tem tipo e efeito ignorados.',
        'Whichever resource you used, you choose to **disarm** (the card goes to your Play Area — a good way to get gear) or **knock out** (turn it face down where it is; it won’t raise the alarm in the Line Scroll). A knocked-out card ignores its type and effect.',
      ),
      tx(
        'Alguns obstáculos têm efeitos que deslizam cartas e reorganizam a linha — leia-os quando aparecerem.',
        'Some obstacles have effects that slide cards and rearrange the line — read them as they appear.',
      ),
      tx('No começo só é possível interagir com um obstáculo por turno.', 'Initially you can only interact with one obstacle per turn.'),
    ],
  },
  {
    title: tx('1 · Usar cartas  2 · Checar missão', '1 · Use cards  2 · Mission check'),
    body: [
      tx(
        'Use as cartas da mão para lidar com os obstáculos. Não guarde cartas: as que sobrarem são descartadas na Renovação. Cartas usadas vão para a Área de Jogo.',
        "Use the cards in your hand to deal with the obstacles. Don't save cards: leftovers are discarded in the Card Refresh. Used cards go to the Play Area.",
      ),
      tx(
        'Quando atingir o limite de interações ou não quiser fazer mais nada, termine o turno.',
        "When you've reached your interaction limit or don't want to do anything else, end the turn.",
      ),
      tx(
        'Checagem de missão: se você cumpre o objetivo (pagando com recursos que sobraram), a missão está completa.',
        'Mission check: if you can fulfil the goal (paying with leftover resources), the mission is complete.',
      ),
    ],
  },
  {
    title: tx('3 · Rolagem da Linha', '3 · Line Scroll'),
    body: [
      tx(
        'Pense numa esteira: as cartas saem pela direita e novas entram pela esquerda.',
        'Think of it as a conveyor belt: cards leave through the right side and new ones refill it from the left.',
      ),
      tx(
        'A última carta da linha vai para o descarte de obstáculos e o alarme sobe pelo valor dela {alarm} (cartas nocauteadas não sobem o alarme).',
        'The last card in the line goes to the obstacles discard and the alarm goes up by its value {alarm} (knocked-out cards don’t raise it).',
      ),
      tx('Todas as cartas da linha deslizam para a direita.', 'All the cards in the line scroll to the right.'),
    ],
  },
  {
    title: tx('4 · Renovação', '4 · Card Refresh'),
    body: [
      tx(
        'Compre novos obstáculos e coloque-os à esquerda dos atuais até haver seis na linha, ativando os efeitos ao colocá-los.',
        'Draw new obstacles and place them to the left of the current ones until there are six, activating their effects as you place them.',
      ),
      tx(
        'Se um baralho acabar, embaralhe o descarte correspondente para formar um novo. Se não houver obstáculos suficientes para completar a linha, o tempo acabou: fim de jogo.',
        "If a deck runs out, shuffle its discard to form a new one. If there aren't enough obstacles to fill the line, you ran out of time: game over.",
      ),
      tx(
        'Coloque a mão e a Área de Jogo no seu descarte e compre quatro cartas.',
        'Place your hand and Play Area in your discard and draw four new cards.',
      ),
    ],
  },
  {
    title: tx('Progressão de missões', 'Mission progression'),
    body: [
      tx(
        '**Recompensa**: a parte de cima do objetivo vai para o Equipamento — recursos permanentes (uma vez por turno) ou novas regras.',
        '**Reward**: the top half of the goal goes to the Equip Area — permanent resources (once a turn) or new rules.',
      ),
      tx(
        '**Avançar**: os obstáculos da próxima missão entram no descarte de obstáculos, que é embaralhado com a linha e o baralho de obstáculos. Uma nova linha de seis é formada.',
        "**Move forward**: the next mission's obstacles join the obstacles discard, which is shuffled with the line and the obstacles deck. A new line of six is drawn.",
      ),
      tx(
        '**Recomeço**: o alarme volta a zero; Área de Jogo, descarte e baralho são embaralhados juntos (itens equipados e novas regras ficam). Compre a nova mão.',
        '**Reset**: the alarm goes back to zero; Play Area, discard and deck are shuffled together (equipped items and new rules stay). Draw your new hand.',
      ),
    ],
  },
  {
    title: tx('Pontuação e créditos', 'Score and credits'),
    body: [
      tx(
        'Recorde do original: some o alarme com que terminou cada missão — quanto menor, melhor. Na plataforma, cada missão vale 50 − alarme.',
        'The original high score: add up the alarm you finished each mission with — lower is better. On the platform each mission scores 50 − alarm.',
      ),
      tx(
        'Jogo original criado por Manuel Correia: gamesbymanuel.com. Licenciado sob CC BY-NC 4.0. Esta versão digital foi desenvolvida independentemente e não é oficial.',
        'Original game created by Manuel Correia: gamesbymanuel.com. Licensed under CC BY-NC 4.0. This digital version was developed independently and is not official.',
      ),
    ],
  },
];
