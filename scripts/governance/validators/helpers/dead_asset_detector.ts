// scripts/governance/validators/helpers/dead_asset_detector.ts
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { KnowledgeGraph } from '../../core/knowledge_graph';
import { ValidationError } from '../../core/types';

export interface DeadAssetMetrics {
  deadComponents: number;
  deadHooks: number;
  deadUtilities: number;
  deadIcons: number;
  deadCSS: number;
  deadImages: number;
  possibleUnreachableRoutes: number;
}

export class DeadAssetDetector {
  private static workspaceRoot = resolve(__dirname, '../../../..');

  public static detect(
    files: string[],
    graph: KnowledgeGraph,
    config: any,
    ignorePatterns: string[]
  ): { violations: ValidationError[]; metrics: DeadAssetMetrics } {
    const violations: ValidationError[] = [];
    const metrics: DeadAssetMetrics = {
      deadComponents: 0,
      deadHooks: 0,
      deadUtilities: 0,
      deadIcons: 0,
      deadCSS: 0,
      deadImages: 0,
      possibleUnreachableRoutes: 0,
    };

    // 1. Get entry points and run reachability analysis
    const entryPoints = this.getEntryPoints(files, config);
    const reachable = this.runBFS(entryPoints, graph);

    // 2. Identify all icon exports in the codebase (specifically in Icons.tsx)
    const iconFiles = files.filter(f => f.endsWith('Icons.tsx') || f.endsWith('Icons.ts'));
    const allIconExports = new Map<string, { file: string; symbol: string }>();

    for (const iconFile of iconFiles) {
      const detailed = graph.getDetailedData(iconFile);
      if (detailed && detailed.exports) {
        for (const exp of detailed.exports) {
          allIconExports.set(`${iconFile}:${exp}`, { file: iconFile, symbol: exp });
        }
      }
    }

    // 3. Scan reachable files to find imported symbols (to detect unused individual icon exports)
    const usedIconSymbols = new Set<string>();
    for (const file of reachable) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
        const fullPath = resolve(this.workspaceRoot, file);
        if (existsSync(fullPath)) {
          try {
            const content = readFileSync(fullPath, 'utf8');
            // Check if any icon symbol is mentioned in the content
            for (const [key, val] of allIconExports.entries()) {
              // Direct match or word match for symbol name
              const regex = new RegExp(`\\b${val.symbol}\\b`);
              if (regex.test(content) && file !== val.file) {
                usedIconSymbols.add(key);
              }
            }
          } catch (e) {}
        }
      }
    }

    // 4. Resolve all Next.js pages/routes in the workspace and track references to them
    const pageFiles = files.filter(f => {
      return /(apps\/web\/src\/app|apps\/admin\/src\/app)\/(.*\/)?(page\.[jt]sx?|route\.[jt]s)$/.test(f);
    });

    const routePathMap = new Map<string, string>(); // page file -> URL path
    for (const page of pageFiles) {
      const resolvedPath = this.resolveRoutePath(page);
      if (resolvedPath) {
        routePathMap.set(page, resolvedPath);
      }
    }

    const referencedRoutes = new Set<string>();
    for (const file of reachable) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'md') {
        const fullPath = resolve(this.workspaceRoot, file);
        if (existsSync(fullPath)) {
          try {
            const content = readFileSync(fullPath, 'utf8');
            for (const [page, path] of routePathMap.entries()) {
              // Check if URL path is in a string literal or link
              if (content.includes(`"${path}"`) || content.includes(`'${path}'`) || content.includes(`(${path})`)) {
                referencedRoutes.add(page);
              }
            }
          } catch (e) {}
        }
      }
    }

    // 5. Evaluate reachability for all files in scope
    const deadCodeExclusions: string[] = (config as any).scanScope?.deadCodeExclusions ?? [];
    for (const file of files) {
      // Skip ignored paths, test files, storybooks, and configuration files
      if (this.shouldSkipFile(file, ignorePatterns)) {
        continue;
      }
      // Skip files explicitly excluded from dead-code detection in governance.config.ts
      // (e.g., files referenced via config-level APIs outside BFS traversal scope)
      if (deadCodeExclusions.some(exc => file === exc || file.endsWith('/' + exc))) {
        continue;
      }

      const isReachable = reachable.has(file);
      const ext = file.split('.').pop()?.toLowerCase();

      if (!isReachable) {
        // Classify and flag dead assets
        // A. Components (*.tsx, *.jsx)
        if (ext === 'tsx' || ext === 'jsx') {
          // Verify it's not a Next.js special page file (which are handled as pages)
          const isPageFile = /(page\.[jt]sx?|layout\.[jt]sx?|error\.[jt]sx?|loading\.[jt]sx?|not-found\.[jt]sx?)$/.test(file);
          if (!isPageFile) {
            violations.push({
              file,
              rule: 'VAL-UI-012',
              severity: 'WARNING',
              message: `Dead component detected: file is unreachable from production entry points.`,
            });
            metrics.deadComponents++;
          }
        }
        // B. Hooks (*.ts, *.tsx starting with use or exporting use*)
        else if ((ext === 'ts' || ext === 'tsx') && (file.includes('/use') || file.split('/').pop()?.startsWith('use'))) {
          violations.push({
            file,
            rule: 'VAL-UI-013',
            severity: 'WARNING',
            message: `Dead hook detected: file is unreachable from production entry points.`,
          });
          metrics.deadHooks++;
        }
        // C. Utilities (*.ts, *.js under package utils or shared or utils/lib folders)
        else if ((ext === 'ts' || ext === 'js') && (file.includes('/utils/') || file.includes('/lib/') || file.startsWith('packages/shared/') || file.startsWith('packages/utils/'))) {
          violations.push({
            file,
            rule: 'VAL-UI-014',
            severity: 'WARNING',
            message: `Dead utility file detected: file is unreachable from production entry points.`,
          });
          metrics.deadUtilities++;
        }
        // D. CSS/SCSS
        else if (ext === 'css' || ext === 'scss') {
          violations.push({
            file,
            rule: 'VAL-UI-016',
            severity: 'WARNING',
            message: `Dead style file detected: CSS/SCSS module is unreachable from production entry points.`,
          });
          metrics.deadCSS++;
        }
        // E. Images (.png, .jpg, .jpeg, .svg, .webp)
        else if (/\.(png|jpg|jpeg|svg|webp)$/i.test(file)) {
          violations.push({
            file,
            rule: 'VAL-UI-015', // Image asset rule (VAL-UI-015 or 016)
            severity: 'WARNING',
            message: `Dead image asset detected: image file is never imported or referenced in production code.`,
          });
          metrics.deadImages++;
        }
      }

      // F. Pages (App Router page files) - reachable in graph, but might have no links pointing to it
      if (isReachable && routePathMap.has(file)) {
        const isReferenced = referencedRoutes.has(file);
        // Exclude entry pages (like home / or dashboard /dashboard) from unreachable routes warnings
        const path = routePathMap.get(file)!;
        const isEntryPage = path === '/' || path === '/dashboard' || path === '/login';

        if (!isReferenced && !isEntryPage) {
          violations.push({
            file,
            rule: 'VAL-UI-018',
            severity: 'INFO',
            message: `Possible Unreachable Route: no direct navigation links pointing to "${path}" were found in production files.`,
          });
          metrics.possibleUnreachableRoutes++;
        }
      }
    }

    // 6. Check for dead individual icon exports in Icons.tsx (even if file is reachable)
    for (const [key, val] of allIconExports.entries()) {
      if (reachable.has(val.file) && !usedIconSymbols.has(key)) {
        violations.push({
          file: val.file,
          rule: 'VAL-UI-015',
          severity: 'WARNING',
          message: `Dead Icon Export: symbol "${val.symbol}" is exported but never used by any reachable component.`,
        });
        metrics.deadIcons++;
      }
    }

    return { violations, metrics };
  }

  private static getEntryPoints(files: string[], config: any): string[] {
    const configuredPatterns = config.entryPoints;
    if (Array.isArray(configuredPatterns)) {
      return files.filter(f => {
        return configuredPatterns.some(pattern => {
          const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
          const regexStr = '^' + escaped
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*') + '$';
          return new RegExp(regexStr).test(file || f) || f.includes(pattern);
        });
      });
    }

    // Default Fallback entry points
    return files.filter(f => {
      // App router page/route/layout files
      if (/(apps\/web\/src\/app|apps\/admin\/src\/app)\/(.*\/)?(page\.[jt]sx?|route\.[jt]s|layout\.[jt]sx?|error\.[jt]sx?|global-error\.[jt]sx?|not-found\.[jt]sx?|loading\.[jt]sx?|template\.[jt]sx?|robots\.[jt]s|sitemap\.[jt]s)$/.test(f)) {
        return true;
      }
      // Middleware / instrumentation files
      if (/(apps\/web\/src|apps\/admin\/src)\/(middleware\.[jt]s|instrumentation\.[jt]s)$/.test(f)) {
        return true;
      }
      // Express server entry files
      if (/apps\/server\/src\/(server\.[jt]s|app\.[jt]s|instrument\.[jt]s|workers\/.*|migrations\/.*)$/.test(f)) {
        return true;
      }
      return false;
    });
  }

  private static runBFS(entryPoints: string[], graph: KnowledgeGraph): Set<string> {
    const reachable = new Set<string>();
    const queue = [...entryPoints];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!reachable.has(current)) {
        reachable.add(current);
        const dependencies = graph.getDependencies(current);
        for (const dep of dependencies) {
          if (!reachable.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }

    return reachable;
  }

  private static resolveRoutePath(filePath: string): string | null {
    const match = /(apps\/web\/src\/app|apps\/admin\/src\/app)\/(.+)$/.exec(filePath);
    if (!match) return null;

    const parts = match[2].split('/');
    const last = parts.pop(); // Remove page.tsx / route.ts
    if (last && !last.startsWith('page.') && !last.startsWith('route.')) {
      return null;
    }

    // Filter out route groups e.g., (auth), (marketing)
    const filteredParts = parts.filter(p => !p.startsWith('(') && !p.endsWith(')'));

    // Resolve path
    const routePath = '/' + filteredParts.join('/');
    return routePath === '//' ? '/' : routePath;
  }

  private static shouldSkipFile(file: string, ignorePatterns: string[]): boolean {
    const isIgnored = ignorePatterns.some(pattern => {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      const regexStr = '^' + escaped
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*') + '$';
      return new RegExp(regexStr).test(file) || file.includes(pattern);
    });

    if (isIgnored) return true;

    // Standard skips: tests, storybooks, configuration
    const isTest = /\.test\.[jt]sx?$/.test(file) || /\.spec\.[jt]sx?$/.test(file);
    const isStory = /\.stories\.[jt]sx?$/.test(file);
    const isConfig = /tsconfig.*\.json$/.test(file) || /package\.json$/.test(file) || /tailwind\.config\..*$/.test(file) || /next\.config\..*$/.test(file) || /turbo\.json$/.test(file) || /pnpm-workspace\.yaml$/.test(file);

    return isTest || isStory || isConfig || file.startsWith('.governance/');
  }
}
export const deadAssetDetectorVersion = '1.0.0';
