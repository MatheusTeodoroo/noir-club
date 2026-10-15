import type { I18nText } from '@mp/game-sdk';

// Public catalogue shared by the logic and the UI: class names, guide text, ability shapes and
// the setup limits. Nothing here is secret — who holds which class lives only in the logic state.

export type Team = 'innocent' | 'impostor' | 'neutral';

/** What a Rastreador sees a player doing. */
export type ActionKind = 'attack' | 'protect' | 'investigate' | 'block' | 'mark' | 'nothing';

export interface AbilitySpec {
  when: 'night' | 'day' | 'vote';
  /** How many players the action picks. */
  targets: 1 | 2 | 3;
  kind: ActionKind;
  /** May pick themselves. */
  self?: boolean;
  /** Picks dead players instead of living ones. */
  dead?: boolean;
  /** Also guesses a class. */
  guess?: boolean;
  /** Labels for each pick, when the picks have different meanings. */
  labels?: I18nText[];
}

export interface RoleDef {
  team: Team;
  name: I18nText;
  /** One line for cards and lists. */
  short: I18nText;
  /** Full rules for the guide. */
  text: I18nText;
  ability: AbilitySpec | null;
  /** Uses per match of the class's limited power. */
  limit?: number;
  /** Always available to fill empty seats; not pickable as forced/banned. */
  common?: boolean;
}

const r = (def: RoleDef) => def;

export const ROLES = {
  // ---------------------------------------------------------------- Inocentes
  sheriff: r({
    team: 'innocent',
    name: { 'pt-BR': 'Xerife', en: 'Sheriff' },
    short: { 'pt-BR': 'Atira à noite. Se errar o alvo, morre junto.', en: 'Shoots at night. Shoot the wrong one and die too.' },
    text: {
      'pt-BR': 'Noite: atira em um jogador. Se o alvo for Inocente ou Neutro, o Xerife também morre. Se for Impostor, só o Impostor morre. Sem limite.',
      en: 'Night: shoot a player. If the target is Innocent or Neutral, the Sheriff dies too. If Impostor, only the Impostor dies. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'attack' },
  }),
  locksmith: r({
    team: 'innocent',
    name: { 'pt-BR': 'Chaveiro', en: 'Locksmith' },
    short: { 'pt-BR': 'Tranca um jogador: ele não age à noite e não sabe.', en: 'Locks a player: no action tonight, and they never know.' },
    text: {
      'pt-BR': 'Noite: tranca um jogador; ele não realiza nenhuma ação naquela noite e não sabe que foi trancado. Ainda pode sofrer ações. Sem limite.',
      en: 'Night: lock a player; they take no action that night and are not told. They can still be targeted. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'block' },
  }),
  tracker: r({
    team: 'innocent',
    name: { 'pt-BR': 'Rastreador', en: 'Tracker' },
    short: { 'pt-BR': 'Descobre que tipo de ação alguém fez.', en: 'Learns what kind of action someone took.' },
    text: {
      'pt-BR': 'Noite: escolhe um jogador e descobre o tipo de ação que ele fez (atacou, protegeu, investigou, bloqueou, marcou ou nada). Não revela o alvo. Sem limite.',
      en: 'Night: pick a player and learn the kind of action they took (attacked, protected, investigated, blocked, marked or nothing). Not the target. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'investigate' },
  }),
  protector: r({
    team: 'innocent',
    name: { 'pt-BR': 'Protetor', en: 'Protector' },
    short: { 'pt-BR': 'Protege alguém da morte por uma noite. 3 usos.', en: 'Shields someone from death for a night. 3 uses.' },
    text: {
      'pt-BR': 'Noite: protege um jogador (pode ser você) da morte naquela noite — ataques de Impostores, Xerife, Caçador e veneno. Não impede bloqueios. 3 usos por partida.',
      en: 'Night: shield a player (yourself included) from death that night — Impostor attacks, Sheriff, Bounty Hunter and poison. Does not stop blocks. 3 uses per match.',
    },
    ability: { when: 'night', targets: 1, kind: 'protect', self: true },
    limit: 3,
  }),
  investigator: r({
    team: 'innocent',
    name: { 'pt-BR': 'Investigador', en: 'Investigator' },
    short: { 'pt-BR': 'Compara dois jogadores: mesma filiação?', en: 'Compares two players: same side?' },
    text: {
      'pt-BR': 'Noite: escolhe 2 jogadores e recebe SIM (mesma filiação) ou NÃO (filiações diferentes). Não revela a filiação. Sem limite.',
      en: 'Night: pick 2 players and get YES (same side) or NO (different sides). The side itself stays hidden. Unlimited.',
    },
    ability: { when: 'night', targets: 2, kind: 'investigate' },
  }),
  coroner: r({
    team: 'innocent',
    name: { 'pt-BR': 'Médico Legista', en: 'Coroner' },
    short: { 'pt-BR': 'Examina um morto e descobre a filiação. 2 usos.', en: 'Examines a dead player to learn their side. 2 uses.' },
    text: {
      'pt-BR': 'Manhã: examina um jogador morto e descobre a filiação dele (não a classe). Só você vê o resultado. 2 usos por partida.',
      en: 'Morning: examine a dead player and learn their side (not their class). Only you see it. 2 uses per match.',
    },
    ability: { when: 'day', targets: 1, kind: 'investigate', dead: true },
    limit: 2,
  }),
  guard: r({
    team: 'innocent',
    name: { 'pt-BR': 'Guarda', en: 'Guard' },
    short: { 'pt-BR': 'Vigia alguém: quem atacar essa pessoa morre.', en: 'Watches someone: whoever attacks them dies.' },
    text: {
      'pt-BR': 'Noite: vigia um jogador. Se alguém tentar matá-lo naquela noite, o atacante morre; o alvo e o Guarda sobrevivem. Não funciona contra votação nem bloqueios. Sem limite.',
      en: 'Night: watch a player. Anyone who tries to kill them that night dies instead; target and Guard survive. Does nothing against votes or blocks. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'protect' },
  }),
  builder: r({
    team: 'innocent',
    name: { 'pt-BR': 'Construtor', en: 'Builder' },
    short: { 'pt-BR': 'Barrica alguém: ele não age e recebe aviso.', en: 'Barricades someone: no action, and they are told.' },
    text: {
      'pt-BR': 'Noite: constrói uma barricada em um jogador; ele não realiza nenhuma ação naquela noite e recebe um aviso no relatório. Pode sofrer ações. Sem limite.',
      en: 'Night: barricade a player; they take no action that night and see a notice in their report. They can still be targeted. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'block' },
  }),
  exorcist: r({
    team: 'innocent',
    name: { 'pt-BR': 'Exorcista', en: 'Exorcist' },
    short: { 'pt-BR': 'Na votação, exorciza alguém. Errar custa duas vidas.', en: 'During the vote, exorcise someone. A miss costs two lives.' },
    text: {
      'pt-BR': 'Tarde (durante a votação), uma vez por votação: exorciza um jogador. Se for Impostor, o Exorcista é revelado e a filiação do Impostor também; ambos sobrevivem. Se não for, os dois morrem sem revelar nada.',
      en: 'Afternoon (during the vote), once per vote: exorcise a player. If they are an Impostor, the Exorcist is revealed along with the Impostor\'s side; both live. If not, both die and nothing is revealed.',
    },
    ability: { when: 'vote', targets: 1, kind: 'attack' },
  }),
  orator: r({
    team: 'innocent',
    name: { 'pt-BR': 'Orador', en: 'Orator' },
    short: { 'pt-BR': 'Seu voto vale 2 ou 3.', en: 'Your vote counts 2 or 3 times.' },
    text: {
      'pt-BR': 'Passivo: seu voto conta como 2 ou 3 votos (o Host define na configuração), em todas as votações.',
      en: 'Passive: your vote counts as 2 or 3 votes (set by the Host), in every vote.',
    },
    ability: null,
  }),
  lawyer: r({
    team: 'innocent',
    name: { 'pt-BR': 'Advogado', en: 'Lawyer' },
    short: { 'pt-BR': 'Anula uma expulsão na apelação. 2 usos.', en: 'Overturns an expulsion on appeal. 2 uses.' },
    text: {
      'pt-BR': 'Apelação: depois que alguém é condenado na votação, pode anular a expulsão; o jogador continua vivo. A TV não diz quem anulou. 2 usos por partida.',
      en: 'Appeal: after someone is condemned by the vote, overturn it; they stay alive. The TV does not say who did it. 2 uses per match.',
    },
    ability: null,
    limit: 2,
  }),
  psychologist: r({
    team: 'innocent',
    name: { 'pt-BR': 'Psicólogo', en: 'Psychologist' },
    short: { 'pt-BR': 'De manhã sabe se foi alvo de algo letal.', en: 'Each dawn, learns if something deadly targeted them.' },
    text: {
      'pt-BR': 'Manhã Cedo: descobre se foi alvo de alguma ação letal na noite (sim/não). Não sabe quem tentou. Sem limite.',
      en: 'Early morning: learn whether anything deadly targeted you last night (yes/no). Not who. Unlimited.',
    },
    ability: null,
  }),
  curator: r({
    team: 'innocent',
    name: { 'pt-BR': 'Curador', en: 'Curator' },
    short: { 'pt-BR': 'Cura envenenados; senão, descobre a filiação.', en: 'Cures poison; otherwise learns the side.' },
    text: {
      'pt-BR': 'Noite: examina um jogador. Se estiver envenenado, cura (ele recebe aviso) e você descobre que há um Envenenador. Se não, você descobre a filiação dele. Sem limite.',
      en: 'Night: examine a player. If poisoned, you cure them (they are told) and learn there is a Poisoner. If not, you learn their side. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'investigate' },
  }),
  spokesperson: r({
    team: 'innocent',
    name: { 'pt-BR': 'Porta-voz', en: 'Spokesperson' },
    short: { 'pt-BR': 'Anuncia na TV um fato real da noite.', en: 'Announces a true fact from the night on the TV.' },
    text: {
      'pt-BR': 'Manhã Cedo: recebe até 3 acontecimentos reais da última noite e pode anunciar um na TV, anônimo ou assinando com seu nome — ou ficar calado. Anúncios nunca dizem quem agiu, no máximo quem sofreu. Sem limite.',
      en: 'Early morning: receive up to 3 true events from last night and announce one on the TV, anonymously or signed — or stay silent. Announcements never name who acted, at most who was affected. Unlimited.',
    },
    ability: null,
  }),
  historian: r({
    team: 'innocent',
    name: { 'pt-BR': 'Historiador', en: 'Historian' },
    short: { 'pt-BR': 'Guarda fatos da noite e revela no momento certo.', en: 'Stores night events and reveals them at the right time.' },
    text: {
      'pt-BR': 'Manhã Cedo: recebe 2 acontecimentos reais da noite e pode guardar 1 (no máximo 2 guardados; troque um se estiver cheio). Na Manhã ou na Tarde, pode revelar um guardado na TV. 2 revelações por partida.',
      en: 'Early morning: receive 2 true events from the night and may store 1 (2 stored at most; swap one out when full). In the Morning or Afternoon, reveal a stored one on the TV. 2 reveals per match.',
    },
    ability: null,
    limit: 2,
  }),
  sentinel: r({
    team: 'innocent',
    name: { 'pt-BR': 'Sentinela', en: 'Sentinel' },
    short: { 'pt-BR': 'Arma uma armadilha: o primeiro a agir vira Suspeito.', en: 'Sets a trap: the first to act on them becomes a Suspect.' },
    text: {
      'pt-BR': 'Noite: arma uma armadilha em um jogador. A primeira ação contra ele naquela noite é bloqueada, a armadilha se desfaz e o autor aparece na TV como "Suspeito". Sem limite.',
      en: 'Night: trap a player. The first action against them that night is blocked, the trap breaks and its author is shown on the TV as "Suspect". Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'protect' },
  }),
  cartographer: r({
    team: 'innocent',
    name: { 'pt-BR': 'Cartógrafo', en: 'Cartographer' },
    short: { 'pt-BR': 'Conta quantos agiram sobre alguém.', en: 'Counts how many acted on someone.' },
    text: {
      'pt-BR': 'Noite: escolhe um jogador e descobre quantas pessoas realizaram alguma ação sobre ele naquela noite. Sem limite.',
      en: 'Night: pick a player and learn how many people acted on them that night. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'investigate' },
  }),
  trickster: r({
    team: 'innocent',
    name: { 'pt-BR': 'Trapaceiro', en: 'Trickster' },
    short: { 'pt-BR': 'Desvia o próximo voto de alguém. 2 usos.', en: 'Diverts someone\'s next vote. 2 uses.' },
    text: {
      'pt-BR': 'Noite: escolhe um jogador; na próxima votação o voto dele vai para outro jogador vivo sorteado, sem que ele saiba. 2 usos por partida.',
      en: 'Night: pick a player; in the next vote their ballot goes to a random other living player, without them knowing. 2 uses per match.',
    },
    ability: { when: 'night', targets: 1, kind: 'mark' },
    limit: 2,
  }),
  innocent: r({
    team: 'innocent',
    name: { 'pt-BR': 'Inocente', en: 'Innocent' },
    short: { 'pt-BR': 'Sem poder: só sua voz e seu voto.', en: 'No power: just your voice and your vote.' },
    text: {
      'pt-BR': 'Sem habilidade. À noite você também toca em alguém (escolha falsa) para ninguém perceber quem age. Use a discussão e o voto.',
      en: 'No ability. At night you also tap someone (a decoy pick) so nobody can tell who acts. Use the debate and your vote.',
    },
    ability: null,
    common: true,
  }),
  telepath: r({
    team: 'innocent',
    name: { 'pt-BR': 'Telepata', en: 'Telepath' },
    short: { 'pt-BR': 'Liga-se a alguém: o que acontece com um, acontece com o outro.', en: 'Links to someone: what happens to one happens to the other.' },
    text: {
      'pt-BR': 'Noite: liga-se a outro jogador; os dois ficam sabendo. Daí em diante, morte (fora da votação), bloqueio e proteção de um valem para o outro. A expulsão não passa adiante. 1 ligação por partida.',
      en: 'Night: link to another player; both are told. From then on, death (outside the vote), blocks and protection on one apply to the other. Expulsion does not carry over. 1 link per match.',
    },
    ability: { when: 'night', targets: 1, kind: 'mark' },
    limit: 1,
  }),
  saboteur: r({
    team: 'innocent',
    name: { 'pt-BR': 'Sabotador Inocente', en: 'Innocent Saboteur' },
    short: { 'pt-BR': 'Sabota alguém: a ação dele não acontece e ele não sabe.', en: 'Sabotages someone: their action fails, unknown to them.' },
    text: {
      'pt-BR': 'Noite: escolhe um jogador; a ação dele naquela noite não acontece e ele não fica sabendo. Sem limite.',
      en: 'Night: pick a player; their action that night does not happen and they are not told. Unlimited.',
    },
    ability: { when: 'night', targets: 1, kind: 'block' },
  }),
  persistent: r({
    team: 'innocent',
    name: { 'pt-BR': 'Persistente', en: 'Persistent' },
    short: { 'pt-BR': 'Só morre com 2 ataques na mesma noite.', en: 'Only dies to 2 attacks in the same night.' },
    text: {
      'pt-BR': 'Passivo: precisa de 2 ataques na mesma noite para morrer. Um ataque só deixa uma marca que some ao amanhecer. Você não sabe quantas marcas teve.',
      en: 'Passive: needs 2 attacks in the same night to die. A single attack leaves a mark that fades at dawn. You never learn how many marks you had.',
    },
    ability: null,
  }),
  alchemist: r({
    team: 'innocent',
    name: { 'pt-BR': 'Alquimista Inocente', en: 'Innocent Alchemist' },
    short: { 'pt-BR': 'Prepara uma poção e a entrega para alguém usar.', en: 'Brews a potion and hands it to someone to use.' },
    text: {
      'pt-BR': '1ª noite em que age: prepara uma poção (Morte, Proteção ou Investigação). Numa noite seguinte: entrega a alguém (pode ser você), que recebe aviso. A partir da noite depois da entrega, quem recebeu pode usá-la uma vez: mata, protege ou descobre a filiação de um jogador. 1 poção por partida.',
      en: 'First night you act: brew a potion (Death, Protection or Insight). On a later night: hand it to someone (yourself included), who is told. From the night after, they may use it once: kill, protect, or learn a player\'s side. 1 potion per match.',
    },
    ability: { when: 'night', targets: 1, kind: 'mark', self: true },
    limit: 1,
  }),
  pacifistTracker: r({
    team: 'innocent',
    name: { 'pt-BR': 'Rastreador Pacifista', en: 'Pacifist Tracker' },
    short: { 'pt-BR': 'Rastreia ações, mas não pode votar num Inocente expulso.', en: 'Tracks actions, but must not vote out an Innocent.' },
    text: {
      'pt-BR': 'Noite: como o Rastreador, descobre o tipo de ação de um jogador. Pena: se votar num Inocente e ele for expulso nessa votação, você morre no fim da noite seguinte.',
      en: 'Night: like the Tracker, learn the kind of action a player took. Penalty: if you vote for an Innocent who gets expelled in that vote, you die at the end of the next night.',
    },
    ability: { when: 'night', targets: 1, kind: 'investigate' },
  }),

  // ---------------------------------------------------------------- Impostores
  impostor: r({
    team: 'impostor',
    name: { 'pt-BR': 'Impostor', en: 'Impostor' },
    short: { 'pt-BR': 'Mata à noite com o time.', en: 'Kills at night with the team.' },
    text: {
      'pt-BR': 'Conhece os outros Impostores. Toda noite participa do ataque (do time ou individual, conforme a configuração).',
      en: 'Knows the other Impostors. Every night joins the attack (team or individual, per the setup).',
    },
    ability: null,
    common: true,
  }),
  poisoner: r({
    team: 'impostor',
    name: { 'pt-BR': 'Envenenador', en: 'Poisoner' },
    short: { 'pt-BR': 'Envenena: a vítima morre na noite seguinte.', en: 'Poisons: the victim dies the next night.' },
    text: {
      'pt-BR': 'Noite: envenena um jogador. Ele morre no fim da noite seguinte, salvo se for curado (Curador) ou protegido nessa noite. A TV avisa que há um envenenado, sem dizer quem (o Porta-voz ou o Historiador ainda podem anunciar o nome).',
      en: 'Night: poison a player. They die at the end of the next night unless cured (Curator) or protected that night. The TV says someone is poisoned, not who (the Spokesperson or Historian may still announce the name).',
    },
    ability: { when: 'night', targets: 1, kind: 'attack' },
  }),
  sniper: r({
    team: 'impostor',
    name: { 'pt-BR': 'Sniper', en: 'Sniper' },
    short: { 'pt-BR': 'Na votação, adivinha uma classe e atira.', en: 'During the vote, guess a class and fire.' },
    text: {
      'pt-BR': 'Tarde (durante a votação), uma vez por votação: chuta a classe de um jogador. Acertou: ele morre na hora e a classe aparece na TV. Errou: o Sniper morre e é revelado.',
      en: 'Afternoon (during the vote), once per vote: guess a player\'s class. Right: they die on the spot and the class is shown. Wrong: the Sniper dies and is revealed.',
    },
    ability: { when: 'vote', targets: 1, kind: 'attack', guess: true },
  }),
  twin: r({
    team: 'impostor',
    name: { 'pt-BR': 'Gêmeo', en: 'Twin' },
    short: { 'pt-BR': 'Ligado a outro Impostor: vinga a morte dele.', en: 'Bound to another Impostor: avenges their death.' },
    text: {
      'pt-BR': 'Começa ligado a outro Impostor. Se um dos dois morrer, o outro ganha 1 ataque extra na noite seguinte. Se ambos morrerem juntos, nada acontece. Só aparece com 2+ Impostores.',
      en: 'Starts bound to another Impostor. If one dies, the other gets 1 extra kill the next night. If both die together, nothing happens. Only appears with 2+ Impostors.',
    },
    ability: null,
  }),
  tentacle: r({
    team: 'impostor',
    name: { 'pt-BR': 'Tentáculo', en: 'Tentacle' },
    short: { 'pt-BR': 'Enreda alguém: ele não age na noite seguinte.', en: 'Entangles someone: no action the next night.' },
    text: {
      'pt-BR': 'Noite: enreda um jogador; na noite seguinte ele não realiza nenhuma ação, e sabe disso. Pode votar normalmente e sofrer ações.',
      en: 'Night: entangle a player; the next night they take no action, and they know it. They still vote and can be targeted.',
    },
    ability: { when: 'night', targets: 1, kind: 'block' },
  }),
  shapeshifter: r({
    team: 'impostor',
    name: { 'pt-BR': 'Shapeshifter', en: 'Shapeshifter' },
    short: { 'pt-BR': 'Na votação, troca de lugar com alguém. 1 uso.', en: 'During the vote, trades places with someone. 1 use.' },
    text: {
      'pt-BR': 'Tarde (durante a votação), 1 vez por partida: imita um jogador vivo. Nessa votação, os votos recebidos por vocês dois são trocados, e o seu voto vale pelos dois (o voto do imitado não conta). Se o imitado for expulso, você é revelado na TV, mas não morre.',
      en: 'Afternoon (during the vote), once per match: imitate a living player. In that vote, the votes the two of you receive are swapped, and your ballot counts for both (the imitated player\'s ballot is void). If they are expelled, you are revealed on the TV but do not die.',
    },
    ability: { when: 'vote', targets: 1, kind: 'mark' },
    limit: 1,
  }),
  phantom: r({
    team: 'impostor',
    name: { 'pt-BR': 'Fantasmagórico', en: 'Phantom' },
    short: { 'pt-BR': 'Morto à noite, ainda age por mais uma noite.', en: 'Killed at night, still acts one more night.' },
    text: {
      'pt-BR': 'Passivo: se morrer por ação noturna, não morre na hora — continua jogando e morre no fim da noite seguinte, podendo agir nela. Expulso na votação, morre na hora.',
      en: 'Passive: killed by a night action, you do not die at once — you keep playing and die at the end of the next night, still acting in it. Expelled by vote, you die at once.',
    },
    ability: null,
  }),
  maestro: r({
    team: 'impostor',
    name: { 'pt-BR': 'Maestro', en: 'Maestro' },
    short: { 'pt-BR': 'Rege o próximo voto de alguém. 1 uso.', en: 'Conducts someone\'s next vote. 1 use.' },
    text: {
      'pt-BR': 'Noite: escolhe um não-Impostor e um alvo (não pode ser você). Na próxima votação, esse jogador vota automaticamente no alvo, sem saber. 1 uso por partida.',
      en: 'Night: pick a non-Impostor and a target (not yourself). In the next vote that player votes for the target automatically, without knowing. 1 use per match.',
    },
    ability: {
      when: 'night',
      targets: 2,
      kind: 'mark',
      labels: [
        { 'pt-BR': 'Quem será regido', en: 'Who is conducted' },
        { 'pt-BR': 'Votará em', en: 'Will vote for' },
      ],
    },
    limit: 1,
  }),

  // ---------------------------------------------------------------- Neutros
  journalist: r({
    team: 'neutral',
    name: { 'pt-BR': 'Jornalista', en: 'Journalist' },
    short: { 'pt-BR': 'Acerte 3 classes diferentes para vencer.', en: 'Guess 3 different classes right to win.' },
    text: {
      'pt-BR': 'Noite: chuta a classe de um jogador vivo. Acerto soma +1 (só classes diferentes contam). Vence ao chegar a 3 acertos — o jogo acaba na hora. Errar não tem pena.',
      en: 'Night: guess a living player\'s class. A hit scores +1 (only different classes count). Win on 3 hits — the game ends at once. Misses cost nothing.',
    },
    ability: { when: 'night', targets: 1, kind: 'investigate', guess: true },
  }),
  prophet: r({
    team: 'neutral',
    name: { 'pt-BR': 'Profeta', en: 'Prophet' },
    short: { 'pt-BR': 'Prevê uma morte. Acertou, vence; errou, morre.', en: 'Foretells a death. Right, you win; wrong, you die.' },
    text: {
      'pt-BR': 'Noite: prevê que um jogador vai morrer. Se ele morrer até o fim da noite seguinte (de qualquer forma), o Profeta vence e o jogo acaba. Se não, o Profeta morre. 1 previsão por partida.',
      en: 'Night: foretell that a player will die. If they die by the end of the next night (any way), the Prophet wins and the game ends. If not, the Prophet dies. 1 prophecy per match.',
    },
    ability: { when: 'night', targets: 1, kind: 'mark' },
    limit: 1,
  }),
  bountyHunter: r({
    team: 'neutral',
    name: { 'pt-BR': 'Caçador de Recompensas', en: 'Bounty Hunter' },
    short: { 'pt-BR': 'Conhece a classe de um Impostor. Um tiro.', en: 'Knows an Impostor\'s class. One shot.' },
    text: {
      'pt-BR': 'Começa sabendo a classe de um Impostor (não quem é). Noite: 1 tiro. Acertou quem tem essa classe e ele morreu: vence e o jogo acaba. Errou: o Caçador morre no lugar. Se o alvo morrer antes, recebe a classe de outro Impostor vivo.',
      en: 'Starts knowing one Impostor\'s class (not who). Night: 1 shot. Hit the holder of that class and they die: you win and the game ends. Miss: you die instead. If the target dies first, you get another living Impostor\'s class.',
    },
    ability: { when: 'night', targets: 1, kind: 'attack' },
    limit: 1,
  }),
  cultist: r({
    team: 'neutral',
    name: { 'pt-BR': 'Cultista', en: 'Cultist' },
    short: { 'pt-BR': 'Escolhe 3: se os 3 votarem em você, vence.', en: 'Pick 3: if all 3 vote for you, you win.' },
    text: {
      'pt-BR': 'Noite: escolhe 3 jogadores (eles não sabem). Se os 3 votarem em você na votação seguinte, você vence na hora e o jogo acaba. 2 tentativas por partida.',
      en: 'Night: pick 3 players (they are not told). If all 3 vote for you in the next vote, you win at once and the game ends. 2 attempts per match.',
    },
    ability: { when: 'night', targets: 3, kind: 'mark' },
    limit: 2,
  }),
  dramaAddict: r({
    team: 'neutral',
    name: { 'pt-BR': 'Viciado em Drama', en: 'Drama Addict' },
    short: { 'pt-BR': 'Vote em 4+ votações e morra fora delas.', en: 'Vote in 4+ votes, then die outside one.' },
    text: {
      'pt-BR': 'Vence se, depois de votar em 4 ou mais votações (inclusive "Pular"), morrer por uma ação (noite, Sniper, Exorcista) — o jogo acaba na hora. Se for expulso na votação, perde.',
      en: 'Wins if, after voting in 4 or more votes ("Skip" counts), they die to an action (night, Sniper, Exorcist) — the game ends at once. Expelled by vote: they lose.',
    },
    ability: null,
  }),
  thief: r({
    team: 'neutral',
    name: { 'pt-BR': 'Ladrão', en: 'Thief' },
    short: { 'pt-BR': 'Mata e rouba a classe e a filiação da vítima.', en: 'Kills and steals the victim\'s class and side.' },
    text: {
      'pt-BR': 'Noite: mata um jogador. Se ele morrer, você rouba a classe e a filiação dele, em segredo (ninguém do novo time fica sabendo). Passa a vencer pela nova filiação e usa a nova habilidade; se virar Impostor, tem o próprio ataque toda noite. Para quem chuta classes, você continua sendo "Ladrão".',
      en: 'Night: kill a player. If they die, you secretly steal their class and side (nobody on the new team is told). You now win with the new side and use the new ability; as an Impostor you get your own kill every night. To anyone guessing classes you are still "Thief".',
    },
    ability: { when: 'night', targets: 1, kind: 'attack' },
  }),
  nomad: r({
    team: 'neutral',
    name: { 'pt-BR': 'Nômade', en: 'Nomad' },
    short: { 'pt-BR': 'Troca de lugar: ações contra você vão para outro. Vivo no fim, vence.', en: 'Swaps places: actions on you go to someone else. Alive at the end, you win.' },
    text: {
      'pt-BR': 'Noite: troca de posição com outro jogador; na noite seguinte, toda ação dirigida a você vai para ele. Uma troca por noite. Vence junto com quem vencer se estiver vivo quando o jogo acabar (os Inocentes precisam eliminá-lo para vencer).',
      en: 'Night: swap places with another player; the next night, every action aimed at you lands on them. One swap per night. Wins alongside whoever wins if alive when the game ends (the Innocents must eliminate you to win).',
    },
    ability: { when: 'night', targets: 1, kind: 'mark' },
  }),
  parasite: r({
    team: 'neutral',
    name: { 'pt-BR': 'Parasita', en: 'Parasite' },
    short: { 'pt-BR': 'Rouba metade dos votos do hospedeiro. 5 votos, vence.', en: 'Steals half its host\'s votes. 5 votes, you win.' },
    text: {
      'pt-BR': 'Noite: escolhe 1 hospedeiro (uma vez por partida). Em cada votação, metade dos votos dele (para baixo) vai em silêncio para você. Ao acumular 5 votos roubados, estando vivo, vence e o jogo acaba. Se o hospedeiro for expulso naquela votação, os votos dela não contam para você.',
      en: 'Night: pick 1 host (once per match). In every vote, half its votes (rounded down) silently go to you. At 5 stolen votes, while alive, you win and the game ends. If the host is expelled in that vote, its votes do not count toward your total.',
    },
    ability: { when: 'night', targets: 1, kind: 'mark' },
    limit: 1,
  }),
} satisfies Record<string, RoleDef>;

export type RoleId = keyof typeof ROLES;
export const ROLE_IDS = Object.keys(ROLES) as RoleId[];
export const role = (id: RoleId): RoleDef => ROLES[id];
/** Classes the Host can force or ban (the commons fill whatever is left). */
export const PICKABLE = ROLE_IDS.filter((id) => !role(id).common);

export const TEAM_NAME: Record<Team, I18nText> = {
  innocent: { 'pt-BR': 'Inocente', en: 'Innocent' },
  impostor: { 'pt-BR': 'Impostor', en: 'Impostor' },
  neutral: { 'pt-BR': 'Neutro', en: 'Neutral' },
};

export const TEAM_PLURAL: Record<Team, I18nText> = {
  innocent: { 'pt-BR': 'Inocentes', en: 'Innocents' },
  impostor: { 'pt-BR': 'Impostores', en: 'Impostors' },
  neutral: { 'pt-BR': 'Neutros', en: 'Neutrals' },
};

// ---------------------------------------------------------------- Setup

export type RolePick = 'auto' | 'force' | 'ban';

export interface Setup {
  impostors: number;
  neutrals: number;
  picks: Partial<Record<RoleId, RolePick>>;
  killMode: 'team' | 'each';
  /** Only with killMode "each": a special Impostor kills OR uses the ability, or does both. */
  abilityMode: 'or' | 'and';
  spectator: 'blind' | 'omniscient';
  oratorVotes: 2 | 3;
  /** Show the class of every dead or expelled player. */
  revealDead: boolean;
  /** Phase lengths in seconds. */
  times: { dawn: number; day: number; vote: number; night: number };
}

export const TIME_LIMITS: Record<keyof Setup['times'], { min: number; max: number; step: number; default: number }> = {
  dawn: { min: 10, max: 60, step: 5, default: 20 },
  day: { min: 30, max: 600, step: 30, default: 180 },
  vote: { min: 20, max: 180, step: 10, default: 60 },
  night: { min: 20, max: 120, step: 5, default: 45 },
};

/** Suggested counts from the reference scale table. */
export function suggested(players: number): { impostors: number; neutrals: number } {
  if (players <= 7) return { impostors: 1, neutrals: 1 };
  if (players <= 10) return { impostors: 2, neutrals: 1 };
  if (players <= 13) return { impostors: 3, neutrals: 2 };
  return { impostors: 4, neutrals: 2 };
}

export type SetupError = 'tooManyImpostors' | 'noInnocents' | 'forcedImpostors' | 'forcedNeutrals' | 'forcedInnocents' | 'notEnoughNeutrals' | 'twinNeedsTwo';

/** Validates a setup for `players` seats; empty list = ready to start. */
export function setupErrors(s: Setup, players: number): SetupError[] {
  const errors: SetupError[] = [];
  const innocents = players - s.impostors - s.neutrals;
  if (innocents < 1) errors.push('noInnocents');
  else if (s.impostors >= innocents) errors.push('tooManyImpostors');
  const forced = (team: Team) => PICKABLE.filter((id) => role(id).team === team && s.picks[id] === 'force').length;
  const usable = (team: Team) => PICKABLE.filter((id) => role(id).team === team && s.picks[id] !== 'ban').length;
  if (forced('impostor') > s.impostors) errors.push('forcedImpostors');
  if (forced('neutral') > s.neutrals) errors.push('forcedNeutrals');
  if (innocents >= 1 && forced('innocent') > innocents) errors.push('forcedInnocents');
  if (usable('neutral') < s.neutrals) errors.push('notEnoughNeutrals');
  if (s.picks.twin === 'force' && s.impostors < 2) errors.push('twinNeedsTwo');
  return errors;
}

export const MAX_NEUTRALS = PICKABLE.filter((id) => role(id).team === 'neutral').length;

// ---------------------------------------------------------------- Events

/** Something that happened at night, as the Spokesperson / Historian may announce it. Never names the actor. */
export type EventKind =
  | 'attacked'
  | 'protected'
  | 'guarded'
  | 'investigated'
  | 'blocked'
  | 'poisoned'
  | 'cured'
  | 'trapped'
  | 'manipulated'
  | 'entangled';

export interface NightEvent {
  kind: EventKind;
  victim: string;
  night: number;
}

/** Fixed lengths (ms) of the short transition phases. */
export const FIXED = {
  reveal: 25_000,
  report: 10_000,
  verdict: 10_000,
  dusk: 6_000,
};

/** Alchemist potions. */
export type Potion = 'kill' | 'protect' | 'investigate';
export const POTIONS: Potion[] = ['kill', 'protect', 'investigate'];
