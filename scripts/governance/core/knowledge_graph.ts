// scripts/governance/core/knowledge_graph.ts
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { createHash } from 'crypto';
import { DependencyAnalyzer } from './dependency_analyzer';
import { baselinesDir } from './finding_manager';
import { writeJsonIfChanged, canonicalizeJson, persistenceStats } from './json_utils';

export interface CacheEntry {
  hash: string;
  lastModified: number;
  dependencies: string[];
  exports: string[];
  dynamicImports: string[];
  assetReferences: string[];
}

export interface GraphCache {
  version: string;
  timestamp: string;
  files: Record<string, CacheEntry>;
}

export interface GraphMetrics {
  scannedFiles: number;
  parsedFiles: number;
  cacheHits: number;
  cacheMisses: number;
  parserFailures: number;
  graphBuildDurationMs: number;
}

export class KnowledgeGraph {
  private static workspaceRoot = resolve(__dirname, '../../..');
  private static cacheFile = join(baselinesDir, 'cached-dependency-graph.json');
  private static graphVersion = '1.1.0'; // Updated schema version

  private graph = new Map<string, string[]>(); // file -> files it imports
  private consumers = new Map<string, Set<string>>(); // file -> files that import it
  
  // Cache detailed metadata for each file
  private fileMetadata = new Map<string, CacheEntry>();

  private metrics: GraphMetrics = {
    scannedFiles: 0,
    parsedFiles: 0,
    cacheHits: 0,
    cacheMisses: 0,
    parserFailures: 0,
    graphBuildDurationMs: 0,
  };

  constructor() {
    this.loadOrBuild();
  }

  public getPerformanceMetrics(): GraphMetrics {
    return this.metrics;
  }

  public getParserWarnings(): { file: string; message: string; line?: number }[] {
    return DependencyAnalyzer.getWarnings();
  }

  private getFileHash(fullPath: string): string {
    try {
      const content = readFileSync(fullPath);
      return createHash('sha1').update(content).digest('hex');
    } catch (e) {
      return '';
    }
  }

  private loadOrBuild() {
    const buildStart = Date.now();
    DependencyAnalyzer.clearWarnings();

    let cache: GraphCache | null = null;
    let cacheIsValid = false;

    if (existsSync(KnowledgeGraph.cacheFile)) {
      try {
        const content = readFileSync(KnowledgeGraph.cacheFile, 'utf8');
        cache = JSON.parse(content) as GraphCache;
        // Invalidate on schema version mismatch
        if (cache.version === KnowledgeGraph.graphVersion) {
          cacheIsValid = true;
        }
      } catch (e) {
        // Fallback to rebuilding
      }
    }

    const currentFiles = this.scanAllWorkspaceFiles().sort();
    this.metrics.scannedFiles = currentFiles.length;

    const fileMap = new Map<string, string>(); // path -> hash
    for (const file of currentFiles) {
      const fullPath = resolve(KnowledgeGraph.workspaceRoot, file);
      const hash = this.getFileHash(fullPath);
      fileMap.set(file, hash);
    }

    if (cacheIsValid && cache) {
      console.log('📦 Reconciling Dependency Knowledge Graph Incrementally...');
      
      const cachedFiles = cache.files || {};
      const newCacheFiles: Record<string, CacheEntry> = {};

      // 1. Identify modified/new files and copy clean cache entries
      for (const file of currentFiles) {
        const currentHash = fileMap.get(file) || '';
        const cached = cachedFiles[file];
        const fullPath = resolve(KnowledgeGraph.workspaceRoot, file);
        let mtime = 0;
        try {
          mtime = statSync(fullPath).mtimeMs;
        } catch (e) {}

        if (cached && cached.hash === currentHash) {
          // Cache hit: Re-use clean entry
          newCacheFiles[file] = cached;
          this.graph.set(file, cached.dependencies);
          this.fileMetadata.set(file, cached);
          this.metrics.cacheHits++;
        } else {
          // Cache miss: Re-parse file
          this.metrics.cacheMisses++;
          const detailed = DependencyAnalyzer.analyzeFileDetailed(file);
          const entry: CacheEntry = {
            hash: currentHash,
            lastModified: mtime,
            dependencies: detailed.dependencies,
            exports: detailed.exports,
            dynamicImports: detailed.dynamicImports,
            assetReferences: detailed.assetReferences,
          };
          newCacheFiles[file] = entry;
          this.graph.set(file, detailed.dependencies);
          this.fileMetadata.set(file, entry);
          this.metrics.parsedFiles++;
        }
      }

      this.buildConsumersMap();

      // Compare cache files structurally excluding the cache timestamp itself
      let cacheChanged = true;
      const canonicalOldFiles = canonicalizeJson(cache.files || {});
      const canonicalNewFiles = canonicalizeJson(newCacheFiles);
      if (canonicalOldFiles === canonicalNewFiles) {
        cacheChanged = false;
      }

      if (cacheChanged) {
        // Write cached json
        const updatedCache: GraphCache = {
          version: KnowledgeGraph.graphVersion,
          timestamp: new Date().toISOString(),
          files: newCacheFiles,
        };
        const res = writeJsonIfChanged(KnowledgeGraph.cacheFile, updatedCache);
        if (res.written) {
          persistenceStats.cacheWritten++;
        }
      } else {
        console.log('⚙️ Cache unchanged. Skipping write.');
        // Increment examined/skipped counts manually since we bypassed writeJsonIfChanged
        persistenceStats.examined++;
        persistenceStats.skipped++;
      }
      
    } else {
      console.log('⚙️ Rebuilding Dependency Knowledge Graph from Scratch...');
      this.rebuild(currentFiles, fileMap);
    }

    this.metrics.parserFailures = DependencyAnalyzer.getWarnings().length;
    this.metrics.graphBuildDurationMs = Date.now() - buildStart;
    console.log(`⚙️ Dependency Knowledge Graph loaded in ${this.metrics.graphBuildDurationMs}ms (Hits: ${this.metrics.cacheHits}, Misses: ${this.metrics.cacheMisses}, Parsed: ${this.metrics.parsedFiles}).`);
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
        item === '.turbo' ||
        item === 'coverage' ||
        item === 'reports' ||
        item === 'scratch'
      ) {
        continue;
      }
      
      const fullPath = join(dir, item);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch (e) {
        continue;
      }

      if (stats.isDirectory()) {
        this.scanAllWorkspaceFiles(fullPath, fileList);
      } else {
        // Supported file formats: Source, Assets, Configurations, Documentation
        const isSupported = /\.(ts|tsx|js|jsx|css|scss|png|jpg|jpeg|svg|webp|md|json|yaml|yml)$/i.test(item);
        if (isSupported) {
          fileList.push(relative(KnowledgeGraph.workspaceRoot, fullPath));
        }
      }
    }
    return fileList;
  }

  private rebuild(files: string[], fileMap: Map<string, string>) {
    this.graph.clear();
    this.fileMetadata.clear();
    const rawCacheFiles: Record<string, CacheEntry> = {};

    const sortedFiles = [...files].sort();
    for (const file of sortedFiles) {
      const fullPath = resolve(KnowledgeGraph.workspaceRoot, file);
      let mtime = 0;
      try {
        mtime = statSync(fullPath).mtimeMs;
      } catch (e) {}

      const detailed = DependencyAnalyzer.analyzeFileDetailed(file);
      const hash = fileMap.get(file) || '';
      
      const entry: CacheEntry = {
        hash,
        lastModified: mtime,
        dependencies: detailed.dependencies,
        exports: detailed.exports,
        dynamicImports: detailed.dynamicImports,
        assetReferences: detailed.assetReferences,
      };

      this.graph.set(file, detailed.dependencies);
      this.fileMetadata.set(file, entry);
      rawCacheFiles[file] = entry;
      this.metrics.parsedFiles++;
      this.metrics.cacheMisses++;
    }

    this.buildConsumersMap();

    // Cache the graph
    const cache: GraphCache = {
      version: KnowledgeGraph.graphVersion,
      timestamp: new Date().toISOString(),
      files: rawCacheFiles,
    };

    const res = writeJsonIfChanged(KnowledgeGraph.cacheFile, cache);
    if (res.written) {
      persistenceStats.cacheWritten++;
    }
  }

  private buildConsumersMap() {
    this.consumers.clear();
    for (const [file, imports] of this.graph.entries()) {
      for (const imp of imports) {
        let set = this.consumers.get(imp);
        if (!set) {
          set = new Set<string>();
          this.consumers.set(imp, set);
        }
        set.add(file);
      }
    }
  }

  /**
   * Returns all files that import this path directly.
   */
  public getDirectConsumers(filePath: string): string[] {
    const set = this.consumers.get(filePath);
    return set ? Array.from(set) : [];
  }

  /**
   * Returns all files imported directly by this path.
   */
  public getDependencies(filePath: string): string[] {
    return this.graph.get(filePath) || [];
  }

  /**
   * Returns detailed metadata (exports, dynamic imports, asset references) for a file.
   */
  public getDetailedData(filePath: string): CacheEntry | undefined {
    return this.fileMetadata.get(filePath);
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


  /**
   * Returns a defensive copy of all indexed repository files.
   */
  public getIndexedFiles(): string[] {
    return [...this.graph.keys()];
  }

  /**
   * Updates a file incrementally in the graph.
   * Re-analyzes only the changed file and updates incoming/outgoing edges.
   */
  public updateFileIncremental(filePath: string) {
    const fullPath = resolve(KnowledgeGraph.workspaceRoot, filePath);
    if (!existsSync(fullPath)) {
      // File deleted
      const oldDeps = this.graph.get(filePath) || [];
      this.graph.delete(filePath);
      this.fileMetadata.delete(filePath);
      
      // Remove F from old dependencies' consumers
      for (const d of oldDeps) {
        const set = this.consumers.get(d);
        if (set) {
          set.delete(filePath);
        }
      }
      return;
    }

    // File added or modified
    const oldDeps = this.graph.get(filePath) || [];
    const hash = this.getFileHash(fullPath);
    let mtime = 0;
    try {
      mtime = statSync(fullPath).mtimeMs;
    } catch (e) {}

    const detailed = DependencyAnalyzer.analyzeFileDetailed(filePath);
    const entry: CacheEntry = {
      hash,
      lastModified: mtime,
      dependencies: detailed.dependencies,
      exports: detailed.exports,
      dynamicImports: detailed.dynamicImports,
      assetReferences: detailed.assetReferences,
    };

    // Update graph and metadata maps
    this.graph.set(filePath, detailed.dependencies);
    this.fileMetadata.set(filePath, entry);

    // Remove from old dependencies' consumers
    for (const d of oldDeps) {
      if (!detailed.dependencies.includes(d)) {
        const set = this.consumers.get(d);
        if (set) {
          set.delete(filePath);
        }
      }
    }

    // Add to new dependencies' consumers
    for (const d of detailed.dependencies) {
      let set = this.consumers.get(d);
      if (!set) {
        set = new Set<string>();
        this.consumers.set(d, set);
      }
      set.add(filePath);
    }
  }
}
export const graphInstanceVersion = '1.1.0';
