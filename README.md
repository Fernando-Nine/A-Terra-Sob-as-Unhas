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
- Vida, Sanidade e Raiz mudam só quando o Mestre mandar.
- O diário guarda pistas, equipamentos e anotações.

**A ficha fica salva só no navegador que você usou.** Para levar a outro aparelho ou mandar ao
Mestre, use **Exportar ficha** e depois **Importar ficha** do outro lado. Nada é sincronizado
automaticamente.

## Para quem mantém o site

Site estático, sem dependências: HTML, CSS e JavaScript puros.

```
src/jogadores.html   modelo da página (com /*CSS_INLINE*/ e /*JS_INLINE*/)
src/jogadores.js     fichas, PP, rolagens, diário, exportar/importar
src/style.css        estilos (compartilhados com o escudo do Mestre)
build.py             junta tudo em site/index.html
site/index.html      página pronta, publicada pelo GitHub Pages
index.html           redireciona a raiz do site para site/
```

Depois de editar `src/`, rode `python build.py` e faça commit do `site/index.html` gerado.

**O escudo do Mestre não está neste repositório, de propósito.** Ele tem os segredos da
campanha e fica só no computador do Mestre. Se você colocar `src/escudo_mestre.html` e
`src/mestre.js` nesta pasta, o `build.py` também gera `site/escudo_mestre.html` para uso local,
e o `.gitignore` impede que esses arquivos sejam enviados ao GitHub.

A versão anterior do site (ficha livre em React, com sala ao vivo) está guardada na branch
`versao-react-v2`.
