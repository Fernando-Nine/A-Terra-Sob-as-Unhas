# Ativar fichas online

O site continua no GitHub Pages. O Supabase fornece login por e-mail e banco de
dados. Sem essa configuração, as fichas continuam funcionando localmente.

1. Crie um projeto em https://supabase.com e execute `schema.sql` no SQL Editor.
   A política RLS permite que cada conta consulte e altere apenas suas fichas.
2. Em Authentication, habilite o provedor Email e a criação de usuários. No modelo
   de e-mail **Magic Link**, inclua `{{ .Token }}` para enviar o código de acesso
   em vez de depender de um link. O site usa código de 6 a 8 dígitos. Configure
   também a URL do site como `https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/`.
   Para uso com jogadores, configure um provedor SMTP: o envio padrão do Supabase
   possui restrições de destinatários e limites que podem impedir esses logins.
3. Copie a Project URL e a chave **publishable** (ou a chave legada **anon**) em
   `src/online-config.js`. Essas duas configurações são públicas. **Nunca use uma
   chave secret ou service_role**, pois ela permite ignorar as políticas do banco.
4. Rode `python3 build.py` e publique a alteração na branch usada pelo Pages.
   Não é necessário instalar pacotes no site.
5. Com duas contas reais, confira: A salva uma ficha; A abre em outro navegador;
   B não consegue consultar nem alterar a ficha de A via API, mesmo conhecendo
   seu ID. Teste também login, saída, indisponibilidade da rede e edição em dois
   aparelhos. Esses testes reais dependem do projeto configurado e não são
   substituídos pelos testes locais com API simulada.

## Fluxo do jogador

Entre com seu e-mail e digite o código recebido. Escolha uma ficha local e use
**Salvar ficha atual como nova ficha online**. Esse envio é explícito e inclui
diário e anotações privadas; a sala MQTT continua recebendo apenas o resumo.
Em outro aparelho, entre com o mesmo e-mail e abra a ficha da lista. Depois de
aberta, as alterações são enviadas automaticamente. Após recarregar o site,
abra a ficha da lista novamente para retomar o vínculo com a versão online.

Se a conexão falhar, a cópia local permanece: tente **Salvar alterações agora**.
Se outro aparelho tiver alterado a mesma ficha, o salvamento é interrompido para
evitar sobrescrever essa alteração. Exporte a cópia local antes de reabrir a
versão online e concilie as mudanças. Não há edição colaborativa simultânea.

**Sair da conta** encerra a sessão online e o vínculo de salvamento. Não remove
as cópias locais: em um aparelho compartilhado, exporte o que precisar e remova
as fichas locais também. As sessões online são guardadas em sessionStorage,
por aba; fechar a aba exige um novo login. A exclusão de uma ficha na interface
atual remove apenas a cópia local; não apaga o backup online.

## Verificação local

`python3 tests/online_smoke.py` usa Playwright e Chromium instalados no ambiente
de desenvolvimento, sem dependências adicionadas ao aplicativo. Simula a API
para testar login, envio, leitura em outro navegador, salvamento, conflito,
falha de rede e saída. Não envia e-mails nem acessa um banco real.
