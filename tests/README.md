# Validação

`python3 tests/online_smoke.py`: login, fichas vazias, criação de investigador,
salvamento, conflito, separação de contas e navegação. Também verifica pausa das
animações, preferência persistida, movimento reduzido e uma rolagem por clique.

`python3 tests/rooms_smoke.py`: dois navegadores com API simulada; criação de sala,
compartilhamento de fichas e rolagens, privacidade dos dados do Mestre, notas,
arraste e teclado, envio/download PDF, limpeza com backup e restauração.
A API simulada usa respostas INSERT HTTP 201 sem corpo, como o PostgREST.
O teste verifica que o upload não é apagado após criar o cartão e que um arquivo
perdido pode ser reenviado sem mudar o cartão.
Os testes exigem Python Playwright e `/usr/bin/chromium`. Não acessam o Supabase
real nem usam dados de jogadores.

`tests/rooms_rls.sql` foi executado em PostgreSQL 16 real. Para repetir, use um
banco de teste vazio, aplique `tests/db_bootstrap.sql`, `supabase/rooms.sql` e
`tests/rooms_rls.sql`, nessa ordem, com `psql -v ON_ERROR_STOP=1`. O bootstrap
simula os schemas auth/storage e os papéis do Supabase e **nunca deve ser usado
em produção**. O teste inclui contas fora da sala, associação por convite,
restrições do papel de Mestre, resumos sem diário, documentos e arquivos
privados. Não substitui validar o Storage e as contas no projeto Supabase real.
