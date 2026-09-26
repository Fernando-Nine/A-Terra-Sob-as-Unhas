# A Terra Sob as Unhas

Ficha de personagem em branco, para cada pessoa montar a sua, e uma sala onde o mestre vê
as fichas e as rolagens de todo mundo em tempo real. Funciona no navegador, no computador
ou no celular.

- **Ficha:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/
- **Painel do mestre:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/mestre.html

## Montando a ficha

A ficha abre vazia e já no modo de edição. Dê um nome à personagem e adicione as seções:

| Seção            | Para quê                                                        |
|------------------|-----------------------------------------------------------------|
| Atributos        | FOR, DES, PV… com metade/quinto, rolagem e máximo com − e +     |
| Perícias         | lista com valor, metade/quinto, d% e marca de evolução          |
| Lista de itens   | equipamento, com quantidade                                     |
| Texto            | segredos, histórico, anotações                                  |
| Marcadores       | trilhas de caixinhas (sanidade, ferimentos, o que for)          |
| Campos           | pares nome/valor livres (ocupação, jogador, idade…)             |

Tudo pode ser renomeado, recolorido, duplicado, excluído e arrastado pela alça ⠿, inclusive
de uma seção para outra do mesmo tipo. **Desfazer** (ou Ctrl+Z) volta as mudanças de estrutura.
Quando terminar, toque em **Concluir**.

## Jogando

- **d%** numa perícia, ou o nome sublinhado de um atributo, rola 1d100 no estilo Chamado de
  Cthulhu 7ª edição: Crítico, Extremo (≤ ⅕), Difícil (≤ ½), Sucesso, Falha, Desastre.
- **Penalidade / Bônus** rola duas dezenas e fica com a pior ou a melhor.
- O campo ao lado de **Rolar** aceita qualquer expressão: `1d6`, `2d6+1`, `1d8+1d4-1`.

## A sala

1. O mestre abre o **painel do mestre** e toca em **Criar sala**. Sai um código, tipo `K7PX2M`,
   e um link.
2. Os jogadores abrem o link, ou tocam em **Sala** na ficha e digitam o código.
3. O painel mostra a ficha de cada jogador mudando enquanto ele joga, se ele está online, e um
   feed com todas as rolagens.

Detalhes:
- O mestre pode entrar depois dos jogadores: as fichas já estão lá.
- A ficha continua na sala se o jogador fechar a aba (aparece como offline). **Sair da sala**
  tira a ficha do painel.
- Recarregar a página mantém o jogador na sala.

**Como funciona por baixo:** o GitHub Pages só serve arquivos, então as mensagens passam por
um broker MQTT público e gratuito (`broker.emqx.io`). Não precisa de conta nem de servidor
próprio. Em troca, não há senha: quem souber o código da sala consegue ver as fichas dela.
Não coloque nada sensível na ficha. Para usar outro broker, acrescente
`?broker=wss://endereco/mqtt` ao link (o mestre e os jogadores precisam usar o mesmo; o link
do painel já leva o parâmetro).

## Onde a ficha fica salva

Neste navegador, neste aparelho. Para levar para outro lugar ou guardar uma cópia:
**Arquivo › Exportar ficha** baixa um `.json`, e **Importar ficha** abre esse arquivo em
qualquer aparelho. **Começar ficha em branco** zera tudo (e pode ser desfeito).

## Arquivos

```
index.html, ficha.js    a ficha do jogador
mestre.html, mestre.js  o painel do mestre
sala.js                 conexão da sala (tópicos MQTT, código, identidade do jogador)
estilo.css              aparência (claro e escuro, segue o sistema)
vendor/                 SortableJS 1.15.6 (arrastar) e MQTT.js 5.16.0 (sala), ambos MIT
```

Não tem build nem dependência para instalar.
