import { CommitProvider } from '../../providers/changelog/CommitProvider';

export class ChangelogService {
  constructor(private commitProvider: CommitProvider) {}

  async generate(fromRef: string, toRef: string): Promise<string> {
    const commits = await this.commitProvider.getCommits(fromRef, toRef);
    
    const features: string[] = [];
    const fixes: string[] = [];
    const docs: string[] = [];
    const refactors: string[] = [];
    const others: string[] = [];

    for (const c of commits) {
      // Remove hash prefix if present, e.g. "a7facbdf feat(gov): message" -> "feat(gov): message"
      const cleanCommit = c.replace(/^[a-fA-F0-9]+\s+/, '').trim();
      const lower = cleanCommit.toLowerCase();

      if (lower.startsWith('feat')) {
        features.push(cleanCommit);
      } else if (lower.startsWith('fix')) {
        fixes.push(cleanCommit);
      } else if (lower.startsWith('docs')) {
        docs.push(cleanCommit);
      } else if (lower.startsWith('refactor')) {
        refactors.push(cleanCommit);
      } else {
        others.push(cleanCommit);
      }
    }

    let markdown = '';
    
    if (features.length > 0) {
      markdown += '\n### 🚀 Features\n' + features.map(x => `- ${x}`).join('\n') + '\n';
    }
    if (fixes.length > 0) {
      markdown += '\n### 🐛 Bug Fixes\n' + fixes.map(x => `- ${x}`).join('\n') + '\n';
    }
    if (refactors.length > 0) {
      markdown += '\n### 🔧 Refactoring\n' + refactors.map(x => `- ${x}`).join('\n') + '\n';
    }
    if (docs.length > 0) {
      markdown += '\n### 📝 Documentation\n' + docs.map(x => `- ${x}`).join('\n') + '\n';
    }
    if (others.length > 0) {
      markdown += '\n### 📦 Other Changes\n' + others.map(x => `- ${x}`).join('\n') + '\n';
    }

    if (!markdown) {
      markdown = '_No changes detected._\n';
    }

    return markdown.trim();
  }
}
