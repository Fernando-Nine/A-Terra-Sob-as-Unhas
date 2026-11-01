# Ativar fichas online

O site continua no GitHub Pages. O Supabase fornece login por e-mail e banco de
dados. Sem essa configuração, as fichas continuam funcionando localmente.

1. Crie um projeto em https://supabase.com e execute `schema.sql` no SQL Editor.
   A política RLS permite que cada conta consulte e altere apenas suas fichas.
2. Em **Authentication → Sign In / Providers → Email** (em algumas versões,
   **Authentication → Providers → Email**), mantenha **Enable Email provider**
   ativado e desative **Confirm email** / **Confirm email address**. Clique em
   **Save**. Se houver bloqueio de cadastros, habilite **Allow new users to sign up**
   em **Authentication → Sign In / Providers → User Signups**. Configure também
   a URL do site como `https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/`.
   Não precisa configurar SMTP nem os modelos de e-mail para este fluxo.
   Sem confirmação, o endereço informado não é verificado: cada conta continua
   protegida pela senha e pelas políticas RLS. A recuperação de senha por e-mail
   não está disponível sem um serviço de envio; os jogadores precisam guardar
   suas senhas. Contas criadas antes de desativar a confirmação podem continuar
   não confirmadas; revise-as em Authentication → Users, sem apagar usuários
   com fichas salvas. Desativar a opção não garante confirmar contas antigas.
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

No primeiro acesso, preencha e-mail e senha (pelo menos 8 caracteres) e clique
em **Criar conta**. Nos próximos acessos, use **Entrar**. Escolha uma ficha local e use
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
falha de rede e saída. Não envia e-mails nem acessa um banco real. Testa cadastro, senha incorreta e
cadastro que ainda exige confirmação, além do fluxo de fichas.
