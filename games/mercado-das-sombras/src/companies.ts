import type { I18nText } from '@mp/game-sdk';

// Twenty fictional sectors; every match draws 7 of them and one random name per sector.
// Any resemblance to a real company is unintended.

export interface Sector {
  id: string;
  icon: string;
  names: I18nText[];
}

const n = (pt: string, en: string): I18nText => ({ 'pt-BR': pt, en });

export const SECTORS: Sector[] = [
  { id: 'finance', icon: '🏛️', names: [n('Veludo Finanças', 'Velvet Finance'), n('Áurea Capital', 'Aurea Capital'), n('Banco Meia-Noite', 'Midnight Bank')] },
  { id: 'build', icon: '🏗️', names: [n('Construtora Ônix', 'Onyx Builders'), n('Pilar Firme', 'Steadfast Pillar'), n('Alicerce Noturno', 'Night Foundation')] },
  { id: 'steel', icon: '⚙️', names: [n('Aço Sentinela', 'Sentinel Steel'), n('Forja Carmim', 'Crimson Forge'), n('Siderúrgica Bastião', 'Bastion Steel')] },
  { id: 'show', icon: '🎭', names: [n('Cabaré Luar', 'Moonlight Cabaret'), n('Palco Dourado', 'Golden Stage'), n('Cortina Vermelha', 'Red Curtain')] },
  { id: 'security', icon: '🛡️', names: [n('Cofre Lacrado', 'Sealed Vault'), n('Guarda Noturna', 'Night Watch Security'), n('Fechadura Fina', 'Fine Lock')] },
  { id: 'tech', icon: '💡', names: [n('Engrenagem Tech', 'Cogwheel Tech'), n('Faísca Digital', 'Spark Digital'), n('Lince Sistemas', 'Lynx Systems')] },
  { id: 'electro', icon: '🔌', names: [n('Eletrônicos Eclipse', 'Eclipse Electronics'), n('Circuito Prata', 'Silver Circuit'), n('Válvula Real', 'Royal Valve')] },
  { id: 'oil', icon: '🛢️', names: [n('Petróleo Obsidiana', 'Obsidian Oil'), n('Poço Negro', 'Blackwell Petroleum'), n('Refino Âmbar', 'Amber Refining')] },
  { id: 'pharma', icon: '💊', names: [n('Farma Lírio', 'Lily Pharma'), n('Elixir Nobre', 'Noble Elixir'), n('Botica Esmeralda', 'Emerald Apothecary')] },
  { id: 'air', icon: '✈️', names: [n('Aerovia Corvo', 'Raven Airways'), n('Asas de Seda', 'Silk Wings'), n('Céu Noturno Linhas', 'Night Sky Lines')] },
  { id: 'ship', icon: '🚢', names: [n('Navegação Âncora', 'Anchor Shipping'), n('Maré Alta', 'High Tide Lines'), n('Farol Cargas', 'Lighthouse Cargo')] },
  { id: 'jewel', icon: '💎', names: [n('Joias Safira', 'Sapphire Jewels'), n('Quilate Real', 'Royal Carat'), n('Lapidação Lua', 'Moon Cut')] },
  { id: 'casino', icon: '🎰', names: [n('Roleta Imperial', 'Imperial Roulette'), n('Ficha Dourada', 'Golden Chip'), n('Mesa Verde', 'Green Table Gaming')] },
  { id: 'hotel', icon: '🏨', names: [n('Hotel Carmesim', 'Crimson Hotels'), n('Suíte Real', 'Royal Suite Group'), n('Pousada Lanterna', 'Lantern Inns')] },
  { id: 'telecom', icon: '📡', names: [n('Sinal Fantasma', 'Phantom Signal'), n('Antena Prata', 'Silver Antenna'), n('Eco Telecom', 'Echo Telecom')] },
  { id: 'mining', icon: '⛏️', names: [n('Mineração Veio de Ouro', 'Gold Vein Mining'), n('Rocha Funda', 'Deep Rock'), n('Cobalto Sul', 'Southern Cobalt')] },
  { id: 'agro', icon: '🌾', names: [n('Agro Trigal', 'Wheatfield Agro'), n('Colheita Serena', 'Serene Harvest'), n('Fazenda Orvalho', 'Dew Farms')] },
  { id: 'drinks', icon: '🍷', names: [n('Adega Bordô', 'Bordeaux Cellars'), n('Destilaria Noir', 'Noir Distillery'), n('Champanhe Estrela', 'Star Champagne')] },
  { id: 'fashion', icon: '👗', names: [n('Ateliê Cetim', 'Satin Atelier'), n('Grife Corvina', 'Corvina Couture'), n('Alfaiataria Fina', 'Fine Tailoring')] },
  { id: 'rail', icon: '🚂', names: [n('Ferrovia Expresso', 'Express Railway'), n('Trilho de Ferro', 'Iron Rail'), n('Locomotiva Sul', 'Southern Locomotive')] },
];
