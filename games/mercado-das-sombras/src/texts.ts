import type { I18nText } from '@mp/game-sdk';

// Tutorial (TV) and full rules (every phone, showable on the TV), in PT-BR and EN.
// **bold** marks the terms players must spot. No secrets: this ships to every device.

const tx = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export type Demo = 'board' | 'rule' | 'trade' | 'secret' | 'score';

export const SLIDES: { title: I18nText; body: I18nText[]; demo: Demo }[] = [
  {
    title: tx('Como jogar', 'How to play'),
    demo: 'board',
    body: [
      tx(
        'Você começa com **$100.000** e negocia ações de **7 empresas**. Cada ação abre a **$10.000**.',
        'You start with **$100,000** and trade stocks of **7 companies**. Every stock opens at **$10,000**.',
      ),
      tx(
        'São **24 rodadas**. Quem terminar com o maior **patrimônio** (caixa + ações) vence. Cada um por si.',
        'There are **24 rounds**. The biggest **net worth** (cash + shares) at the end wins. Every player for themselves.',
      ),
    ],
  },
  {
    title: tx('Regras ocultas', 'Hidden rules'),
    demo: 'rule',
    body: [
      tx(
        'Cada empresa tem uma **regra de variação** secreta, sorteada na partida. No fim de cada rodada o preço muda conforme ela.',
        'Each company has a secret **price rule**, drawn for this match. At the end of every round its price moves by it.',
      ),
      tx(
        'No início quase tudo está oculto: só **uma palavra** de cada regra aparece. Nas rodadas **5, 10 e 15** surgem mais palavras; na **20**, a regra inteira. O que está em **carmim** aparece no próximo marco.',
        'At the start almost everything is hidden: only **one word** of each rule shows. In rounds **5, 10 and 15** more words appear; at **20**, the whole rule. What is in **crimson** appears at the next milestone.',
      ),
    ],
  },
  {
    title: tx('Comprar e vender', 'Buying and selling'),
    demo: 'trade',
    body: [
      tx(
        'No celular, compre e venda quantas ações quiser **ao preço atual**, enquanto a rodada durar.',
        'On your phone, buy and sell as many shares as you like **at the current price** while the round lasts.',
      ),
      tx(
        'Ninguém vê o que você faz. No fechamento a TV mostra, por empresa, **compras**, **vendas** e o **total em carteira** de todos.',
        'Nobody sees what you do. At the close the TV shows, per company, **buys**, **sells** and everyone’s **total held**.',
      ),
    ],
  },
  {
    title: tx('O Segredo', 'The Secret'),
    demo: 'secret',
    body: [
      tx(
        'Uma vez na partida você pode ativar um **Segredo** numa empresa: nas **2 rodadas seguintes** a cotação, as negociações e o total dela viram **???** para todos — você também.',
        'Once per match you may activate a **Secret** on a company: for the **next 2 rounds** its price, trades and total turn into **???** for everyone — you too.',
      ),
      tx(
        'Ninguém sabe quem ativou. Enquanto houver Segredo, o ranking aparece mas os **patrimônios** ficam ocultos.',
        'Nobody knows who did it. While a Secret is on, the ranking shows but **net worths** are hidden.',
      ),
    ],
  },
  {
    title: tx('A rodada e os pontos', 'The round and the points'),
    demo: 'score',
    body: [
      tx(
        '**1 · Pregão**: negocie no celular até o tempo acabar. **2 · Fechamento**: os preços mudam, a TV mostra o resultado e o ranking.',
        '**1 · Trading**: trade on your phone until time runs out. **2 · Close**: prices move, the TV shows the results and the ranking.',
      ),
      tx(
        'No fim: **$1,5 mi** = 1 ponto, **$3 mi** = 2, **$6 mi** = 3, e o **1º lugar** ganha +1.',
        'At the end: **$1.5M** = 1 point, **$3M** = 2, **$6M** = 3, and **1st place** gets +1.',
      ),
    ],
  },
];

export const RULES: { title: I18nText; body: I18nText[] }[] = [
  {
    title: tx('Visão geral', 'Overview'),
    body: [
      tx(
        'Um jogo de mercado de ações para 3 a 16 pessoas, cada uma por si. O objetivo é terminar as **24 rodadas** com o maior **patrimônio**: seu caixa mais o valor das suas ações.',
        'A stock-market game for 3 to 16 people, every player for themselves. The goal is to finish the **24 rounds** with the biggest **net worth**: your cash plus the value of your shares.',
      ),
      tx(
        'Todos começam com **$100.000** em caixa e nenhuma ação. Há **7 empresas** fictícias, sorteadas a cada partida; toda ação abre a **$10.000** e nunca vale menos de **$100**.',
        'Everyone starts with **$100,000** cash and no shares. There are **7 fictional companies**, drawn each match; every stock opens at **$10,000** and is never worth less than **$100**.',
      ),
    ],
  },
  {
    title: tx('O painel da TV', 'The TV board'),
    body: [
      tx(
        'Cada empresa tem um card com o **gráfico** das cotações, o **preço atual** (▲ subiu, ▼ caiu no último fechamento) e os números da última rodada.',
        'Each company has a card with its price **chart**, the **current price** (▲ rose, ▼ fell at the last close) and the last round’s numbers.',
      ),
      tx(
        '**Total em carteira**: quantas ações dessa empresa todos os jogadores juntos têm. **Compras** e **vendas**: quantas ações foram compradas e vendidas na última rodada, somando todo mundo.',
        '**Total held**: how many shares of that company all players hold together. **Buys** and **sells**: how many shares were bought and sold in the last round, everyone added up.',
      ),
      tx(
        'À direita, o **ranking** com o patrimônio de cada um, atualizado a cada fechamento. Embaixo, uma **faixa rolante** repete o que já se sabe de cada regra. O Host pode ligar a opção de a **tela do Dealer** mostrar só essas dicas, o tempo todo.',
        'On the right, the **ranking** with everyone’s net worth, updated at every close. At the bottom, a **scrolling ticker** repeats what is known of every rule. The Host can turn on the option for the **Dealer screen** to show only those hints, all match long.',
      ),
    ],
  },
  {
    title: tx('Comprar e vender', 'Buying and selling'),
    body: [
      tx(
        'Durante o pregão, toque numa empresa no celular, escolha a quantidade e toque **Comprar** ou **Vender**. A operação é imediata, **ao preço atual**, e ninguém vê.',
        'During trading, tap a company on your phone, pick a quantity and tap **Buy** or **Sell**. It happens at once, **at the current price**, and nobody sees it.',
      ),
      tx(
        'A oferta é ilimitada: o limite é o seu caixa. Não dá para vender ações que você não tem. Comprou errado? Venda na mesma rodada pelo mesmo preço.',
        'Supply is unlimited: your cash is the limit. You can’t sell shares you don’t have. Bought by mistake? Sell in the same round at the same price.',
      ),
      tx(
        'O preço só muda no **fechamento** — mas suas compras e vendas contam para as regras que olham volumes e total em carteira.',
        'Prices only change at the **close** — but your buys and sells count for the rules that look at volumes and total held.',
      ),
    ],
  },
  {
    title: tx('Regras ocultas', 'Hidden rules'),
    body: [
      tx(
        'Cada empresa segue uma **regra de variação** sorteada para a partida. Descobri-la é o jogo: observe os gráficos, os volumes e as palavras que forem aparecendo.',
        'Each company follows a **price rule** drawn for the match. Working it out is the game: watch the charts, the volumes and the words as they appear.',
      ),
      tx(
        'A regra aparece palavra a palavra; cada trecho oculto é um **□□□**, sem pista do tamanho. No início você vê **uma palavra**. No começo das rodadas **5, 10 e 15** passam a aparecer cerca de **¼, ½ e ¾** das palavras; na rodada **20**, tudo. Trechos em **carmim** aparecem no próximo marco. Números e nomes de empresas costumam ficar para o fim.',
        'Rules appear word by word; every hidden stretch is a **□□□**, with no hint of its length. At the start you see **one word**. At the start of rounds **5, 10 and 15** about **¼, ½ and ¾** of the words show; at round **20**, all of it. **Crimson** stretches appear at the next milestone. Numbers and company names tend to come last.',
      ),
      tx(
        '“Nesta rodada” é a rodada que acabou de fechar. Regras com “na rodada seguinte” guardam o efeito para o próximo fechamento. O Host pode ligar **ruído**: uma oscilação extra de ±2% ou ±5% em todo fechamento.',
        '“This round” is the round that just closed. Rules saying “next round” keep the effect for the next close. The Host can turn on **noise**: an extra ±2% or ±5% wobble at every close.',
      ),
    ],
  },
  {
    title: tx('O Segredo', 'The Secret'),
    body: [
      tx(
        'Uma vez na partida, durante o pregão, você pode ativar um **Segredo** numa empresa (dá para trocar ou cancelar até o fechamento). Ele vale nas **2 rodadas seguintes**: ativado na rodada 2, vale nas rodadas 3 e 4.',
        'Once per match, during trading, you may activate a **Secret** on a company (you can change or cancel it until the close). It lasts the **next 2 rounds**: activated in round 2, it covers rounds 3 and 4.',
      ),
      tx(
        'Nesse tempo a **cotação**, as **negociações** e o **total em carteira** dessa empresa viram **???** na TV e em todos os celulares — inclusive no seu. Ninguém sabe quem ativou.',
        'During that time the company’s **price**, **trades** and **total held** turn into **???** on the TV and every phone — yours included. Nobody knows who did it.',
      ),
      tx(
        'Se vários jogadores ativarem na mesma empresa na mesma rodada, o efeito vale uma vez só e **todos** os Segredos são gastos. Enquanto houver Segredo, o ranking continua aparecendo, mas os **patrimônios** ficam ocultos.',
        'If several players activate one on the same company in the same round, it takes effect once and **all** those Secrets are spent. While a Secret is on, the ranking still shows but **net worths** are hidden.',
      ),
      tx(
        'Ainda dá para negociar a empresa oculta **às cegas**, ao preço real. Quem faz isso vê o próprio caixa como **???** até o Segredo acabar. A compra às cegas é limitada pelo **último preço visível**: se o preço real for maior, seu caixa pode ficar negativo. Não é possível ativar Segredo na última rodada.',
        'You can still trade the hidden company **blind**, at the real price. Whoever does sees their own cash as **???** until the Secret ends. A blind buy is capped by the **last visible price**: if the real price is higher, your cash can go negative. You can’t activate a Secret in the last round.',
      ),
    ],
  },
  {
    title: tx('A rodada', 'The round'),
    body: [
      tx(
        '**1 · Pregão**: 5 minutos por padrão (o Host pode mudar). Negocie e, se quiser, ative seu Segredo. A rodada sempre dura o tempo todo.',
        '**1 · Trading**: 5 minutes by default (the Host can change it). Trade and, if you like, activate your Secret. The round always runs its full time.',
      ),
      tx(
        '**2 · Fechamento**: as regras mudam os preços, a TV mostra os novos preços, as compras, vendas e total em carteira da rodada e o ranking. Antes das rodadas 5, 10, 15 e 20, a TV revela novas palavras das regras. Depois a próxima rodada abre sozinha.',
        '**2 · Close**: the rules move the prices; the TV shows the new prices, the round’s buys, sells and total held, and the ranking. Before rounds 5, 10, 15 and 20, the TV reveals more words of the rules. Then the next round opens on its own.',
      ),
    ],
  },
  {
    title: tx('Situações especiais', 'Special situations'),
    body: [
      tx(
        'Quem cair da partida continua com o caixa e as ações; o jogo não espera ninguém. Um Segredo pedido antes de cair ainda vale no fechamento.',
        'Anyone who drops keeps their cash and shares; the game waits for nobody. A Secret asked for before dropping still goes off at the close.',
      ),
      tx(
        'Empate no ranking: a posição é dividida. Um preço nunca cai abaixo de **$100**.',
        'Ties in the ranking share the position. A price never drops below **$100**.',
      ),
    ],
  },
  {
    title: tx('Pontuação e fim', 'Scoring and end'),
    body: [
      tx(
        'O jogo acaba no fechamento da rodada 24; negociações da rodada 24 contam. O patrimônio final é o caixa mais as ações ao último preço.',
        'The game ends at the close of round 24; trades in round 24 count. Final net worth is cash plus shares at the last price.',
      ),
      tx(
        'Pontos no placar da sala: **$1,5 milhão** ou mais = **1 ponto**, **$3 milhões** = **2 pontos**, **$6 milhões** = **3 pontos**. O **1º lugar** ganha **+1** (empatados no 1º, todos ganham).',
        'Points on the room scoreboard: **$1.5 million** or more = **1 point**, **$3 million** = **2 points**, **$6 million** = **3 points**. **1st place** gets **+1** (tied for 1st, all get it).',
      ),
    ],
  },
  {
    title: tx('Créditos', 'Credits'),
    body: [
      tx(
        'Adaptado do jogo “Mystery Stock Market”, do reality show **The Devil’s Plan** (O Jogo do Diabo), 3ª temporada, episódio 4 (Netflix). Nomes, empresas e regras são novos; esta não é uma versão oficial.',
        'Adapted from the “Mystery Stock Market” game in the reality show **The Devil’s Plan**, season 3, episode 4 (Netflix). Names, companies and rules are new; this is not an official version.',
      ),
    ],
  },
];

export const CREDITS: I18nText | null = tx(
  'Inspirado no jogo de mercado de ações do reality The Devil’s Plan (O Jogo do Diabo), T3 E4.',
  'Inspired by the stock-market game in the reality show The Devil’s Plan, S3 E4.',
);
