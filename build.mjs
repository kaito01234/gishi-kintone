import * as esbuild from "esbuild";
import sharp from "sharp";
import { cpSync, rmSync, readFileSync, writeFileSync } from "fs";

const dev = process.argv.includes("--dev");

/** @type {import("esbuild").BuildOptions} */
const common = {
  bundle: true,
  minify: !dev,
  sourcemap: dev ? "inline" : false,
  target: "chrome120",
  logLevel: "info",
  loader: { ".svg": "text" },
};

const entryPoints = [
  { in: "src/content.ts", out: "content" },
  { in: "src/kintone-bridge.ts", out: "kintone-bridge" },
  { in: "src/background.ts", out: "background" },
  { in: "src/options.ts", out: "options" },
  { in: "src/popup.ts", out: "popup" },
];

// dist を一旦クリア
rmSync("dist", { recursive: true, force: true });

// static/ → dist/ にコピー
cpSync("static", "dist", { recursive: true });

// SVG → PNG アイコン生成
const iconSvg = readFileSync("static/icons/icon.svg");
for (const size of [16, 48, 128]) {
  await sharp(iconSvg).resize(size, size).png().toFile(`dist/icons/icon${size}.png`);
}
console.log("Generated icons: 16, 48, 128");

// dev モード: manifest.json の matches に localhost を追加
if (dev) {
  const manifestPath = "dist/manifest.json";
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  for (const cs of manifest.content_scripts) {
    if (!cs.matches.includes("http://localhost/k/*")) {
      cs.matches.push("http://localhost/k/*");
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

await esbuild.build({
  ...common,
  entryPoints: entryPoints.map((e) => e.in),
  outdir: "dist",
  entryNames: "[name]",
});
