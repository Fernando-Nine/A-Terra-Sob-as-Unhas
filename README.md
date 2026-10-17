# A Terra Sob as Unhas

Fichas dos investigadores para a campanha de horror cósmico **A Terra Sob as Unhas**. Funciona
no navegador, no computador ou no celular, sem conta e sem instalar nada.

**Abrir as fichas:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/

## Para quem joga

- Escolha seu investigador (Bispo, Wiiz, Goudl ou Nine) ou crie um novo.
- Distribua seus **10 PP** entre as sete habilidades: Eloquência, Força, Medicina, Ocultismo,
  Psicologia, Visão e Investigação. Subir do nível *n* para *n+1* custa *n+1* PP.
- Para testar, role **2D6 + nível da habilidade + modificador do Mestre** contra 9 (normal),
  12 (difícil) ou 15 (extremo). 6+6 é sucesso crítico; 1+1 é falha crítica.
- O dado ⚄ ao lado de cada habilidade abre a rolagem: escolha a dificuldade que o Mestre
  pediu e a circunstância, e role.
- Vida, Sanidade e Raiz mudam só quando o Mestre mandar (o máximo de Vida e Sanidade também
  pode ser ajustado).
- O diário guarda pistas, equipamentos e anotações.

## Mesa (sala ao vivo)

1. O Mestre cria a sala no escudo e passa o link (ou o código).
2. Você abre o link, ou digita o código na aba **Mesa**, e toca no seu investigador.
3. A mesa passa a ver seu nome, Vida, Sanidade, Raiz, níveis e suas últimas rolagens, e você
   vê os dos outros. **O diário e as anotações nunca saem do seu navegador.**

A sala é opcional. Não há senha: quem souber o código vê esses dados. As mensagens passam por
um servidor público e gratuito (broker.emqx.io); rolagens com mais de 6 horas somem da mesa.
**Sair da sala** retira sua ficha da mesa.

**A ficha fica salva só no navegador que você usou.** Para levar a outro aparelho, use
**Exportar ficha** e depois **Importar ficha** do outro lado. Fora da sala, nada é enviado.

## Para quem mantém o site

Site estático, sem dependências: HTML, CSS e JavaScript puros.

```
src/jogadores.html   modelo da página (com /*CSS_INLINE*/ e /*JS_INLINE*/)
src/jogadores.js     fichas, PP, rolagens, diário, exportar/importar, aba Mesa
src/sala.js          sala ao vivo (compartilhada com o escudo do Mestre)
src/style.css        estilos (compartilhados com o escudo do Mestre)
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
