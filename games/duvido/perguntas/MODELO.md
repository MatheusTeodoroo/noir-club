# Videogames

Modelo para enviar perguntas do Duvido!. Um arquivo (ou uma mensagem) por categoria: o título `#` é o
nome da categoria. A tradução para inglês e a conversão para `src/questions/<categoria>.ts` ficam por
conta do Claude.

Regras:

- **Resposta**: número inteiro, sem separador de milhar (`3333360`, não `3.333.360`). Se a resposta real
  tiver casas decimais, troque a unidade para dar inteiro (`2500 metros` em vez de `2,5 km`).
- **Unidade**: como aparece na TV ("responda em kg"). Em minúsculas, no plural quando couber.
- **Pergunta**: curta, sem a unidade no texto (ela aparece embaixo).

| # | Pergunta | Resposta | Unidade |
| --- | --- | --- | --- |
| 1 | Estrelas em Super Mario 64 | 120 | estrelas |
| 2 | Peso do Snorlax segundo a Pokédex | 460 | kg |
| 3 | Ano de lançamento de Tetris | 1984 | ano |
