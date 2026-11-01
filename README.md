# A Terra Sob as Unhas

Fichas dos investigadores para a campanha de horror cósmico **A Terra Sob as Unhas**. Funciona
no navegador, no computador ou no celular, com acesso por e-mail e senha e sem instalar nada.

**Abrir as fichas:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/

## Para quem joga

- Entre na sua conta (ou use **Criar conta** no primeiro acesso).
- A página **Início** apresenta o sistema. Use as categorias no topo para abrir
  **Fichas**, **Dados**, **Mesa**, **Diário** ou **Como jogar**.
- Use **Animações** no topo para ativar ou pausar os efeitos. A preferência de
  movimento reduzido do aparelho é respeitada.
- A seção Fichas começa vazia: crie seu investigador ou importe um arquivo.
- Distribua seus **10 PP** entre as sete habilidades: Eloquência, Força, Medicina, Ocultismo,
  Psicologia, Visão e Investigação. Subir do nível *n* para *n+1* custa *n+1* PP.
- Para testar, role **2D6 + nível da habilidade + modificador do Mestre** contra 9 (normal),
  12 (difícil) ou 15 (extremo). 6+6 é sucesso crítico; 1+1 é falha crítica.
- O dado ⚄ ao lado de cada habilidade abre a rolagem: escolha a dificuldade que o Mestre
  pediu e a circunstância, e role.
- Vida, Sanidade e Raiz mudam só quando o Mestre mandar (o máximo de Vida e Sanidade também
  pode ser ajustado).
- O diário guarda pistas, equipamentos e anotações.

## Mesa e documentos

1. O Mestre usa **Mesa → Criar como Mestre** e passa o código ou convite.
2. Os jogadores entram com suas contas e usam **Compartilhar ficha atual**.
3. Em **Painel da mesa**, todos veem os resumos das fichas e as rolagens públicas.
   Diário e anotações privadas não entram no resumo.
4. O criador da sala tem **Dados privados do Mestre**. Esses resultados ficam
   apenas no navegador dele e nunca são enviados à sala ou ao banco.
5. Em **Documentos e mural**, os participantes criam notas e enviam imagens ou
   PDFs de até 10 MB. Cartões podem ser arrastados ou movidos com as setas.
   Use **Visualizar** para ampliar imagens ou abrir PDFs; se o navegador não
   exibir PDFs, use **Baixar arquivo**.

As salas e os documentos usam Supabase e exigem executar
[`supabase/rooms.sql`](supabase/rooms.sql) uma vez no SQL Editor. O convite permite
que uma pessoa autenticada entre na sala. Somente os participantes acessam os
resumos, rolagens públicas e arquivos. A atualização acontece a cada 4 segundos.
A sala antiga por MQTT não é usada pela nova interface; seu transporte permanece
no repositório para compatibilidade com o escudo local anterior.

**Limpar todas as minhas fichas**, na seção Fichas, baixa um backup JSON e guarda
uma cópia local antes de excluir as fichas locais e online da conta conectada.
O backup pode ser restaurado em **Importar ficha**. As contas de outros jogadores
não são afetadas. As fichas de exemplo deixaram de ser criadas automaticamente.

**Por padrão, a ficha fica salva no navegador que você usou.** Com o salvamento online
ativado, entre na sua conta e abra a ficha em outro aparelho. Você também pode usar
**Exportar ficha** e depois **Importar ficha** do outro lado. Fora da sala, dados só são enviados se você usar o salvamento online.

## Para quem mantém o site

Site estático, sem dependências de build: HTML, CSS e JavaScript puros.

O salvamento online opcional usa Supabase, com login por e-mail e senha.
Veja [como ativar e testar](supabase/README.md). O acesso à página das fichas exige
uma sessão válida no Supabase; sem configuração ou conexão, a tela de entrada permanece.

```
src/jogadores.html   modelo da página (com /*CSS_INLINE*/ e /*JS_INLINE*/)
src/jogadores.js     fichas, PP, rolagens, diário, exportar/importar, aba Mesa
src/sala.js          sala ao vivo (compartilhada com o escudo do Mestre)
src/style.css        estilos base (compartilhados com o escudo do Mestre)
src/interface.css    identidade visual, animações e movimento reduzido
src/effects.js       efeitos visuais, rolagens animadas e preferência de movimento
build.py             junta tudo em site/index.html
site/index.html      página pronta, publicada pelo GitHub Pages
site/vendor/         MQTT.js 5.16.0 (MIT), baixado só por quem entra numa sala
index.html           redireciona a raiz do site para site/
```

Depois de editar `src/`, rode `python build.py` e faça commit do `site/index.html` gerado.

**O escudo do Mestre não está neste repositório, de propósito.** Ele tem os segredos da
campanha e fica só no computador do Mestre. Se você colocar `src/escudo_mestre.html` e
`src/mestre.js` nesta pasta, o `build.py` também gera `site/escudo_mestre.html` para uso local,
e o `.gitignore` impede que esses arquivos sejam enviados ao GitHub.

A versão anterior do site (ficha livre em React, com sala ao vivo) está guardada na branch
`versao-react-v2`.
