import type { I18nText } from '@mp/game-sdk';
import * as brinquedos from './brinquedos.ts';
import * as desenhos from './desenhos.ts';
import * as filmes from './filmes.ts';
import * as internet from './internet.ts';
import * as musica from './musica.ts';
import * as natureza from './natureza.ts';
import * as series from './series.ts';
import * as superHerois from './super-herois.ts';
import * as tabuleiro from './tabuleiro.ts';
import * as videogames from './videogames.ts';
import * as animaisSelvagens from './animais-selvagens.ts';
import * as brasil from './brasil.ts';
import * as capitaisDoMundo from './capitais-do-mundo.ts';
import * as climaETempo from './clima-e-tempo.ts';
import * as dinossauros from './dinossauros.ts';
import * as espaco from './espaco.ts';
import * as geografia from './geografia.ts';
import * as ilhas from './ilhas.ts';
import * as insetos from './insetos.ts';
import * as monumentos from './monumentos.ts';
import * as oceanos from './oceanos.ts';
import * as pets from './pets.ts';
import * as plantas from './plantas.ts';
import * as quimica from './quimica.ts';
import * as riosEMontanhas from './rios-e-montanhas.ts';
import * as viagensEAviacao from './viagens-e-aviacao.ts';
import * as basquete from './basquete.ts';
import * as cafeEBebidas from './cafe-e-bebidas.ts';
import * as casa from './casa.ts';
import * as comida from './comida.ts';
import * as copaDoMundo from './copa-do-mundo.ts';
import * as cotidiano from './cotidiano.ts';
import * as curiosidadesNojentas from './curiosidades-nojentas.ts';
import * as curiosidades from './curiosidades.ts';
import * as dinheiro from './dinheiro.ts';
import * as futebol from './futebol.ts';
import * as historia from './historia.ts';
import * as idadeMedia from './idade-media.ts';
import * as invencoes from './invencoes.ts';
import * as moda from './moda.ts';
import * as olimpiadas from './olimpiadas.ts';
import * as patos from './patos.ts';
import * as recordesMundiais from './recordes-mundiais.ts';
import * as sono from './sono.ts';
import * as supermercado from './supermercado.ts';
import * as tecnologia from './tecnologia.ts';

// The question bank. Logic-only: the UI never imports it (it holds every answer).
// To add a category: create `<categoria>.ts` exporting `name` and `rows`, then list it below.

export interface Question {
  text: I18nText;
  answer: number;
  unit: I18nText;
}

export interface Category {
  name: I18nText;
  questions: Question[];
}

const SOURCES = [
  videogames,
  brinquedos,
  tabuleiro,
  internet,
  superHerois,
  desenhos,
  musica,
  series,
  filmes,
  natureza,
  animaisSelvagens,
  brasil,
  capitaisDoMundo,
  climaETempo,
  dinossauros,
  espaco,
  geografia,
  ilhas,
  insetos,
  monumentos,
  oceanos,
  pets,
  plantas,
  quimica,
  riosEMontanhas,
  viagensEAviacao,
  basquete,
  cafeEBebidas,
  casa,
  comida,
  copaDoMundo,
  cotidiano,
  curiosidadesNojentas,
  curiosidades,
  dinheiro,
  futebol,
  historia,
  idadeMedia,
  invencoes,
  moda,
  olimpiadas,
  patos,
  recordesMundiais,
  sono,
  supermercado,
  tecnologia,
];

export const CATEGORIES: Category[] = SOURCES.map((s) => ({
  name: s.name,
  questions: s.rows.map(([pt, en, answer, ptUnit, enUnit]) => ({
    text: { 'pt-BR': pt, en },
    answer,
    unit: { 'pt-BR': ptUnit, en: enUnit },
  })),
}));
