# CLAUDE.md — Instruções do projeto

Você está trabalhando no projeto **A TERRA SOB AS UNHAS**, um site estático e offline para um RPG de horror cósmico investigativo ambientado no Brasil (Brasília e região do Alto Rio Negro, 2026).

**Este repositório é público e contém apenas a página dos jogadores.** O escudo do Mestre (`src/escudo_mestre.html`, `src/mestre.js`, `site/escudo_mestre.html`), o roteiro da campanha e os segredos ficam somente no computador do Mestre. Nunca crie, recrie ou commite esses arquivos aqui, nem escreva neste repositório informações do roteiro, NPCs ou segredos. O `.gitignore` bloqueia os nomes conhecidos.

## Objetivo e restrições

- Continue a implementação existente. **Não substitua a lógica nem redesenhe tudo sem pedido explícito.**
- Preservar português brasileiro, estética de horror investigativo e bom funcionamento em desktop/celular.
- Dois ambientes distintos: `site/index.html` para jogadores (publicado); `site/escudo_mestre.html` para o Mestre (só local).
- Não revelar spoilers do Mestre na página dos jogadores, no JavaScript dos jogadores ou em arquivos publicados com ela.
- As fichas ficam salvas localmente. A **sala ao vivo** (`src/sala.js`) é opcional e honesta sobre o que é: um broker MQTT público (broker.emqx.io), sem conta e **sem senha** — quem souber o código lê o que passa. Por isso só trafega o resumo de UM investigador escolhido pelo jogador (identidade, Vida, Sanidade, Raiz, níveis, PP) e as últimas 8 rolagens dele. Diário e anotações nunca saem do navegador; o escudo só escuta e nunca publica. Não descrever isso como login ou proteção. Para autenticação real, propor um backend com consentimento do usuário.
- Priorizar segurança ao importar JSON e exibir textos do usuário (não inserir HTML sem escape), manter backups por exportação.

## Regra de jogo vigente (HOME BREW)

- 7 habilidades: **Eloquência, Força, Medicina, Ocultismo, Psicologia, Visão, Investigação**.
- Cada habilidade tem nível de 0 a 5 e pode receber PP livremente, sem restrição de profissão.
- Cada personagem tem **10 PP iniciais**. Custo de aumentar o nível atual `n` para `n+1`: `n+1` PP. Assim 0→1 custa 1, 1→2 custa 2, ..., 4→5 custa 5.
- Testes usam **2D6 + nível da habilidade + modificador situacional do Mestre (-3 a +3)**. Dificuldade normal 9, difícil 12, extrema 15.
- **6+6 é sucesso crítico** e **1+1 é falha crítica**, independentemente do total, segundo a implementação atual.
- Vida inicial 6, Sanidade inicial 10, Raiz inicial 1 para Bispo, Wiiz, Goudl e Nine. Valores de Vida e Sanidade pertencem à adaptação caseira e não às fichas originais em D100.
- O sistema de Raiz se inspira na campanha original; a antiga checagem de POD não foi convertida definitivamente.
- Registrar rolagens no histórico do personagem; recursos e notas editáveis.
- Se precisar mudar as regras de jogo, peça confirmação antes de alterar a matemática básica.

## O que os jogadores já sabem

- Investigadores: Bispo (detetive particular), Wiiz (médico), Goudl (arquivista), Nine (jornalista).
- Ao fim do Ato I, todos sobreviveram, começaram o Ato II com 1 Raiz e decidiram investigar o sítio do falecido Prof. Eduardo Nogueira Prado.
- Conhecem o nome **Ka'a-Po'a** e parte da ligação com a floresta, mas não compreendem a entidade.
- A continuidade completa da campanha está no CLAUDE.md do Mestre, guardado junto com o escudo. Não peça nem reconstrua esse conteúdo aqui.

## Estrutura de código

- `src/jogadores.html` usa `/*CSS_INLINE*/` e `/*JS_INLINE*/` como placeholders.
- `src/style.css` e `src/jogadores.js` possuem o estilo e a lógica da página dos jogadores. O `style.css` é compartilhado com o escudo.
- `src/sala.js` é a sala ao vivo, compartilhada pela página dos jogadores e pelo escudo. Valida tudo que chega da rede (`limparFicha`, `limparRolagens`) e confere o código da sala em cada mensagem. A biblioteca MQTT (`site/vendor/mqtt.min.js`, MIT) só é baixada quando alguém entra numa sala, com verificação de integridade (SRI); se trocar o arquivo, recalcule o hash `LIB_SRI`.
- Quem entra pela sala por link não compartilha nada até tocar no próprio investigador (senão a ficha selecionada por padrão iria para a mesa).
- `build.py` junta `sala.js` + o JS da página e gera `site/index.html` autocontido. Se os arquivos do escudo estiverem na pasta (só no computador do Mestre), gera também `site/escudo_mestre.html`, que o `.gitignore` mantém fora do repositório.
- `index.html` na raiz só redireciona para `site/`, porque o GitHub Pages serve a raiz da branch `gh-pages`.
- Depois de editar `src/`, rode `python build.py` e commite o `site/index.html` gerado junto.
- Antes de entregar melhorias, testar PP, dados (aba e rolagem rápida), save/load local, exportação/importação JSON, sala ao vivo (dois jogadores + escudo), responsividade (botões de toque com 44px) e confidencialidade (nada do escudo na página dos jogadores nem na sala).

## Ao receber novas tarefas

Explique a mudança proposta, faça alterações reais nos arquivos, descreva quais arquivos foram alterados e forneça uma versão que o usuário possa testar.
