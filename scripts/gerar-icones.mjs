// Gera os ícones do PWA a partir de public/icons/logo.svg.
// Uso: npm run icones
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const WOOD = "#3B2A1E";
const svg = await readFile(new URL("../public/icons/logo.svg", import.meta.url));

/** Logo centralizado sobre fundo de madeira; `escala` é a fração ocupada pelo logo. */
async function icone(tamanho, escala, arquivo) {
  const lado = Math.round(tamanho * escala);
  const logo = await sharp(svg, { density: 1200 }).resize(lado, lado).png().toBuffer();
  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: WOOD },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(new URL(`../public/icons/${arquivo}`, import.meta.url).pathname);
  console.log("gerado", arquivo);
}

await icone(192, 0.8, "icon-192.png");
await icone(512, 0.8, "icon-512.png");
// "maskable": o Android recorta as bordas, então o logo fica dentro da zona segura (60%).
await icone(512, 0.6, "icon-maskable-512.png");
await icone(180, 0.8, "apple-touch-icon.png");

// favicon.ico simples (PNG embutido em ICO).
const png = await sharp(svg, { density: 600 }).resize(32, 32).png().toBuffer();
const cab = Buffer.alloc(22);
cab.writeUInt16LE(0, 0);
cab.writeUInt16LE(1, 2);
cab.writeUInt16LE(1, 4);
cab.writeUInt8(32, 6);
cab.writeUInt8(32, 7);
cab.writeUInt16LE(1, 10);
cab.writeUInt16LE(32, 12);
cab.writeUInt32LE(png.length, 14);
cab.writeUInt32LE(22, 18);
await writeFile(new URL("../src/app/favicon.ico", import.meta.url).pathname, Buffer.concat([cab, png]));
console.log("gerado favicon.ico");
