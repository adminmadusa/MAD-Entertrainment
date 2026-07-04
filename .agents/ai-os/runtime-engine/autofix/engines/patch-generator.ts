import { Patch } from '../base/patch';

export class PatchGenerator {
  generateUnifiedDiff(patch: Patch): string {
    return `--- ${patch.file}
+++ ${patch.file}
@@ -${patch.lineStart},${patch.lineEnd - patch.lineStart + 1} +${patch.lineStart},1 @@
- ${patch.original.trim()}
+ ${patch.replacement.trim()}`;
  }
}
