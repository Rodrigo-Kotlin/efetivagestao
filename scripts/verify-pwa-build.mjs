import { access, readFile } from "node:fs/promises";

const requiredFiles = ["dist/manifest.webmanifest", "dist/registerSW.js", "dist/sw.js"];

await Promise.all(requiredFiles.map((file) => access(file)));

const [html, manifestSource, registration, serviceWorker] = await Promise.all([
  readFile("dist/index.html", "utf8"),
  readFile("dist/manifest.webmanifest", "utf8"),
  readFile("dist/registerSW.js", "utf8"),
  readFile("dist/sw.js", "utf8"),
]);

if (!html.includes('href="/manifest.webmanifest"') || !html.includes('src="/registerSW.js"')) {
  throw new Error("PWA manifest or service-worker registration is missing from dist/index.html");
}

const manifest = JSON.parse(manifestSource);
if (manifest.name !== "Efetiva Gestão" || !registration.includes("serviceWorker.register('/sw.js'")) {
  throw new Error("PWA manifest or service-worker registration is invalid");
}

if (serviceWorker.includes("supabase-api") || serviceWorker.includes("supabase.co")) {
  throw new Error("Service worker must not cache authenticated Supabase API responses");
}

console.log("PWA build artifacts verified");
