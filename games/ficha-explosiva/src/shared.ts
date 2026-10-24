import type { I18nText } from '@mp/game-sdk';

// Public catalog shared by the logic and the UI: card names, goals, teams, the deck units the Host
// toggles, the presets and the hostage table. Nothing here is a secret of a match.

export type Team = 'ouro' | 'carmim' | 'prata' | 'verde';
export type Room = 'A' | 'B';
export type Group = 'base' | 'reservas' | 'salas' | 'compartilhar' | 'lideranca' | 'atuacao' | 'condicoes' | 'caos';

export const CHARS = [
  'chefao', 'assassino', 'soldadoOuro', 'soldadoCarmim', 'apostador',
  'herdeiro', 'bracoDireito', 'investigador', 'atirador', 'alvo', 'isca', 'enfermeira', 'aprendiz',
  'afilhado', 'devedor', 'rival', 'sobrevivente', 'duquesa', 'abutre', 'mordomo', 'governanta',
  'bonnie', 'clyde', 'esposa', 'amante', 'credor', 'caloteiro', 'habitue', 'turista',
  'medico', 'armeiro', 'dinamite', 'guardaCostas', 'fichaQuente', 'federalOuro', 'federalCarmim',
  'cobradorOuro', 'cobradorCarmim', 'casamenteira', 'intrigante', 'infiltradoOuro', 'infiltradoCarmim',
  'sombra', 'sabotador', 'corregedor', 'tirano', 'boticarioOuro', 'boticarioCarmim',
  'usurpadorOuro', 'usurpadorCarmim', 'guardaOuro', 'guardaCarmim', 'vereadorOuro', 'vereadorCarmim',
  'leaoOuro', 'leaoCarmim', 'mandachuva', 'anarquista', 'lacaio', 'embaixadorOuro', 'embaixadorCarmim',
  'santoOuro', 'santoCarmim', 'mentirosoOuro', 'mentirosoCarmim', 'vendadoOuro', 'vendadoCarmim',
  'sorridenteOuro', 'sorridenteCarmim', 'mudoOuro', 'mudoCarmim', 'fofoqueiroOuro', 'fofoqueiroCarmim',
  'timidoOuro', 'timidoCarmim', 'recatadoOuro', 'recatadoCarmim', 'paranoicoOuro', 'paranoicoCarmim',
  'terapeutaOuro', 'terapeutaCarmim', 'chantagistaOuro', 'chantagistaCarmim', 'trapaceiroOuro', 'trapaceiroCarmim',
  'capangaOuro', 'capangaCarmim', 'mordacaOuro', 'mordacaCarmim', 'golpistaOuro', 'golpistaCarmim',
  'negociadorOuro', 'negociadorCarmim', 'intocavelOuro', 'intocavelCarmim',
  'contagiado', 'trevo', 'bebado',
] as const;
export type CharId = (typeof CHARS)[number];

/** Powers a card can use from the phone. */
export type PowerKind =
  | 'federal' // force a card share with one player, once per round
  | 'cobrador' // make two others card share, once per round
  | 'casamenteira' // two players fall in love, once per game
  | 'intrigante' // two players hate each other, once per game
  | 'usurpador' // permanent public reveal, become leader (not in the last round)
  | 'guarda' // permanent public reveal, one player can't be a hostage this round
  | 'vereador' // public reveal: usurp vote counts 2 in an even room
  | 'leao' // in the bigger room, send a player to the other room (not in the last round)
  | 'terapeuta'; // show your card to someone; if they have a psych condition they may card share to be cured

/** Conditions a card starts with or a share can give. Love and hate carry a partner. */
export type CondKind =
  | 'love'
  | 'hate'
  | 'foolish' // tolo: can never turn down a card or colour share
  | 'shy' // tímido: may not reveal any part of the card
  | 'coy' // recatado: may only colour share
  | 'paranoid' // paranoico: may only card share, once per match
  | 'savvy' // esperto: may only card share
  | 'cursed' // calado: no noise, no spoken powers
  | 'honest' // sincero: only true words
  | 'liar' // mentiroso: only false words
  | 'zombie'; // infectado: wins with the infected

/** Psych conditions: the Terapeuta can cure them. */
export const PSYCH: CondKind[] = ['shy', 'coy', 'paranoid'];

/** Powers that need words: a "calado" player can't use them. */
export const SPOKEN_POWERS: PowerKind[] = ['federal', 'cobrador', 'casamenteira', 'intrigante', 'guarda', 'leao'];

export interface CharDef {
  /** Allegiance. */
  team: Team;
  /** Colour shown in a colour share (differs from the team only for the Infiltrados). */
  look: Team;
  name: I18nText;
  /** One line under the name on the card. */
  goal: I18nText;
  /** Full rule, shown when the card is opened. */
  text: I18nText;
  power?: PowerKind;
  /** End-of-game announcement order (pause step). */
  pause?: 5 | 10 | 15;
  /** Linked cards are never buried. */
  linked?: boolean;
  /** Recommended minimum player count (warning only). */
  minPlayers?: number;
  /** Conditions the card starts with (and gets back whenever it changes hands, clean). */
  starts?: CondKind[];
  /** Condition given to whoever card shares with this card. */
  gives?: CondKind;
  /** Immune to every power and condition. */
  immune?: boolean;
}

const T = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

const OURO_GOAL = T('Mantenha o Chefão longe do Assassino.', 'Keep the Boss away from the Hitman.');
const CARMIM_GOAL = T('Leve o Assassino até o Chefão.', 'Bring the Hitman to the Boss.');
const OURO_TEXT = T(
  'Você é da Família Ouro. Vence se, no fim, o Chefão não estiver no mesmo salão que o Assassino.',
  'You belong to the Gold Family. You win if, at the end, the Boss is not in the same hall as the Hitman.',
);
const CARMIM_TEXT = T(
  'Você é da Família Carmim. Vence se, no fim, o Assassino estiver no mesmo salão que o Chefão.',
  'You belong to the Crimson Family. You win if, at the end, the Hitman is in the same hall as the Boss.',
);

function pair(
  power: Partial<CharDef> & { name: I18nText; goal: I18nText; text: I18nText },
): [CharDef, CharDef] {
  return [
    { team: 'ouro', look: 'ouro', ...power },
    { team: 'carmim', look: 'carmim', ...power },
  ];
}

const [federalOuro, federalCarmim] = pair({
  name: T('Federal', 'Fed'),
  goal: T('Force um compartilhamento por rodada.', 'Force a card share once per round.'),
  text: T(
    'Uma vez por rodada, mostre sua carta a um jogador do seu salão: ele é obrigado a compartilhar a carta com você, mesmo sem querer. Você joga pela sua família.',
    'Once per round, show your card to a player in your hall: they must card share with you, willing or not. You play for your family.',
  ),
  power: 'federal',
  minPlayers: 11,
});
const [cobradorOuro, cobradorCarmim] = pair({
  name: T('Cobrador', 'Enforcer'),
  goal: T('Obrigue dois jogadores a se mostrarem.', 'Make two players show each other.'),
  text: T(
    'Uma vez por rodada, escolha dois jogadores do seu salão (não você): eles veem sua carta e são obrigados a compartilhar as cartas entre si. Você joga pela sua família.',
    'Once per round, pick two players in your hall (not yourself): they see your card and must card share with each other. You play for your family.',
  ),
  power: 'cobrador',
  minPlayers: 11,
});
const [infiltradoOuro, infiltradoCarmim] = [
  {
    team: 'ouro',
    look: 'carmim',
    name: T('Infiltrado Ouro', 'Gold Mole'),
    goal: T('Sua cor engana: parece Carmim.', 'Your colour lies: it looks Crimson.'),
    text: T(
      'Você é da Família Ouro, mas em um compartilhamento de cor você aparece como Carmim. Num compartilhamento de carta, a verdade aparece.',
      'You belong to the Gold Family, but in a colour share you show as Crimson. A card share shows the truth.',
    ),
    minPlayers: 11,
  },
  {
    team: 'carmim',
    look: 'ouro',
    name: T('Infiltrado Carmim', 'Crimson Mole'),
    goal: T('Sua cor engana: parece Ouro.', 'Your colour lies: it looks Gold.'),
    text: T(
      'Você é da Família Carmim, mas em um compartilhamento de cor você aparece como Ouro. Num compartilhamento de carta, a verdade aparece.',
      'You belong to the Crimson Family, but in a colour share you show as Gold. A card share shows the truth.',
    ),
    minPlayers: 11,
  },
] as [CharDef, CharDef];
const [boticarioOuro, boticarioCarmim] = pair({
  name: T('Boticário', 'Apothecary'),
  goal: T('Quem compartilha com você fica curado.', 'Whoever card shares with you is cured.'),
  text: T(
    'Todo jogador que compartilhar a carta com você perde todas as condições (apaixonado, odeia, tolo). Você joga pela sua família.',
    'Anyone who card shares with you loses every condition (in love, in hate, gullible). You play for your family.',
  ),
});
const [usurpadorOuro, usurpadorCarmim] = pair({
  name: T('Usurpador', 'Usurper'),
  goal: T('Tome a liderança à força.', 'Seize the leadership.'),
  text: T(
    'Em qualquer rodada menos a última, revele sua carta para todos (para sempre) e vire o líder do seu salão. Ninguém tira você da liderança nesta rodada. Você joga pela sua família.',
    'In any round but the last, reveal your card to everyone (for good) and become your hall’s leader. Nobody can take it from you this round. You play for your family.',
  ),
  power: 'usurpador',
});
const [guardaOuro, guardaCarmim] = pair({
  name: T('Guarda', 'Guard'),
  goal: T('Segure alguém no salão.', 'Hold someone in the hall.'),
  text: T(
    'Uma vez por partida, revele sua carta para todos (para sempre) e escolha alguém do seu salão: essa pessoa não pode ser refém nesta rodada. Você joga pela sua família.',
    'Once per match, reveal your card to everyone (for good) and pick someone in your hall: they cannot be a hostage this round. You play for your family.',
  ),
  power: 'guarda',
});
const [vereadorOuro, vereadorCarmim] = pair({
  name: T('Vereador', 'Alderman'),
  goal: T('Seu voto vale dois num salão par.', 'Your vote counts twice in an even hall.'),
  text: T(
    'Se o seu salão tem número par de pessoas, revele sua carta para todos: seu voto para trocar o líder conta como 2 — a menos que o outro Vereador também tenha se revelado. Você joga pela sua família.',
    'If your hall has an even number of people, reveal your card to everyone: your vote to replace the leader counts as 2 — unless the other Alderman has revealed too. You play for your family.',
  ),
  power: 'vereador',
});
const [leaoOuro, leaoCarmim] = pair({
  name: T('Leão-de-chácara', 'Doorman'),
  goal: T('Expulse alguém do salão cheio.', 'Throw someone out of a crowded hall.'),
  text: T(
    'Se o seu salão tem mais gente que o outro, mostre sua carta a alguém do seu salão: essa pessoa vai na hora para o outro salão. Não vale na última rodada nem entre rodadas. Você joga pela sua família.',
    'If your hall has more people than the other, show your card to someone in your hall: they move to the other hall at once. Not in the last round, nor between rounds. You play for your family.',
  ),
  power: 'leao',
});
const [embaixadorOuro, embaixadorCarmim] = pair({
  name: T('Embaixador', 'Envoy'),
  goal: T('Circule livre entre os salões.', 'Walk freely between the halls.'),
  text: T(
    'Sua carta é pública desde o início. Você não pertence a nenhum salão: anda entre os dois, nunca é líder nem refém, não vota e nenhum poder afeta você. Você joga pela sua família.',
    'Your card is public from the start. You belong to no hall: you walk between both, are never leader or hostage, never vote, and no power affects you. You play for your family.',
  ),
  minPlayers: 11,
  immune: true,
});

// ---- Acting cards: the app shows the rule; the table keeps everyone honest.
const FAMILY = T(' Você joga pela sua família.', ' You play for your family.');
const withFamily = (x: I18nText): I18nText => ({ 'pt-BR': x['pt-BR'] + FAMILY['pt-BR'], en: x.en + FAMILY.en });

const [santoOuro, santoCarmim] = pair({
  name: T('Santo', 'Saint'),
  goal: T('Só diga a verdade.', 'Only speak the truth.'),
  text: withFamily(
    T(
      'Você começa "sincero": tudo o que você FALA tem que ser verdade (gestos e silêncios podem enganar). Sincero e mentiroso se anulam.',
      'You start "honest": everything you SAY must be true (gestures and silence may mislead). Honest and liar cancel out.',
    ),
  ),
  starts: ['honest'],
});
const [mentirosoOuro, mentirosoCarmim] = pair({
  name: T('Mentiroso', 'Fibber'),
  goal: T('Só diga mentiras.', 'Only speak lies.'),
  text: withFamily(
    T(
      'Você começa "mentiroso": tudo o que você FALA tem que ser mentira (o celular e os gestos podem dizer a verdade). Sincero e mentiroso se anulam.',
      'You start "liar": everything you SAY must be a lie (your phone and gestures may tell the truth). Honest and liar cancel out.',
    ),
  ),
  starts: ['liar'],
});
const [vendadoOuro, vendadoCarmim] = pair({
  name: T('Vendado', 'Blindfolded'),
  goal: T('Jogue de olhos fechados.', 'Play with your eyes closed.'),
  text: withFamily(
    T(
      'Depois de ver sua carta, faça o possível para jogar de olhos fechados até o fim. Peça ajuda para andar entre os salões.',
      'After seeing your card, do your best to play with your eyes closed until the end. Ask for help to walk between the halls.',
    ),
  ),
});
const [sorridenteOuro, sorridenteCarmim] = pair({
  name: T('Sorridente', 'Grinner'),
  goal: T('Sorria o tempo todo.', 'Smile all the time.'),
  text: withFamily(T('Faça o possível para estar sempre sorrindo.', 'Do your best to be smiling at all times.')),
});
const [mudoOuro, mudoCarmim] = pair({
  name: T('Mudo', 'Mute'),
  goal: T('Não faça nenhum som.', 'Make no sound.'),
  text: withFamily(
    T('Faça o possível para não emitir nenhum som. Gestos e o celular estão liberados.', 'Do your best to make no sound at all. Gestures and the phone are fine.'),
  ),
});
const [fofoqueiroOuro, fofoqueiroCarmim] = pair({
  name: T('Fofoqueiro', 'Gossip'),
  goal: T('Nada de conversa particular.', 'No private talks.'),
  text: withFamily(
    T(
      'Faça o possível para que não existam conversas particulares: chegue perto, escute, se intrometa — sem encostar em ninguém.',
      'Do your best to make sure there are no private talks: come close, listen in, butt in — without touching anyone.',
    ),
  ),
});

// ---- Conditions: the app enforces them on every share and reveal.
const [timidoOuro, timidoCarmim] = pair({
  name: T('Tímido', 'Shy One'),
  goal: T('Você não mostra nada.', 'You show nothing.'),
  text: withFamily(
    T(
      'Você começa "tímido": não pode mostrar nem trocar nenhuma parte da sua carta (só poderes que obrigam). O Terapeuta pode curar você.',
      'You start "shy": you may not show or share any part of your card (only powers that force it). The Therapist can cure you.',
    ),
  ),
  starts: ['shy'],
});
const [recatadoOuro, recatadoCarmim] = pair({
  name: T('Recatado', 'Coy One'),
  goal: T('Só troca de cor.', 'Colour shares only.'),
  text: withFamily(
    T(
      'Você começa "recatado": só pode trocar a cor (com 10 ou menos jogadores, isso quer dizer nada). O Terapeuta pode curar você.',
      'You start "coy": you may only colour share (with 10 or fewer players, that means nothing at all). The Therapist can cure you.',
    ),
  ),
  starts: ['coy'],
});
const [paranoicoOuro, paranoicoCarmim] = pair({
  name: T('Paranoico', 'Paranoid'),
  goal: T('Uma troca de carta, e só.', 'One card share, that’s it.'),
  text: withFamily(
    T(
      'Você começa "paranoico": só pode trocar a carta inteira, e uma única vez na partida (trocas forçadas por poderes não contam). O Terapeuta pode curar você.',
      'You start "paranoid": you may only card share, and only once per match (shares forced by powers don’t count). The Therapist can cure you.',
    ),
  ),
  starts: ['paranoid'],
});
const [terapeutaOuro, terapeutaCarmim] = pair({
  name: T('Terapeuta', 'Therapist'),
  goal: T('Cure tímidos, recatados e paranoicos.', 'Cure the shy, the coy and the paranoid.'),
  text: withFamily(
    T(
      'Mostre sua carta a alguém do salão. Se a pessoa estiver tímida, recatada ou paranoica, ela pode trocar a carta com você na hora — e fica curada.',
      'Show your card to someone in your hall. If they are shy, coy or paranoid, they may card share with you right away — and are cured.',
    ),
  ),
  power: 'terapeuta',
});
const [chantagistaOuro, chantagistaCarmim] = pair({
  name: T('Chantagista', 'Blackmailer'),
  goal: T('Quem te vê, se cala.', 'Whoever sees you clams up.'),
  text: withFamily(T('Quem trocar a carta com você fica "tímido".', 'Whoever card shares with you becomes "shy".')),
  gives: 'shy',
});
const [trapaceiroOuro, trapaceiroCarmim] = pair({
  name: T('Trapaceiro', 'Card Sharp'),
  goal: T('Quem te vê, vira tolo.', 'Whoever sees you turns gullible.'),
  text: withFamily(
    T(
      'Quem trocar a carta com você fica "tolo": nunca mais recusa um pedido de troca. Tolo anula tímido, recatado e paranoico.',
      'Whoever card shares with you becomes "gullible": they can never turn down a share again. Gullible cancels shy, coy and paranoid.',
    ),
  ),
  gives: 'foolish',
});
const [capangaOuro, capangaCarmim] = pair({
  name: T('Capanga', 'Thug'),
  goal: T('Quem te vê, só mostra a cor.', 'Whoever sees you shows colours only.'),
  text: withFamily(T('Quem trocar a carta com você fica "recatado".', 'Whoever card shares with you becomes "coy".')),
  gives: 'coy',
});
const [mordacaOuro, mordacaCarmim] = pair({
  name: T('Mordaça', 'Gagger'),
  goal: T('Quem te vê, fica calado.', 'Whoever sees you goes quiet.'),
  text: withFamily(
    T(
      'Quem trocar a carta com você fica "calado": não pode fazer barulho nem usar poderes que exigem falar (Federal, Cobrador, Casamenteira, Intrigante, Guarda, Leão-de-chácara).',
      'Whoever card shares with you becomes "gagged": no noise, and no powers that need words (Fed, Enforcer, Matchmaker, Troublemaker, Guard, Doorman).',
    ),
  ),
  gives: 'cursed',
});
const [golpistaOuro, golpistaCarmim] = pair({
  name: T('Golpista', 'Grifter'),
  goal: T('Troca de cor vira carta inteira.', 'Colour shares become full reveals.'),
  text: withFamily(
    T(
      'Quando alguém aceita trocar a cor com você, os dois mostram a carta inteira um ao outro em vez disso.',
      'When someone agrees to a colour share with you, you both show each other the whole card instead.',
    ),
  ),
  minPlayers: 11,
});
const [negociadorOuro, negociadorCarmim] = pair({
  name: T('Negociador', 'Negotiator'),
  goal: T('Só troca de carta inteira.', 'Card shares only.'),
  text: withFamily(
    T(
      'Você começa "esperto": só pode trocar a carta inteira — nada de mostrar, revelar ou trocar só a cor.',
      'You start "savvy": you may only card share — no showing, revealing or colour sharing.',
    ),
  ),
  starts: ['savvy'],
  minPlayers: 11,
});
const [intocavelOuro, intocavelCarmim] = pair({
  name: T('Intocável', 'Untouchable'),
  goal: T('Nada pega em você.', 'Nothing sticks to you.'),
  text: withFamily(
    T(
      'Você é imune a todos os poderes e condições, sem exceção. Nunca minta sobre ser imune.',
      'You are immune to every power and condition, no exceptions. Never lie about being immune.',
    ),
  ),
  immune: true,
});

const grey = (name: I18nText, goal: I18nText, text: I18nText, extra: Partial<CharDef> = {}): CharDef => ({
  team: 'prata',
  look: 'prata',
  name,
  goal,
  text,
  ...extra,
});

export const CATALOG: Record<CharId, CharDef> = {
  chefao: {
    team: 'ouro',
    look: 'ouro',
    name: T('O Chefão', 'The Boss'),
    goal: T('Fique longe do Assassino.', 'Stay away from the Hitman.'),
    text: T(
      'Você é o coração da Família Ouro. Se terminar no mesmo salão que o Assassino, sua família perde.',
      'You are the heart of the Gold Family. If you end in the same hall as the Hitman, your family loses.',
    ),
  },
  assassino: {
    team: 'carmim',
    look: 'carmim',
    name: T('O Assassino', 'The Hitman'),
    goal: T('Termine no salão do Chefão.', 'End in the Boss’s hall.'),
    text: T(
      'Você carrega a ficha explosiva. No fim, todos no seu salão caem. A Família Carmim vence se o Chefão estiver entre eles.',
      'You carry the loaded chip. At the end, everyone in your hall goes down. The Crimson Family wins if the Boss is among them.',
    ),
  },
  soldadoOuro: { team: 'ouro', look: 'ouro', name: T('Família Ouro', 'Gold Family'), goal: OURO_GOAL, text: OURO_TEXT },
  soldadoCarmim: {
    team: 'carmim',
    look: 'carmim',
    name: T('Família Carmim', 'Crimson Family'),
    goal: CARMIM_GOAL,
    text: CARMIM_TEXT,
  },
  apostador: grey(
    T('Apostador', 'Gambler'),
    T('Aposte em quem vence.', 'Bet on who wins.'),
    T(
      'Antes da revelação final, anuncie qual família venceu: Ouro, Carmim ou nenhuma. Você vence se acertar.',
      'Before the final reveal, announce which family won: Gold, Crimson or neither. You win if you are right.',
    ),
    { pause: 10 },
  ),

  herdeiro: {
    team: 'ouro',
    look: 'ouro',
    name: T('Herdeiro', 'Heir'),
    goal: T('Se o Chefão sumir, você é o Chefão.', 'If the Boss is gone, you are the Boss.'),
    text: T(
      'Se a carta do Chefão foi enterrada, você assume o papel dele em tudo. Se não, você é da Família Ouro.',
      'If the Boss’s card was buried, you take on his role in everything. Otherwise you are Gold Family.',
    ),
  },
  bracoDireito: {
    team: 'carmim',
    look: 'carmim',
    name: T('Braço Direito', 'Right Hand'),
    goal: T('Se o Assassino sumir, você é o Assassino.', 'If the Hitman is gone, you are the Hitman.'),
    text: T(
      'Se a carta do Assassino foi enterrada, você assume o papel dele em tudo. Se não, você é da Família Carmim.',
      'If the Hitman’s card was buried, you take on his role in everything. Otherwise you are Crimson Family.',
    ),
  },
  investigador: grey(
    T('Investigador', 'Investigator'),
    T('Descubra a carta enterrada.', 'Find the buried card.'),
    T(
      'Antes da revelação final, anuncie qual carta foi enterrada. Você vence se acertar.',
      'Before the final reveal, announce which card was buried. You win if you are right.',
    ),
    { pause: 5 },
  ),
  atirador: grey(
    T('Atirador', 'Marksman'),
    T('Acerte o Alvo.', 'Hit the Mark.'),
    T(
      'Antes da revelação final, escolha em quem atirar (de qualquer salão). Você vence se acertar o Alvo.',
      'Before the final reveal, choose whom to shoot (from either hall). You win if you hit the Mark.',
    ),
    { pause: 15, linked: true },
  ),
  alvo: grey(
    T('Alvo', 'Mark'),
    T('Não leve o tiro.', 'Don’t get shot.'),
    T('Você vence se o Atirador não escolher você.', 'You win if the Marksman does not pick you.'),
    { linked: true },
  ),
  isca: grey(
    T('Isca', 'Decoy'),
    T('Leve o tiro.', 'Get shot.'),
    T('Você vence se o Atirador escolher você.', 'You win if the Marksman picks you.'),
    { linked: true },
  ),
  enfermeira: {
    team: 'ouro',
    look: 'ouro',
    name: T('Enfermeira', 'Nurse'),
    goal: T('Se o Médico sumir, você é o Médico.', 'If the Doctor is gone, you are the Doctor.'),
    text: T(
      'Se a carta do Médico foi enterrada, você assume o papel dele: o Chefão precisa compartilhar a carta com você. Se não, você é da Família Ouro.',
      'If the Doctor’s card was buried, you take on its role: the Boss must card share with you. Otherwise you are Gold Family.',
    ),
  },
  aprendiz: {
    team: 'carmim',
    look: 'carmim',
    name: T('Aprendiz', 'Apprentice'),
    goal: T('Se o Armeiro sumir, você é o Armeiro.', 'If the Armorer is gone, you are the Armorer.'),
    text: T(
      'Se a carta do Armeiro foi enterrada, você assume o papel dele: o Assassino precisa compartilhar a carta com você. Se não, você é da Família Carmim.',
      'If the Armorer’s card was buried, you take on its role: the Hitman must card share with you. Otherwise you are Crimson Family.',
    ),
  },

  afilhado: grey(
    T('Afilhado', 'Godson'),
    T('Termine com o Chefão.', 'End with the Boss.'),
    T('Você vence se terminar no mesmo salão que o Chefão.', 'You win if you end in the same hall as the Boss.'),
  ),
  devedor: grey(
    T('Devedor', 'Debtor'),
    T('Termine com o Assassino.', 'End with the Hitman.'),
    T('Você vence se terminar no mesmo salão que o Assassino.', 'You win if you end in the same hall as the Hitman.'),
  ),
  rival: grey(
    T('Rival', 'Rival'),
    T('Fique longe do Chefão.', 'Stay away from the Boss.'),
    T('Você vence se NÃO terminar no salão do Chefão.', 'You win if you do NOT end in the Boss’s hall.'),
  ),
  sobrevivente: grey(
    T('Sobrevivente', 'Survivor'),
    T('Fique longe do Assassino.', 'Stay away from the Hitman.'),
    T('Você vence se NÃO terminar no salão do Assassino.', 'You win if you do NOT end in the Hitman’s hall.'),
  ),
  duquesa: grey(
    T('Duquesa', 'Duchess'),
    T('Longe do Chefão e do Assassino.', 'Away from the Boss and the Hitman.'),
    T(
      'Você vence se NÃO terminar no salão do Chefão nem no salão do Assassino.',
      'You win if you end neither in the Boss’s hall nor in the Hitman’s hall.',
    ),
  ),
  abutre: grey(
    T('Abutre', 'Vulture'),
    T('Com o Assassino, sem o Chefão.', 'With the Hitman, without the Boss.'),
    T(
      'Você vence se terminar no salão do Assassino e o Chefão NÃO estiver lá.',
      'You win if you end in the Hitman’s hall and the Boss is NOT there.',
    ),
  ),
  mordomo: grey(
    T('Mordomo', 'Butler'),
    T('Com a Governanta e o Chefão.', 'With the Housekeeper and the Boss.'),
    T(
      'Você vence se terminar no mesmo salão que a Governanta e o Chefão.',
      'You win if you end in the same hall as the Housekeeper and the Boss.',
    ),
    { linked: true },
  ),
  governanta: grey(
    T('Governanta', 'Housekeeper'),
    T('Com o Mordomo e o Chefão.', 'With the Butler and the Boss.'),
    T(
      'Você vence se terminar no mesmo salão que o Mordomo e o Chefão.',
      'You win if you end in the same hall as the Butler and the Boss.',
    ),
    { linked: true },
  ),
  bonnie: grey(
    T('Bonnie', 'Bonnie'),
    T('Com Clyde e o Assassino.', 'With Clyde and the Hitman.'),
    T(
      'Você vence se terminar no mesmo salão que Clyde e o Assassino.',
      'You win if you end in the same hall as Clyde and the Hitman.',
    ),
    { linked: true },
  ),
  clyde: grey(
    T('Clyde', 'Clyde'),
    T('Com Bonnie e o Assassino.', 'With Bonnie and the Hitman.'),
    T(
      'Você vence se terminar no mesmo salão que Bonnie e o Assassino.',
      'You win if you end in the same hall as Bonnie and the Hitman.',
    ),
    { linked: true },
  ),
  esposa: grey(
    T('Esposa', 'Wife'),
    T('Com o Chefão, sem a Amante.', 'With the Boss, without the Lover.'),
    T(
      'Você vence se terminar no salão do Chefão e a Amante NÃO estiver lá.',
      'You win if you end in the Boss’s hall and the Lover is NOT there.',
    ),
    { linked: true },
  ),
  amante: grey(
    T('Amante', 'Lover'),
    T('Com o Chefão, sem a Esposa.', 'With the Boss, without the Wife.'),
    T(
      'Você vence se terminar no salão do Chefão e a Esposa NÃO estiver lá.',
      'You win if you end in the Boss’s hall and the Wife is NOT there.',
    ),
    { linked: true },
  ),
  credor: grey(
    T('Credor', 'Creditor'),
    T('O Caloteiro com o Assassino; você não.', 'The Deadbeat with the Hitman; not you.'),
    T(
      'Você vence se o Caloteiro terminar no salão do Assassino e você NÃO.',
      'You win if the Deadbeat ends in the Hitman’s hall and you do NOT.',
    ),
    { linked: true, minPlayers: 11 },
  ),
  caloteiro: grey(
    T('Caloteiro', 'Deadbeat'),
    T('O Credor com o Assassino; você não.', 'The Creditor with the Hitman; not you.'),
    T(
      'Você vence se o Credor terminar no salão do Assassino e você NÃO.',
      'You win if the Creditor ends in the Hitman’s hall and you do NOT.',
    ),
    { linked: true, minPlayers: 11 },
  ),
  habitue: grey(
    T('Habitué', 'Regular'),
    T('Nunca saia do seu salão.', 'Never leave your hall.'),
    T(
      'Você vence se nunca sair do salão em que começou (nem como refém, nem expulso).',
      'You win if you never leave the hall you started in (not as a hostage, not thrown out).',
    ),
  ),
  turista: grey(
    T('Turista', 'Drifter'),
    T('Seja refém na maioria das rodadas.', 'Be a hostage in most rounds.'),
    T(
      'Você vence se for enviado como refém na maioria das rodadas (2 de 3, ou 3 de 5).',
      'You win if you are sent as a hostage in most rounds (2 of 3, or 3 of 5).',
    ),
  ),

  medico: {
    team: 'ouro',
    look: 'ouro',
    name: T('Médico', 'Doctor'),
    goal: T('O Chefão precisa se consultar com você.', 'The Boss must see you.'),
    text: T(
      'Com você no jogo, a Família Ouro só vence se o Chefão compartilhar a carta com você antes do fim.',
      'With you in play, the Gold Family only wins if the Boss card shares with you before the end.',
    ),
  },
  armeiro: {
    team: 'carmim',
    look: 'carmim',
    name: T('Armeiro', 'Armorer'),
    goal: T('O Assassino precisa passar por você.', 'The Hitman must see you.'),
    text: T(
      'Com você no jogo, a Família Carmim só vence se o Assassino compartilhar a carta com você antes do fim.',
      'With you in play, the Crimson Family only wins if the Hitman card shares with you before the end.',
    ),
  },
  dinamite: {
    team: 'carmim',
    look: 'carmim',
    name: T('Dinamite', 'Dynamite'),
    goal: T('Compartilhe com o Chefão e exploda tudo.', 'Card share with the Boss and blow it all up.'),
    text: T(
      'Se você compartilhar a carta com o Chefão, todos no seu salão caem e a partida acaba na hora. (Não vale com o Herdeiro.)',
      'If you card share with the Boss, everyone in your hall goes down and the match ends at once. (Not with the Heir.)',
    ),
  },
  guardaCostas: {
    team: 'ouro',
    look: 'ouro',
    name: T('Guarda-costas', 'Bodyguard'),
    goal: T('Compartilhe com o Assassino e acabe com ele.', 'Card share with the Hitman and end him.'),
    text: T(
      'Se você compartilhar a carta com o Assassino, todos no seu salão caem — menos o Chefão — e a partida acaba na hora. (Não vale com o Braço Direito.)',
      'If you card share with the Hitman, everyone in your hall goes down — except the Boss — and the match ends at once. (Not with the Right Hand.)',
    ),
  },
  fichaQuente: grey(
    T('Ficha Quente', 'Hot Chip'),
    T('Passe adiante: quem compartilha troca de carta.', 'Pass it on: whoever shares swaps cards.'),
    T(
      'Quem compartilhar carta ou cor com você troca de carta com você na hora (e assume a nova carta, limpa). Quem estiver com a Ficha Quente no fim perde.',
      'Whoever card or colour shares with you swaps cards with you at once (and takes the new card, clean). Whoever holds the Hot Chip at the end loses.',
    ),
  ),
  federalOuro,
  federalCarmim,
  cobradorOuro,
  cobradorCarmim,
  casamenteira: {
    team: 'carmim',
    look: 'carmim',
    name: T('Casamenteira', 'Matchmaker'),
    goal: T('Junte dois corações.', 'Join two hearts.'),
    text: T(
      'Uma vez por partida, escolha dois jogadores do seu salão (não você): eles veem sua carta e ficam apaixonados — o objetivo deles passa a ser terminar no mesmo salão um do outro.',
      'Once per match, pick two players in your hall (not yourself): they see your card and fall in love — their goal becomes ending in the same hall as each other.',
    ),
    power: 'casamenteira',
  },
  intrigante: {
    team: 'ouro',
    look: 'ouro',
    name: T('Intrigante', 'Troublemaker'),
    goal: T('Semeie a discórdia.', 'Sow discord.'),
    text: T(
      'Uma vez por partida, escolha dois jogadores do seu salão (não você): eles veem sua carta e passam a se odiar — o objetivo deles passa a ser terminar em salões diferentes.',
      'Once per match, pick two players in your hall (not yourself): they see your card and come to hate each other — their goal becomes ending in different halls.',
    ),
    power: 'intrigante',
  },
  infiltradoOuro,
  infiltradoCarmim,
  sombra: grey(
    T('Sombra', 'Shadow'),
    T('Vença junto com o primeiro que se mostrar.', 'Win along with the first one you share with.'),
    T(
      'Você vence se o primeiro jogador com quem você compartilhar (carta ou cor) vencer. Se não compartilhar com ninguém, perde.',
      'You win if the first player you share with (card or colour) wins. If you never share, you lose.',
    ),
  ),
  sabotador: grey(
    T('Sabotador', 'Saboteur'),
    T('O primeiro que se mostrar precisa perder.', 'The first one you share with must lose.'),
    T(
      'Você vence se o primeiro jogador com quem você compartilhar (carta ou cor) NÃO cumprir o objetivo. Se não compartilhar com ninguém, perde.',
      'You win if the first player you share with (card or colour) fails their goal. If you never share, you lose.',
    ),
  ),
  corregedor: grey(
    T('Corregedor', 'Internal Affairs'),
    T('Veja o Chefão e o Assassino.', 'See the Boss and the Hitman.'),
    T(
      'Você vence se compartilhar a carta com o Chefão e com o Assassino antes do fim.',
      'You win if you card share with both the Boss and the Hitman before the end.',
    ),
  ),
  tirano: grey(
    T('Tirano', 'Tyrant'),
    T('Que ninguém dos dois chefes te veja.', 'Don’t let both heads see you.'),
    T(
      'Você começa "tolo": aceita todo pedido de troca (carta ou cor). Você vence se o Chefão e o Assassino NÃO tiverem compartilhado a carta com você, os dois. Se vencer, todos os outros perdem.',
      'You start "gullible": you accept every share offer (card or colour). You win unless both the Boss and the Hitman card shared with you. If you win, everyone else loses.',
    ),
    { starts: ['foolish'] },
  ),
  santoOuro,
  santoCarmim,
  mentirosoOuro,
  mentirosoCarmim,
  vendadoOuro,
  vendadoCarmim,
  sorridenteOuro,
  sorridenteCarmim,
  mudoOuro,
  mudoCarmim,
  fofoqueiroOuro,
  fofoqueiroCarmim,
  timidoOuro,
  timidoCarmim,
  recatadoOuro,
  recatadoCarmim,
  paranoicoOuro,
  paranoicoCarmim,
  terapeutaOuro,
  terapeutaCarmim,
  chantagistaOuro,
  chantagistaCarmim,
  trapaceiroOuro,
  trapaceiroCarmim,
  capangaOuro,
  capangaCarmim,
  mordacaOuro,
  mordacaCarmim,
  golpistaOuro,
  golpistaCarmim,
  negociadorOuro,
  negociadorCarmim,
  intocavelOuro,
  intocavelCarmim,
  contagiado: {
    team: 'verde',
    look: 'verde',
    name: T('Contagiado', 'Infected'),
    goal: T('Espalhe a infecção.', 'Spread the infection.'),
    text: T(
      'Você começa "infectado". Quem trocar carta ou cor com um infectado também fica infectado. Os infectados vencem juntos se, no fim, todos os que não caíram estiverem infectados (Embaixadores não contam).',
      'You start "infected". Whoever card or colour shares with an infected player becomes infected too. The infected win together if, at the end, everyone who did not go down is infected (Envoys don’t count).',
    ),
    starts: ['zombie'],
  },
  trevo: {
    team: 'verde',
    look: 'verde',
    name: T('Trevo da Sorte', 'Lucky Clover'),
    goal: T('Quem estiver com o trevo no fim vence.', 'Whoever holds the clover at the end wins.'),
    text: T(
      'Você começa "tolo". Quem trocar carta ou cor com você troca de carta com você na hora (e assume a nova carta, limpa). Quem estiver com o Trevo no fim vence. Ninguém pode ficar com o Trevo duas vezes na mesma partida.',
      'You start "gullible". Whoever card or colour shares with you swaps cards with you at once (and takes the new card, clean). Whoever holds the Clover at the end wins. Nobody can hold the Clover twice in one match.',
    ),
    starts: ['foolish'],
  },
  bebado: {
    team: 'prata',
    look: 'prata',
    name: T('Bêbado', 'Drunk'),
    goal: T('Na última rodada, você fica sóbrio.', 'In the last round, you sober up.'),
    text: T(
      'Antes de distribuir, uma carta foi separada — a carta "sóbria". No começo da última rodada, o celular troca a sua carta por ela, e você passa a jogar com essa carta, limpa.',
      'Before dealing, one card was set aside — the "sober" card. At the start of the last round, your phone swaps your card for it, and you play that card from then on, clean.',
    ),
  },
  boticarioOuro,
  boticarioCarmim,

  usurpadorOuro,
  usurpadorCarmim,
  guardaOuro,
  guardaCarmim,
  vereadorOuro,
  vereadorCarmim,
  leaoOuro,
  leaoCarmim,
  mandachuva: grey(
    T('Mandachuva', 'Kingpin'),
    T('Lidere os dois salões.', 'Lead both halls.'),
    T(
      'Você vence se terminar como líder de um salão E tiver sido líder do outro salão em algum momento.',
      'You win if you end as a hall’s leader AND you led the other hall at some point.',
    ),
  ),
  anarquista: grey(
    T('Anarquista', 'Anarchist'),
    T('Derrube líderes.', 'Topple leaders.'),
    T(
      'Você vence se o seu voto ajudou a derrubar um líder na maioria das rodadas (2 de 3, ou 3 de 5).',
      'You win if your vote helped topple a leader in most rounds (2 of 3, or 3 of 5).',
    ),
  ),
  lacaio: grey(
    T('Lacaio', 'Lackey'),
    T('Nenhum líder derrubado perto de você.', 'No leader toppled around you.'),
    T(
      'Você vence se nenhum líder for derrubado no salão em que você está.',
      'You win if no leader is ever toppled in the hall you are in.',
    ),
  ),
  embaixadorOuro,
  embaixadorCarmim,
};

/** A group of cards the Host toggles as one. */
export interface Unit {
  id: string;
  group: Exclude<Group, 'base'>;
  cards: CharId[];
}

export const UNITS: Unit[] = [
  { id: 'reservas', group: 'reservas', cards: ['herdeiro', 'bracoDireito'] },
  { id: 'investigador', group: 'reservas', cards: ['investigador'] },
  { id: 'apostador', group: 'reservas', cards: ['apostador'] },
  { id: 'atirador', group: 'reservas', cards: ['atirador', 'alvo', 'isca'] },
  { id: 'enfermeiros', group: 'reservas', cards: ['enfermeira', 'aprendiz'] },
  { id: 'afilhado', group: 'salas', cards: ['afilhado', 'devedor'] },
  { id: 'rival', group: 'salas', cards: ['rival', 'sobrevivente'] },
  { id: 'duquesa', group: 'salas', cards: ['duquesa', 'abutre'] },
  { id: 'mordomo', group: 'salas', cards: ['mordomo', 'governanta'] },
  { id: 'bonnie', group: 'salas', cards: ['bonnie', 'clyde'] },
  { id: 'esposa', group: 'salas', cards: ['esposa', 'amante'] },
  { id: 'credor', group: 'salas', cards: ['credor', 'caloteiro'] },
  { id: 'habitue', group: 'salas', cards: ['habitue', 'turista'] },
  { id: 'medico', group: 'compartilhar', cards: ['medico', 'armeiro'] },
  { id: 'dinamite', group: 'compartilhar', cards: ['dinamite', 'guardaCostas'] },
  { id: 'fichaQuente', group: 'compartilhar', cards: ['fichaQuente'] },
  { id: 'federal', group: 'compartilhar', cards: ['federalOuro', 'federalCarmim'] },
  { id: 'cobrador', group: 'compartilhar', cards: ['cobradorOuro', 'cobradorCarmim'] },
  { id: 'casamenteira', group: 'compartilhar', cards: ['casamenteira', 'intrigante'] },
  { id: 'infiltrado', group: 'compartilhar', cards: ['infiltradoOuro', 'infiltradoCarmim'] },
  { id: 'sombra', group: 'compartilhar', cards: ['sombra', 'sabotador'] },
  { id: 'corregedor', group: 'compartilhar', cards: ['corregedor'] },
  { id: 'tirano', group: 'compartilhar', cards: ['tirano'] },
  { id: 'boticario', group: 'compartilhar', cards: ['boticarioOuro', 'boticarioCarmim'] },
  { id: 'usurpador', group: 'lideranca', cards: ['usurpadorOuro', 'usurpadorCarmim'] },
  { id: 'guarda', group: 'lideranca', cards: ['guardaOuro', 'guardaCarmim'] },
  { id: 'vereador', group: 'lideranca', cards: ['vereadorOuro', 'vereadorCarmim'] },
  { id: 'leao', group: 'lideranca', cards: ['leaoOuro', 'leaoCarmim'] },
  { id: 'mandachuva', group: 'lideranca', cards: ['mandachuva'] },
  { id: 'anarquista', group: 'lideranca', cards: ['anarquista'] },
  { id: 'lacaio', group: 'lideranca', cards: ['lacaio'] },
  { id: 'embaixador', group: 'lideranca', cards: ['embaixadorOuro', 'embaixadorCarmim'] },
  { id: 'santo', group: 'atuacao', cards: ['santoOuro', 'santoCarmim'] },
  { id: 'mentiroso', group: 'atuacao', cards: ['mentirosoOuro', 'mentirosoCarmim'] },
  { id: 'vendado', group: 'atuacao', cards: ['vendadoOuro', 'vendadoCarmim'] },
  { id: 'sorridente', group: 'atuacao', cards: ['sorridenteOuro', 'sorridenteCarmim'] },
  { id: 'mudo', group: 'atuacao', cards: ['mudoOuro', 'mudoCarmim'] },
  { id: 'fofoqueiro', group: 'atuacao', cards: ['fofoqueiroOuro', 'fofoqueiroCarmim'] },
  { id: 'timido', group: 'condicoes', cards: ['timidoOuro', 'timidoCarmim'] },
  { id: 'recatado', group: 'condicoes', cards: ['recatadoOuro', 'recatadoCarmim'] },
  { id: 'paranoico', group: 'condicoes', cards: ['paranoicoOuro', 'paranoicoCarmim'] },
  { id: 'terapeuta', group: 'condicoes', cards: ['terapeutaOuro', 'terapeutaCarmim'] },
  { id: 'chantagista', group: 'condicoes', cards: ['chantagistaOuro', 'chantagistaCarmim'] },
  { id: 'trapaceiro', group: 'condicoes', cards: ['trapaceiroOuro', 'trapaceiroCarmim'] },
  { id: 'capanga', group: 'condicoes', cards: ['capangaOuro', 'capangaCarmim'] },
  { id: 'mordaca', group: 'condicoes', cards: ['mordacaOuro', 'mordacaCarmim'] },
  { id: 'golpista', group: 'condicoes', cards: ['golpistaOuro', 'golpistaCarmim'] },
  { id: 'negociador', group: 'condicoes', cards: ['negociadorOuro', 'negociadorCarmim'] },
  { id: 'intocavel', group: 'condicoes', cards: ['intocavelOuro', 'intocavelCarmim'] },
  { id: 'contagiado', group: 'caos', cards: ['contagiado'] },
  { id: 'trevo', group: 'caos', cards: ['trevo'] },
  { id: 'bebado', group: 'caos', cards: ['bebado'] },
];

export const UNIT_BY_ID: Record<string, Unit> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

/** Units each preset tries to add, in order, while they fit the table. */
export const PRESETS: Record<string, string[]> = {
  basico: [],
  classico: ['medico', 'afilhado', 'rival', 'usurpador', 'reservas', 'duquesa', 'guarda'],
  caos: [
    'medico', 'fichaQuente', 'afilhado', 'sombra', 'usurpador', 'casamenteira', 'rival', 'atirador',
    'federal', 'leao', 'vereador', 'cobrador', 'infiltrado', 'mordomo', 'bonnie', 'esposa',
    'duquesa', 'corregedor', 'habitue', 'anarquista', 'embaixador', 'credor', 'mandachuva', 'lacaio',
    'trevo', 'bebado', 'timido', 'chantagista', 'terapeuta', 'santo', 'mentiroso', 'sorridente',
  ],
};

export const GROUP_NAMES: Record<Exclude<Group, 'base'>, I18nText> = {
  reservas: T('Reservas e fim de jogo', 'Backups & endgame'),
  salas: T('Objetivos por salão', 'Hall goals'),
  compartilhar: T('Poderes de compartilhar', 'Sharing powers'),
  lideranca: T('Liderança e salão', 'Leadership & halls'),
  atuacao: T('Atuação', 'Acting'),
  condicoes: T('Condições', 'Conditions'),
  caos: T('Cartas do caos', 'Wild cards'),
};

/** Players counted for the hostage table and the 11+ rules: everyone but the Envoys. */
export function hostageTable(players: number, rounds: 3 | 5): number[] {
  if (rounds === 5) {
    if (players >= 22) return [5, 4, 3, 2, 1];
    if (players >= 18) return [4, 3, 2, 1, 1];
    if (players >= 14) return [3, 2, 2, 1, 1];
    return [2, 2, 1, 1, 1];
  }
  if (players >= 22) return [3, 2, 1];
  if (players >= 14) return [2, 1, 1];
  return [1, 1, 1];
}

export function roundMinutes(rounds: 3 | 5, timing: string): number[] {
  if (timing === 'tres') return rounds === 5 ? [3, 3, 3, 3, 3] : [3, 3, 3];
  return rounds === 5 ? [5, 4, 3, 2, 1] : [3, 2, 1];
}

/** Colour sharing and colour reveals need more than 10 players; so do 5 rounds. */
export const BIG_TABLE = 11;
