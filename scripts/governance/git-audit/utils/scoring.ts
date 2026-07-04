export interface Deduction {
  category: string;
  points: number;
  reason: string;
}

export interface ScoreReport {
  overallScore: number;
  deductions: Deduction[];
}

export function computeHygieneScore(
  branches: { name: string; category: string; isLocal: boolean; upstream: string | null; behind: number }[]
): ScoreReport {
  let score = 100;
  const deductions: Deduction[] = [];

  // 1. Merged / Patch-Equivalent local branches lingering
  const lingeringLocalMerged = branches.filter(
    b => b.isLocal && (b.category === 'Ready For Delete' || b.category === 'Patch Equivalent')
  );
  if (lingeringLocalMerged.length > 0) {
    const pts = lingeringLocalMerged.length * 2;
    deductions.push({
      category: 'Branch Hygiene',
      points: pts,
      reason: `${lingeringLocalMerged.length} merged/patch-equivalent local branches lingering: ${lingeringLocalMerged.map(b => b.name).join(', ')}`
    });
  }

  // 2. Duplicate candidates
  const duplicates = branches.filter(b => b.category === 'Duplicate Candidate');
  if (duplicates.length > 0) {
    const pts = duplicates.length * 5;
    deductions.push({
      category: 'Governance Compliance',
      points: pts,
      reason: `${duplicates.length} duplicate candidate branches present: ${duplicates.map(b => b.name).join(', ')}`
    });
  }

  // 3. Stale unmerged branches (behind stale thresholds, non-experimental/protected/archived)
  const staleUnmerged = branches.filter(
    b => b.category === 'Stale'
  );
  if (staleUnmerged.length > 0) {
    const pts = staleUnmerged.length * 2; // -2 points per stale branch
    deductions.push({
      category: 'Branch Hygiene',
      points: pts,
      reason: `${staleUnmerged.length} stale unmerged branches present: ${staleUnmerged.map(b => b.name).join(', ')}`
    });
  }

  // 4. Legacy/Archived branches lingering
  const legacyLingering = branches.filter(b => b.category === 'Archived');
  if (legacyLingering.length > 0) {
    const pts = legacyLingering.length * 5;
    deductions.push({
      category: 'Repository Organization',
      points: pts,
      reason: `${legacyLingering.length} archived/legacy branches lingering: ${legacyLingering.map(b => b.name).join(', ')}`
    });
  }

  // 5. Orphan remote branches (remote only, no local matching, not protected/archived)
  const remoteOrphans = branches.filter(
    b => b.isLocal === false && 
         b.category !== 'Protected' && 
         b.category !== 'Archived' &&
         !branches.some(l => l.isLocal && l.name === b.name.replace('origin/', ''))
  );
  if (remoteOrphans.length > 0) {
    const pts = remoteOrphans.length * 1; // -1 point per remote orphan
    deductions.push({
      category: 'Remote Hygiene',
      points: pts,
      reason: `${remoteOrphans.length} orphan remote branches: ${remoteOrphans.map(b => b.name).join(', ')}`
    });
  }

  const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
  score = Math.max(0, 100 - totalDeductions);

  return {
    overallScore: score,
    deductions
  };
}
