// What launchd (com.careerops.web) runs: the dashboard's production server on
// http://careerops.localhost:4310, restarted when it exits. Local to this install
// (not a career-ops system file), modelled on tiktokmake's scripts/service-run.mjs.
//
// - Binds 127.0.0.1 only. CAREER_OPS_WEB_ALLOWED_HOSTS just lets the request guard
//   accept the careerops.localhost Host header; web/server.mjs would widen the bind
//   to 0.0.0.0 for a named host, so next is started directly with -H instead.
// - Rebuilds first when web/ sources are newer than the last build, so a restart
//   (`launchctl kickstart -k gui/$(id -u)/com.careerops.web`) picks up code changes.
// - launchd starts node itself rather than a shell: macOS grants ~/Documents access
//   per program, and node needs it anyway.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const web = path.join(root, "web");
const port = Number(process.env.PORT ?? 4310);
const hostName = process.env.CAREER_OPS_HOSTNAME ?? "careerops.localhost";
const url = `http://${hostName}:${port}`;
const next = path.join(web, "node_modules", "next", "dist", "bin", "next");
const buildId = path.join(web, ".next", "BUILD_ID");
const sources = ["src", "public", "package.json", "package-lock.json", "next.config.ts", "next.config.mjs", "tsconfig.json"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => console.log(`${new Date().toISOString().slice(0, 19).replace("T", " ")} ${message}`);

function newestMtime(p) {
  let stat;
  try {
    stat = fs.statSync(p);
  } catch {
    return 0;
  }
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = stat.mtimeMs;
  for (const entry of fs.readdirSync(p)) newest = Math.max(newest, newestMtime(path.join(p, entry)));
  return newest;
}

function buildIsStale() {
  let built;
  try {
    built = fs.statSync(buildId).mtimeMs;
  } catch {
    return true;
  }
  return sources.some((s) => newestMtime(path.join(web, s)) > built);
}

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: web, stdio: "inherit", env: process.env });
    child.once("exit", (code, signal) => resolve(code ?? signal));
  });
}

function portTaken() {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

let server = null;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server?.kill("SIGTERM");
    process.exit(0);
  });
}

let waiting = false;
for (;;) {
  if (await portTaken()) {
    if (!waiting) log(`Port ${port} is taken by another program; waiting for it.`);
    waiting = true;
    await sleep(10000);
    continue;
  }
  waiting = false;
  if (buildIsStale()) {
    log("Sources changed since the last build; building...");
    const code = await run([next, "build"]);
    if (code !== 0) {
      log(`Build failed (${code}).`);
      if (!fs.existsSync(buildId)) {
        await sleep(60000);
        continue;
      }
      log("Starting the previous build instead.");
    }
  }
  log(`Starting on ${url}`);
  server = spawn(process.execPath, [next, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: web,
    stdio: "inherit",
    env: { ...process.env, CAREER_OPS_WEB_ALLOWED_HOSTS: hostName },
  });
  const exit = await new Promise((resolve) => server.once("exit", (code, signal) => resolve(code ?? signal)));
  server = null;
  log(`Server exited (${exit}).`);
  await sleep(3000);
}
