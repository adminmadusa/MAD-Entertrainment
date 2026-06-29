// scripts/governance/core/knowledge_graph.ts
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { DependencyAnalyzer } from './dependency_analyzer';
import { baselinesDir } from './finding_manager';

export interface GraphCache {
  version: string;
  timestamp: string;
  files: Record<string, { size: number; mtime: number }>;
  graph: Record<string, string[]>;
}

export class KnowledgeGraph {
  private static workspaceRoot = resolve(__dirname, '../../..');
  private static cacheFile = join(baselinesDir, 'cached-dependency-graph.json');
  private static graphVersion = '1.0.0';

  private graph = new Map<string, string[]>(); // file -> files it imports
  private consumers = new Map<string, string[]>(); // file -> files that import it

  constructor() {
    this.loadOrBuild();
  }

  private loadOrBuild() {
    let cache: GraphCache | null = null;
    let cacheIsValid = false;

    if (existsSync(KnowledgeGraph.cacheFile)) {
      try {
        const content = readFileSync(KnowledgeGraph.cacheFile, 'utf8');
        cache = JSON.parse(content) as GraphCache;
        if (cache.version === KnowledgeGraph.graphVersion) {
          cacheIsValid = this.validateCacheFiles(cache.files);
        }
      } catch (e) {
        // Fallback to rebuilding
      }
    }

    if (cacheIsValid && cache) {
      this.graph = new Map(Object.entries(cache.graph));
      this.buildConsumersMap();
      console.log('📦 Loaded Dependency Knowledge Graph from Cache.');
    } else {
      console.log('⚙️ Rebuilding Dependency Knowledge Graph...');
      const startTime = Date.now();
      this.rebuild();
      console.log(`⚙️ Dependency Knowledge Graph rebuilt in ${Date.now() - startTime}ms.`);
    }
  }

  private validateCacheFiles(cachedFiles: Record<string, { size: number; mtime: number }>): boolean {
    const currentFiles = this.scanAllWorkspaceFiles();
    const cachedPaths = Object.keys(cachedFiles);
    
    if (cachedPaths.length !== currentFiles.length) {
      return false;
    }

    for (const path of currentFiles) {
      const cached = cachedFiles[path];
      if (!cached) return false;

      const fullPath = resolve(KnowledgeGraph.workspaceRoot, path);
      try {
        const stats = statSync(fullPath);
        if (stats.size !== cached.size || stats.mtimeMs !== cached.mtime) {
          return false;
        }
      } catch (e) {
        return false;
      }
    }

    return true;
  }

  private scanAllWorkspaceFiles(dir: string = KnowledgeGraph.workspaceRoot, fileList: string[] = []): string[] {
    const items = readdirSync(dir);
    for (const item of items) {
      if (
        item === 'node_modules' ||
        item === '.git' ||
        item === '.next' ||
        item === '.governance' ||
        item === 'dist' ||
        item === '.turbo'
      ) {
        continue;
      }
      
      const fullPath = join(dir, item);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        this.scanAllWorkspaceFiles(fullPath, fileList);
      } else if (/\.(ts|tsx)$/.test(item) && !item.endsWith('.test.ts') && !item.endsWith('.test.tsx')) {
        fileList.push(relative(KnowledgeGraph.workspaceRoot, fullPath));
      }
    }
    return fileList;
  }

  private rebuild() {
    const files = this.scanAllWorkspaceFiles();
    const fileStats: Record<string, { size: number; mtime: number }> = {};
    const rawGraph: Record<string, string[]> = {};

    this.graph.clear();

    for (const file of files) {
      const fullPath = resolve(KnowledgeGraph.workspaceRoot, file);
      try {
        const stats = statSync(fullPath);
        fileStats[file] = { size: stats.size, mtime: stats.mtimeMs };
      } catch (e) {
        continue;
      }

      const imports = DependencyAnalyzer.analyzeImports(file);
      this.graph.set(file, imports);
      rawGraph[file] = imports;
    }

    this.buildConsumersMap();

    // Cache the graph
    const cache: GraphCache = {
      version: KnowledgeGraph.graphVersion,
      timestamp: new Date().toISOString(),
      files: fileStats,
      graph: rawGraph,
    };

    writeFileSync(KnowledgeGraph.cacheFile, JSON.stringify(cache, null, 2), 'utf8');
  }

  private buildConsumersMap() {
    this.consumers.clear();
    for (const [file, imports] of this.graph.entries()) {
      for (const imp of imports) {
        const list = this.consumers.get(imp) || [];
        list.push(file);
        this.consumers.set(imp, list);
      }
    }
  }

  /**
   * Returns all files that import this path directly.
   */
  public getDirectConsumers(filePath: string): string[] {
    return this.consumers.get(filePath) || [];
  }

  /**
   * Recursively finds all downstream consumers impacted by changes to the specified files.
   */
  public getAffectedConsumers(changedFiles: string[]): Set<string> {
    const affected = new Set<string>();
    const queue = [...changedFiles];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!affected.has(current)) {
        affected.add(current);
        const direct = this.getDirectConsumers(current);
        for (const consumer of direct) {
          if (!affected.has(consumer)) {
            queue.push(consumer);
          }
        }
      }
    }

    return affected;
  }
}
export const graphInstanceVersion = '1.0.0';
