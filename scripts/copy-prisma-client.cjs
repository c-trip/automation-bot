// tsc só compila arquivos .ts — os artefatos que `prisma generate` gera em
// src/generated/prisma (client.js, wasm, etc.) são JS/WASM puro e ficam de fora do
// dist/, mesmo com include: ["src/**/*"] no tsconfig. Sem esse passo, `dist/lib/prisma.js`
// tenta `require("../generated/prisma/client")` e quebra em produção com MODULE_NOT_FOUND
// (só funciona em dev porque `tsx` roda direto de src/, onde o client gerado existe).
//
// Roda depois do `tsc` no script "build" do package.json.
const fs = require("node:fs");
const path = require("node:path");

const src = path.join(__dirname, "..", "src", "generated", "prisma");
const dest = path.join(__dirname, "..", "dist", "generated", "prisma");

if (!fs.existsSync(src)) {
  console.warn(
    "[build] src/generated/prisma não existe — rode `prisma generate` (ou `pnpm install`) antes do build."
  );
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[build] Prisma Client copiado para ${path.relative(process.cwd(), dest)}`);
