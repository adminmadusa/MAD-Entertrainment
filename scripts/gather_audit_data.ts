// scripts/gather_audit_data.ts

// Read‑only audit script for MAD Entertrainment monorepo.
// It performs build verification, dist checks, runtime package resolution,
// route introspection, environment contract extraction, and deployment contract collection.

import { execSync } from "child_process";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";

interface PackageInfo {
  name: string;
  path: string;
  buildable: boolean;
  distExists: boolean;
  mainResolves: boolean;
  typesResolves: boolean;
  errors: string[];
}

function log(msg: string) {
  console.log(`[audit] ${msg}`);
}

function getWorkspacePackages(): string[] {
  const workspaceYaml = readFileSync("pnpm-workspace.yaml", "utf8");
  const match = workspaceYaml.match(/packages:\s*\n\s*-\s*(.*)/);
  // simple fallback: assume packages/*
  return readdirSync("packages", { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function verifyBuild(pkgName: string, pkgPath: string): PackageInfo {
  const info: PackageInfo = {
    name: pkgName,
    path: pkgPath,
    buildable: false,
    distExists: false,
    mainResolves: false,
    typesResolves: false,
    errors: [],
  };
  try {
    execSync(`pnpm --filter ${pkgName} build`, { stdio: "ignore" });
    info.buildable = true;
  } catch (e) {
    info.errors.push(`build failed`);
  }
  const distPath = join(pkgPath, "dist");
  if (existsSync(distPath) && statSync(distPath).isDirectory()) {
    const indexJs = join(distPath, "index.js");
    const indexDts = join(distPath, "index.d.ts");
    if (existsSync(indexJs)) info.distExists = true;
    else info.errors.push(`dist/index.js missing`);
    if (existsSync(indexDts)) {
      info.typesResolves = true;
    } else {
      info.errors.push(`dist/index.d.ts missing`);
    }
  } else {
    info.errors.push(`dist folder missing`);
  }
  // runtime resolution checks
  try {
    execSync(`node -e "require('${pkgName}')"`, { stdio: "ignore" });
    info.mainResolves = true;
  } catch (e) {
    info.errors.push(`runtime require failed`);
  }
  return info;
}

function collectPackageData(): PackageInfo[] {
  const pkgs = getWorkspacePackages();
  const results: PackageInfo[] = [];
  for (const pkg of pkgs) {
    const pkgPath = resolve("packages", pkg);
    const pkgJsonPath = join(pkgPath, "package.json");
    if (!existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const name = pkgJson.name;
    results.push(verifyBuild(name, pkgPath));
  }
  return results;
}

function cleanRegexpSource(src: string): string {
  let cleaned = src
    .replace(/^\^/, "")
    .replace(/\$$/, "")
    .replace(/\\\//g, "/")
    .replace(/\/\?\(\?=\/\|\$\)/g, "")
    .replace(/\/\?\(\?=\/\|\$\)\/?$/, "")
    .replace(/\/\(\?=\/\|\$\)\/?$/, "")
    .replace(/\?$/, "");
  
  if (cleaned.startsWith("(?=")) return "";
  if (cleaned === "/?") return "";
  if (cleaned && !cleaned.startsWith("/")) {
    cleaned = "/" + cleaned;
  }
  return cleaned;
}

function cleanPath(p: string): string {
  let result = p.replace(/\/+/g, "/");
  if (result.endsWith("/") && result.length > 1) {
    result = result.substring(0, result.length - 1);
  }
  return result;
}

function extractRoutesFromRouter(routerOrApp: any, basePath: string = ""): Array<{ method: string; path: string }> {
  const routes: Array<{ method: string; path: string }> = [];
  const stack = routerOrApp._router?.stack || routerOrApp.stack || [];
  
  stack.forEach((layer: any) => {
    if (layer.route) {
      const path = cleanPath(basePath + layer.route.path);
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(", ");
      routes.push({ method: methods, path });
    } else if (layer.name === "router" && layer.handle?.stack) {
      const prefix = layer.regexp ? cleanRegexpSource(layer.regexp.source) : "";
      routes.push(...extractRoutesFromRouter(layer.handle, basePath + prefix));
    }
  });
  
  return routes;
}

function introspectRoutes() {
  // Provide dummy environment variables required by app initialization
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/dummy";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dummyjwtsecretdummyjwtsecretdummy";
  process.env.JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || "dummyadminsecretdummyadminsecretdum";
  process.env.JWT_SESSION_SECRET = process.env.JWT_SESSION_SECRET || "dummysessionsecretdummysessionse";
  // Load the Express app without listening
  const { createApp } = require("../apps/server/src/app");
  const app = createApp();
  return extractRoutesFromRouter(app);
}

function extractEnvContract(): any[] {
  const envPath = join("apps", "server", "src", "config", "env.ts");
  if (!existsSync(envPath)) return [];
  const content = readFileSync(envPath, "utf8");
  
  const schemaStartIndex = content.indexOf("const envSchema = z.object({");
  if (schemaStartIndex === -1) return [];
  
  const schemaEndIndex = content.indexOf("});", schemaStartIndex);
  if (schemaEndIndex === -1) return [];
  
  const schemaContent = content.substring(schemaStartIndex + "const envSchema = z.object({".length, schemaEndIndex);
  
  // Find all key declarations: e.g. "  PORT: z" or "  MONGODB_URI: z"
  const regex = /^\s+([A-Z][A-Z0-9_]*)\s*:\s*/gm;
  const keys: Array<{ name: string; index: number }> = [];
  let match;
  while ((match = regex.exec(schemaContent)) !== null) {
    keys.push({ name: match[1], index: match.index });
  }
  
  const list: any[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const nextKeyIndex = i + 1 < keys.length ? keys[i+1].index : schemaContent.length;
    const keyDefinition = schemaContent.substring(key.index, nextKeyIndex).trim();
    
    const isOptional = keyDefinition.includes(".optional()");
    const hasDefault = keyDefinition.includes(".default(");
    const isSecret = /SECRET|KEY|PASSWORD|TOKEN/.test(key.name);
    
    let defaultValue = undefined;
    if (hasDefault) {
      // Find the first default(...) match in this block
      const defaultMatch = keyDefinition.match(/\.default\(([\s\S]*?)\)/);
      if (defaultMatch) {
        defaultValue = defaultMatch[1].trim().replace(/^['"]|['"]$/g, ''); // strip quotes
      }
    }
    
    list.push({
      variable: key.name,
      required: !isOptional && !hasDefault,
      secret: isSecret,
      defaultValue: defaultValue,
      source: "env.ts"
    });
  }
  return list;
}

function parseDeploymentContracts() {
  const contracts: any[] = [];
  // Render (backend)
  const renderPath = "render.yaml";
  if (existsSync(renderPath)) {
    contracts.push({ system: "backend", platform: "Render", configFile: renderPath });
  }
  // Vercel (frontend/admin)
  const vercelPath = "vercel.json";
  if (existsSync(vercelPath)) {
    contracts.push({ system: "frontend/web", platform: "Vercel", configFile: vercelPath });
    contracts.push({ system: "frontend/admin", platform: "Vercel", configFile: vercelPath });
  }
  return contracts;
}

function main() {
  log("Collecting package data...");
  const packages = collectPackageData();

  log("Introspecting routes...");
  const routes = introspectRoutes();

  log("Extracting environment contract...");
  const envVars = extractEnvContract();

  log("Parsing deployment contracts...");
  const deployments = parseDeploymentContracts();

  const audit = {
    timestamp: new Date().toISOString(),
    packages,
    routes,
    envVars,
    deployments,
  };

  const outPath = "audit_data.json";
  require("fs").writeFileSync(outPath, JSON.stringify(audit, null, 2));
  log(`Audit data written to ${outPath}`);
}

main();
