// Troca o build publicado na raiz (index.html, mestre.html, assets/) pelo de dist/.
import { cpSync, rmSync } from 'node:fs';
for (const alvo of ['assets', 'index.html', 'mestre.html']) rmSync(alvo, { recursive: true, force: true });
cpSync('dist', '.', { recursive: true });
rmSync('dist', { recursive: true, force: true });
