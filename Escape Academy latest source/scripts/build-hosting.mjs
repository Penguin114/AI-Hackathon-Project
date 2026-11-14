import { build } from "esbuild";
import { readdir, readFile, mkdir, copyFile } from "node:fs/promises";
import { extname, join } from "node:path";

const assets = {};
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".webp":"image/webp", ".woff2":"font/woff2", ".ico":"image/x-icon", ".svg":"image/svg+xml" };
async function add(file, route) {
  const type = types[extname(file)];
  if (type) assets[route] = [type, (await readFile(file)).toString("base64")];
}
async function scan(directory, prefix) {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const file = join(directory,entry.name);
    const route = prefix + "/" + entry.name;
    if (entry.isDirectory()) await scan(file,route);
    else await add(file,route);
  }
}
await add(".next/server/app/index.html","/");
await scan(".next/static","/_next/static");
await scan("public","");
await build({
  entryPoints:["hosting/worker.ts"], outfile:"dist/server/index.js", bundle:true,
  target:"es2022", platform:"browser", format:"esm", minify:true,
  plugins:[{name:"next-static-assets", setup(compiler) {
    compiler.onResolve({filter:/^academy-assets$/},()=>({path:"academy-assets",namespace:"academy"}));
    compiler.onLoad({filter:/.*/,namespace:"academy"},()=>({contents:JSON.stringify(assets),loader:"json"}));
  }}],
});
await mkdir("dist/.openai",{recursive:true});
await copyFile(".openai/hosting.json","dist/.openai/hosting.json");