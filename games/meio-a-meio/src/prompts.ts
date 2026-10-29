import type { I18nText } from '@mp/game-sdk';

// Original prompt bank for the Author's "Sugerir" button. It lives with the logic (never in the
// UI bundle): the engine hands out one suggestion at a time, to the Author's phone only.
// Each prompt is meant to divide a room — no obvious answer.

export interface Prompt {
  q: I18nText;
  a: I18nText;
  b: I18nText;
}

const p = (q: [string, string], a: [string, string], b: [string, string]): Prompt => ({
  q: { 'pt-BR': q[0], en: q[1] },
  a: { 'pt-BR': a[0], en: a[1] },
  b: { 'pt-BR': b[0], en: b[1] },
});

export const PROMPTS: Prompt[] = [
  p(['Você prefere saber a data da sua morte ou a causa?', 'Would you rather know the date of your death or the cause?'], ['A data', 'The date'], ['A causa', 'The cause']),
  p(['Uma viagem dos sonhos sozinho ou uma viagem comum com os amigos?', 'A dream trip alone or an ordinary trip with friends?'], ['Sonho, sozinho', 'Dream trip, alone'], ['Comum, com amigos', 'Ordinary, with friends']),
  p(['Você ganha na loteria. Conta para a família ou guarda segredo?', 'You win the lottery. Tell your family or keep it secret?'], ['Conto', 'Tell them'], ['Segredo', 'Keep it secret']),
  p(['Ler mentes por um dia ou ficar invisível por um dia?', 'Read minds for a day or be invisible for a day?'], ['Ler mentes', 'Read minds'], ['Ficar invisível', 'Be invisible']),
  p(['Abacaxi na pizza: pode ou não pode?', 'Pineapple on pizza: yes or no?'], ['Pode', 'Yes'], ['Não pode', 'No']),
  p(['Voltar 10 anos no tempo com o que sabe hoje, ou avançar 10 anos e ver como ficou?', 'Go back 10 years knowing what you know, or jump 10 years ahead and see how it turned out?'], ['Voltar', 'Go back'], ['Avançar', 'Jump ahead']),
  p(['Um amigo te pede para mentir por ele num assunto sério. Você mente?', 'A friend asks you to lie for them about something serious. Do you?'], ['Minto', 'I lie'], ['Não minto', 'I don’t']),
  p(['Morar na praia ou na montanha?', 'Live by the beach or in the mountains?'], ['Praia', 'Beach'], ['Montanha', 'Mountains']),
  p(['Você encontra uma carteira com R$ 2.000 e nenhum documento. Fica ou entrega na polícia?', 'You find a wallet with $500 and no ID. Keep it or hand it to the police?'], ['Fico', 'Keep it'], ['Entrego', 'Hand it in']),
  p(['Nunca mais usar celular ou nunca mais comer doce?', 'Never use a phone again or never eat sweets again?'], ['Sem celular', 'No phone'], ['Sem doce', 'No sweets']),
  p(['Trabalho que paga muito e você odeia, ou que paga pouco e você ama?', 'A job that pays a lot that you hate, or one that pays little that you love?'], ['Paga muito', 'Pays a lot'], ['Eu amo', 'I love it']),
  p(['Ver o futuro de todo mundo menos o seu, ou só o seu?', 'See everyone’s future but yours, or only yours?'], ['De todo mundo', 'Everyone’s'], ['Só o meu', 'Only mine']),
  p(['Um jantar com seu ídolo, ou com um antepassado que você nunca conheceu?', 'Dinner with your idol, or with an ancestor you never met?'], ['Ídolo', 'Idol'], ['Antepassado', 'Ancestor']),
  p(['Sinceridade total sempre, ou mentirinhas para não magoar?', 'Total honesty always, or white lies to spare feelings?'], ['Sinceridade total', 'Total honesty'], ['Mentirinhas', 'White lies']),
  p(['Ser muito famoso ou muito rico, mas anônimo?', 'Be very famous, or very rich but anonymous?'], ['Famoso', 'Famous'], ['Rico e anônimo', 'Rich and anonymous']),
  p(['Filme no cinema ou no sofá de casa?', 'A movie at the cinema or on your couch?'], ['Cinema', 'Cinema'], ['Sofá', 'Couch']),
  p(['Você descobre o final da sua série favorita sem querer. Assiste mesmo assim?', 'You accidentally learn the ending of your favourite show. Still watch it?'], ['Assisto', 'Still watch'], ['Desisto', 'Give up']),
  p(['Falar todas as línguas do mundo ou tocar todos os instrumentos?', 'Speak every language or play every instrument?'], ['Línguas', 'Languages'], ['Instrumentos', 'Instruments']),
  p(['Acordar às 5h com o dia rendendo, ou às 11h descansado?', 'Wake at 5 a.m. and get things done, or at 11 a.m. well rested?'], ['5h', '5 a.m.'], ['11h', '11 a.m.']),
  p(['Um robô que limpa a casa ou um que cozinha?', 'A robot that cleans the house or one that cooks?'], ['Limpa', 'Cleans'], ['Cozinha', 'Cooks']),
  p(['Seu parceiro pode ler suas mensagens?', 'May your partner read your messages?'], ['Pode', 'Yes'], ['Não pode', 'No']),
  p(['Viver 200 anos com saúde mediana ou 80 com saúde perfeita?', 'Live 200 years in so-so health or 80 in perfect health?'], ['200 anos', '200 years'], ['80 perfeitos', '80 perfect']),
  p(['Presente surpresa ou presente que você escolheu?', 'A surprise gift or a gift you picked yourself?'], ['Surpresa', 'Surprise'], ['Eu escolho', 'I pick']),
  p(['Ir à Lua só ida, com fama eterna, ou ficar na Terra anônimo?', 'A one-way trip to the Moon with eternal fame, or stay on Earth unknown?'], ['Lua', 'The Moon'], ['Terra', 'Earth']),
  p(['Café ou chá para o resto da vida?', 'Coffee or tea for the rest of your life?'], ['Café', 'Coffee'], ['Chá', 'Tea']),
  p(['Saber quem fala mal de você pelas costas, ou nunca saber?', 'Know who talks behind your back, or never know?'], ['Quero saber', 'I want to know'], ['Prefiro não saber', 'Rather not know']),
  p(['Casamento: festão para 300 ou cartório e viagem?', 'Wedding: a huge party for 300, or city hall and a trip?'], ['Festão', 'Huge party'], ['Cartório e viagem', 'City hall and trip']),
  p(['Um gato ou um cachorro?', 'A cat or a dog?'], ['Gato', 'Cat'], ['Cachorro', 'Dog']),
  p(['Reviver seu melhor dia ou apagar seu pior dia?', 'Relive your best day or erase your worst day?'], ['Reviver o melhor', 'Relive the best'], ['Apagar o pior', 'Erase the worst']),
  p(['O chefe erra feio numa reunião. Você corrige na frente de todos?', 'Your boss gets it badly wrong in a meeting. Correct them in front of everyone?'], ['Corrijo', 'Correct them'], ['Fico quieto', 'Stay quiet']),
  p(['Férias de um mês por ano ou sexta-feira livre toda semana?', 'A month off once a year, or every Friday off?'], ['Um mês', 'A month'], ['Toda sexta', 'Every Friday']),
  p(['Ter um botão de pausar o tempo ou um de voltar 10 segundos?', 'A button to pause time, or one to rewind 10 seconds?'], ['Pausar', 'Pause'], ['Voltar 10 s', 'Rewind 10 s']),
  p(['Morar numa cidade grande ou numa cidade pequena?', 'Live in a big city or a small town?'], ['Cidade grande', 'Big city'], ['Cidade pequena', 'Small town']),
  p(['Ganhar um prêmio Nobel ou uma medalha de ouro olímpica?', 'Win a Nobel Prize or an Olympic gold medal?'], ['Nobel', 'Nobel'], ['Ouro olímpico', 'Olympic gold']),
  p(['Você veria a gravação de um dia inteiro da sua infância?', 'Would you watch a recording of a whole day of your childhood?'], ['Veria', 'I would'], ['Não veria', 'I wouldn’t']),
  p(['Sorvete no inverno: sim ou não?', 'Ice cream in winter: yes or no?'], ['Sim', 'Yes'], ['Não', 'No']),
  p(['Ser o melhor jogador de um time ruim ou o pior de um time campeão?', 'Be the best player on a bad team or the worst on a champion team?'], ['Melhor do ruim', 'Best of the bad'], ['Pior do campeão', 'Worst of the champs']),
  p(['Mudar de país amanhã com tudo pago, sem poder voltar por 5 anos?', 'Move abroad tomorrow, all paid, unable to return for 5 years?'], ['Vou', 'I go'], ['Fico', 'I stay']),
  p(['Livro ou a adaptação para o cinema?', 'The book or the movie adaptation?'], ['Livro', 'Book'], ['Filme', 'Movie']),
  p(['Uma noite de cassino com R$ 1.000 de ficha: aposta tudo numa mão ou espalha a noite toda?', 'A casino night with $200 in chips: all on one hand or spread across the night?'], ['Tudo numa mão', 'All on one hand'], ['A noite toda', 'All night long']),
];
