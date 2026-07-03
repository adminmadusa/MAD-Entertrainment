// scripts/governance/validators/helpers/duplicate_component_detector.ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { ValidationError } from '../../core/types';

export interface ComponentSignature {
  file: string;
  componentName: string;
  jsxTags: Set<string>;
  hooks: Set<string>;
  props: Set<string>;
  tailwindClasses: Set<string>;
  maxDepth: number;
}

export interface DuplicateComponentMetrics {
  componentsAnalyzed: number;
  bucketsCreated: number;
  comparisonsExecuted: number;
  duplicatesDetected: number;
}

export class DuplicateComponentDetector {
  private static workspaceRoot = resolve(__dirname, '../../../..');

  public static detect(
    files: string[],
    config: any,
    ignorePatterns: string[]
  ): { violations: ValidationError[]; metrics: DuplicateComponentMetrics } {
    const violations: ValidationError[] = [];
    const metrics: DuplicateComponentMetrics = {
      componentsAnalyzed: 0,
      bucketsCreated: 0,
      comparisonsExecuted: 0,
      duplicatesDetected: 0,
    };

    const threshold = config.duplicateDetection?.componentThreshold ?? 75;

    // 1. Scan and extract lightweight component signatures
    const signatures: ComponentSignature[] = [];
    const componentFiles = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase();
      // Skip ignored paths, test files, storybooks
      const isIgnored = ignorePatterns.some(p => f.includes(p));
      const isTest = f.endsWith('.test.tsx') || f.endsWith('.spec.tsx') || f.endsWith('.test.ts') || f.endsWith('.spec.ts');
      const isStory = f.endsWith('.stories.tsx');
      return (ext === 'tsx' || ext === 'jsx') && !isIgnored && !isTest && !isStory;
    });

    for (const file of componentFiles) {
      const fullPath = resolve(this.workspaceRoot, file);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf8');
        const signature = this.extractSignature(file, content);
        if (signature) {
          signatures.push(signature);
          metrics.componentsAnalyzed++;
        }
      } catch (e) {
        // Safe skip on read errors
      }
    }

    // 2. Bucket-first strategy: group components by shared tags and hooks
    const tagIndex = new Map<string, Set<number>>();
    const hookIndex = new Map<string, Set<number>>();

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      for (const tag of sig.jsxTags) {
        let set = tagIndex.get(tag);
        if (!set) {
          set = new Set<number>();
          tagIndex.set(tag, set);
        }
        set.add(i);
      }
      for (const hook of sig.hooks) {
        let set = hookIndex.get(hook);
        if (!set) {
          set = new Set<number>();
          hookIndex.set(hook, set);
        }
        set.add(i);
      }
    }

    metrics.bucketsCreated = tagIndex.size + hookIndex.size;

    // 3. Compare components within same buckets
    const comparedPairs = new Set<string>();

    for (let i = 0; i < signatures.length; i++) {
      const sigA = signatures[i];

      // Find candidate indices
      const candidates = new Set<number>();
      for (const tag of sigA.jsxTags) {
        const set = tagIndex.get(tag);
        if (set) {
          for (const idx of set) {
            if (idx > i) candidates.add(idx);
          }
        }
      }
      for (const hook of sigA.hooks) {
        const set = hookIndex.get(hook);
        if (set) {
          for (const idx of set) {
            if (idx > i) candidates.add(idx);
          }
        }
      }

      for (const idx of candidates) {
        const sigB = signatures[idx];
        const pairKey = `${sigA.file}:${sigA.componentName}-${sigB.file}:${sigB.componentName}`;
        if (comparedPairs.has(pairKey)) continue;
        comparedPairs.add(pairKey);

        metrics.comparisonsExecuted++;

        const similarity = this.calculateSimilarity(sigA, sigB);
        const similarityPct = Math.round(similarity * 100);

        if (similarityPct >= threshold) {
          metrics.duplicatesDetected++;
          
          // Determine recommendation
          let recommendation = '';
          if (sigA.file.startsWith('packages/ui/')) {
            recommendation = `Use the existing shared component exported by "${sigA.file}" instead of duplicating it in "${sigB.file}".`;
          } else if (sigB.file.startsWith('packages/ui/')) {
            recommendation = `Use the existing shared component exported by "${sigB.file}" instead of duplicating it in "${sigA.file}".`;
          } else {
            recommendation = `Extract the duplicated layout/logic from "${sigA.file}" and "${sigB.file}" into a single reusable shared component in "packages/ui".`;
          }

          // Return standard ValidationError
          violations.push({
            file: sigA.file,
            line: 1,
            rule: 'VAL-UI-011',
            severity: 'WARNING',
            message: `Duplicate component layout detected: shares ${similarityPct}% similarity with "${sigB.componentName}" in "${sigB.file}". Recommendation: ${recommendation}`,
          });

          violations.push({
            file: sigB.file,
            line: 1,
            rule: 'VAL-UI-011',
            severity: 'WARNING',
            message: `Duplicate component layout detected: shares ${similarityPct}% similarity with "${sigA.componentName}" in "${sigA.file}". Recommendation: ${recommendation}`,
          });
        }
      }
    }

    return { violations, metrics };
  }

  private static extractSignature(file: string, content: string): ComponentSignature | null {
    try {
      const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

      let componentName = file.split('/').pop()?.split('.')[0] || 'Component';
      const jsxTags = new Set<string>();
      const hooks = new Set<string>();
      const props = new Set<string>();
      const tailwindClasses = new Set<string>();
      let maxDepth = 0;
      let currentDepth = 0;

      const walk = (node: ts.Node) => {
        const isOpening = ts.isJsxOpeningElement(node);
        const isSelfClosing = ts.isJsxSelfClosingElement(node);

        if (isOpening || isSelfClosing) {
          currentDepth++;
          if (currentDepth > maxDepth) maxDepth = currentDepth;

          const tagNameNode = isOpening 
            ? (node as ts.JsxOpeningElement).tagName 
            : (node as ts.JsxSelfClosingElement).tagName;
          const tagName = tagNameNode.getText(sourceFile);
          jsxTags.add(tagName);

          // Extract class names from attributes
          const attributes = isOpening
            ? (node as ts.JsxOpeningElement).attributes
            : (node as ts.JsxSelfClosingElement).attributes;

          for (const attr of attributes.properties) {
            if (ts.isJsxAttribute(attr) && attr.name.text === 'className' && attr.initializer) {
              if (ts.isStringLiteral(attr.initializer)) {
                attr.initializer.text.split(/\s+/).filter(Boolean).forEach(c => tailwindClasses.add(c));
              } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                const exprText = attr.initializer.expression.getText(sourceFile);
                const classMatch = exprText.match(/['"`]([^'`"]+)['"`]/g);
                if (classMatch) {
                  for (const match of classMatch) {
                    match.slice(1, -1).split(/\s+/).filter(Boolean).forEach(c => tailwindClasses.add(c));
                  }
                }
              }
            }
          }
        }

        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
          const name = node.expression.text;
          if (name.startsWith('use')) {
            hooks.add(name);
          }
        }

        if (ts.isFunctionDeclaration(node) && node.name) {
          const name = node.name.text;
          if (name.charAt(0) === name.charAt(0).toUpperCase()) {
            componentName = name;
            const firstParam = node.parameters[0];
            if (firstParam && ts.isObjectBindingPattern(firstParam.name)) {
              for (const element of firstParam.name.elements) {
                if (ts.isIdentifier(element.name)) {
                  props.add(element.name.text);
                }
              }
            }
          }
        }

        if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (name.charAt(0) === name.charAt(0).toUpperCase() && node.initializer) {
            componentName = name;
            if (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) {
              const func = node.initializer;
              const firstParam = func.parameters[0];
              if (firstParam && ts.isObjectBindingPattern(firstParam.name)) {
                for (const element of firstParam.name.elements) {
                  if (ts.isIdentifier(element.name)) {
                    props.add(element.name.text);
                  }
                }
              }
            }
          }
        }

        if (ts.isInterfaceDeclaration(node) && node.name.text.endsWith('Props')) {
          for (const member of node.members) {
            if (member.name && ts.isIdentifier(member.name)) {
              props.add(member.name.text);
            }
          }
        } else if (ts.isTypeAliasDeclaration(node) && node.name.text.endsWith('Props') && ts.isTypeLiteralNode(node.type)) {
          for (const member of node.type.members) {
            if (member.name && ts.isIdentifier(member.name)) {
              props.add(member.name.text);
            }
          }
        }

        ts.forEachChild(node, walk);

        if (isOpening || isSelfClosing) {
          currentDepth--;
        }
      };

      walk(sourceFile);

      if (jsxTags.size > 0) {
        return {
          file,
          componentName,
          jsxTags,
          hooks,
          props,
          tailwindClasses,
          maxDepth,
        };
      }
    } catch (e) {}

    return null;
  }

  private static calculateSimilarity(sigA: ComponentSignature, sigB: ComponentSignature): number {
    const jsxSim = this.jaccard(sigA.jsxTags, sigB.jsxTags);
    const twSim = this.jaccard(sigA.tailwindClasses, sigB.tailwindClasses);
    const hookSim = this.jaccard(sigA.hooks, sigB.hooks);
    const propSim = this.jaccard(sigA.props, sigB.props);

    const depthDiff = Math.abs(sigA.maxDepth - sigB.maxDepth);
    const maxDepth = Math.max(sigA.maxDepth, sigB.maxDepth, 1);
    const depthSim = 1.0 - (depthDiff / maxDepth);

    return (
      jsxSim * 0.35 +
      twSim * 0.25 +
      hookSim * 0.20 +
      propSim * 0.10 +
      depthSim * 0.10
    );
  }

  private static jaccard(setA: Set<any>, setB: Set<any>): number {
    if (setA.size === 0 && setB.size === 0) return 1.0;
    const intersect = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) return 0.0;
    return intersect.size / union.size;
  }
}
export const duplicateComponentDetectorVersion = '1.0.0';
