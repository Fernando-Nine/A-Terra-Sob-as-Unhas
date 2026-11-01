# A Terra Sob as Unhas

Fichas dos investigadores para a campanha de horror cósmico **A Terra Sob as Unhas**. Funciona
no navegador, no computador ou no celular, com acesso por e-mail e senha e sem instalar nada.

**Abrir as fichas:** https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/

## Para quem joga

- Entre na sua conta (ou use **Criar conta** no primeiro acesso).
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
   vê os dos outros. **O diário e as anotações não são enviados à mesa.** Ao salvar online, a ficha completa fica na sua conta.

A sala é opcional. Não há senha: quem souber o código vê esses dados. As mensagens passam por
um servidor público e gratuito (broker.emqx.io); rolagens com mais de 6 horas somem da mesa.
**Sair da sala** retira sua ficha da mesa.

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
