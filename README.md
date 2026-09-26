# A Terra Sob as Unhas

Ficha de personagem para cada pessoa montar do seu jeito, com dados na própria ficha e uma
sala em tempo real: todos veem o status da mesa e as rolagens, e o mestre vê a ficha inteira
de cada um.

- **Ficha:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/
- **Painel do mestre:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/mestre.html

## Montando a ficha

A ficha abre em branco, no modo de edição. Dê um nome à personagem e escolha as seções:

| Seção          | Para quê                                                      |
|----------------|---------------------------------------------------------------|
| Status         | PV, PM e SAN prontos, com máximo, barra e botões − e +         |
| Atributos      | FOR, DES, INT… com metade e quinto                             |
| Perícias       | lista com valor, metade/quinto e o dado para rolar             |
| Lista de itens | equipamento, com quantidade                                    |
| Texto          | segredos, histórico, anotações                                 |
| Marcadores     | trilhas de caixinhas (sanidade, ferimentos, o que for)         |
| Campos         | pares nome/valor livres (ocupação, idade, jogador…)            |

No modo de edição tudo pode ser renomeado, recolorido, duplicado, excluído e arrastado pela
alça ⠿ (inclusive de uma seção para outra do mesmo tipo). **Desfazer** (ou Ctrl+Z) volta as
mudanças de estrutura. Toque em **Concluir** para jogar.

## Jogando

- O **d20** ao lado de cada perícia (e no canto dos atributos) rola 1d100 no estilo Chamado de
  Cthulhu 7ª edição: Crítico, Extremo (≤ ⅕), Difícil (≤ ½), Sucesso, Falha, Desastre.
- **Penalidade / Bônus** rola duas dezenas e fica com a pior ou a melhor.
- O campo ao lado de **Rolar** aceita qualquer expressão: `1d6`, `2d6+1`, `1d8+1d4-1`.
- O botão de **histórico** abre uma janela flutuante com as rolagens da mesa. Ela pode ser
  arrastada pela barra de título (ou movida com as setas do teclado) e lembra onde ficou.

## A sala

1. O mestre abre o **painel do mestre** e toca em **Criar sala nova**. Sai um código, tipo
   `K7PX2M`, e um link.
2. Os jogadores abrem o link, ou tocam em **Sala** na ficha e digitam o código.
3. Todos veem a **Mesa**: quem está na sala, online ou não, com PV, PM, SAN (qualquer atributo
   com máximo) e marcadores. No computador ela fica ao lado da ficha; no celular, no botão de
   pessoas do topo.
4. Todos veem o **histórico** de rolagens, inclusive as do mestre.
5. O mestre vê, além disso, a **ficha inteira** de cada jogador, atualizando ao vivo.

O histórico é leve de propósito: guarda só as últimas 8 rolagens de cada pessoa, e rolagens
com mais de 6 horas somem. **Sair da sala** apaga da sala a ficha, o status e as rolagens de
quem saiu. Fechar a aba só marca a pessoa como offline.

**Como funciona por baixo:** o GitHub Pages só serve arquivos, então as mensagens passam por
um broker MQTT público e gratuito (`broker.emqx.io`). Não precisa de conta nem de servidor
próprio. Em troca, não há senha: quem souber o código da sala consegue ver o que passa nela.
Não coloque nada sensível na ficha. Para usar outro broker, acrescente
`?broker=wss://endereco/mqtt` ao link (o link do painel do mestre já leva o parâmetro).

## Onde a ficha fica salva

Neste navegador, neste aparelho: cada pessoa tem a sua. No menu **⋮**:
**Exportar ficha** baixa um `.json`, **Importar ficha** abre esse arquivo em outro aparelho, e
**Começar ficha em branco** zera tudo (e pode ser desfeito). Fichas das versões anteriores
continuam abrindo.

## Desenvolvimento

React 19 + Tailwind CSS 4, com Vite. Arrastar e soltar com dnd-kit, ícones Lucide, sala com
MQTT.js (carregado só quando a pessoa entra numa sala).

```
npm install
npm run dev      # servidor local com recarga automática
npm run build    # gera index.html, mestre.html e assets/ na raiz (o que o Pages serve)
```

```
fonte/
  index.html, mestre.html     entradas das duas páginas
  src/
    PaginaFicha.jsx           página do jogador
    PaginaMestre.jsx          painel do mestre
    componentes/              ficha editável, mesa, histórico, barra de dados, sala…
    secoes/Secoes.jsx         o corpo de cada tipo de seção
    lib/modelo.js             formato da ficha (compatível com as versões anteriores)
    lib/dados.js              d100 e expressões de dados
    lib/sala.js               conexão da sala (tópicos MQTT)
    index.css                 tema: cores, fontes, modo escuro
scripts/publicar.js           copia o build de dist/ para a raiz
```

Depois de mexer em `fonte/`, rode `npm run build` e faça commit do resultado junto.
