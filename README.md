# A Terra Sob as Unhas

Ficha de personagem editável, feita para jogar direto no navegador (computador ou celular).

**Abrir a ficha:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/

## Como usar

**Jogando**
- Toque em **d%** numa perícia, ou no nome sublinhado de um atributo, para rolar 1d100.
  O resultado sai na barra de baixo: Crítico, Sucesso extremo (≤ ⅕), Sucesso difícil (≤ ½),
  Sucesso, Falha ou Desastre, no estilo de Chamado de Cthulhu 7ª edição.
- **Penalidade / Bônus** rola duas dezenas e fica com a pior ou a melhor.
- O campo ao lado de **Rolar** aceita qualquer expressão: `1d6`, `2d6+1`, `1d8+1d4-1`.
- PV, PM e SAN têm botões − e + e um valor máximo.
- A caixinha antes de cada perícia marca que ela foi usada com sucesso (para a evolução).
- Itens do equipamento podem ser adicionados e removidos a qualquer momento.

**Editando** (botão **Editar ficha**, no topo)
- Arraste pela alça ⠿ para mudar a ordem de seções e itens. Dá para arrastar um item de uma
  seção para outra do mesmo tipo (uma perícia para outra lista de perícias, um atributo para
  outro bloco de atributos).
- Renomeie, recolora (verde, rosa ou sem cor), duplique ou exclua qualquer seção.
- Adicione seções novas: atributos, perícias, lista de itens, texto, marcadores ou campos.
- O botão de ajustes em cada atributo liga ou desliga metade/quinto, a rolagem, o valor
  máximo e o valor em texto (para coisas como Dano B. `+1d4`).
- Errou? **Desfazer** (ou Ctrl+Z) volta as mudanças de estrutura.

## Onde a ficha fica salva

A ficha salva sozinha **neste navegador, neste aparelho**. Outro celular ou outro navegador
abre a ficha original. Para levar a sua de um lugar para outro, ou guardar uma cópia de
segurança:

- **Arquivo › Exportar ficha** baixa um arquivo `.json`.
- **Arquivo › Importar ficha** abre esse arquivo em qualquer aparelho.
- **Arquivo › Restaurar ficha original** volta ao começo (e também pode ser desfeito).

## Arquivos

```
index.html            a página
estilo.css            aparência (claro e escuro, segue o sistema)
ficha.js              toda a lógica; a ficha original está em fichaOriginal()
vendor/Sortable.min.js  arrastar e soltar (SortableJS 1.15.6, licença MIT)
```

Não tem build nem dependência para instalar: é abrir o `index.html`.
