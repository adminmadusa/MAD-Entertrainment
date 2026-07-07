const { execSync } = require('child_process');

const PORTS = [3000, 3001, 3002, 5001, 5002];

console.log('⚡ Auditing and reclaiming development ports...');

// Helper to get Parent Process ID (PPID)
const getParentPid = (pid) => {
  try {
    const ppid = execSync(`ps -o ppid= -p ${pid}`).toString().trim();
    return ppid ? parseInt(ppid, 10) : null;
  } catch (e) {
    return null;
  }
};

// Build a set of protected ancestor PIDs for the current run to safeguard our active launcher
const protectedPids = new Set([process.pid]);
let currentPid = process.pid;
while (currentPid) {
  const ppid = getParentPid(currentPid);
  if (ppid && ppid > 1) {
    protectedPids.add(ppid);
    currentPid = ppid;
  } else {
    break;
  }
}

// Find PIDs listening on our development ports
const pidsToTerminate = new Set();
for (const port of PORTS) {
  try {
    const output = execSync(`lsof -t -i :${port}`).toString().trim();
    if (output) {
      const pids = output.split('\n').map(pid => parseInt(pid, 10)).filter(Boolean);
      for (const pid of pids) {
        if (protectedPids.has(pid)) continue;
        pidsToTerminate.add(pid);

        // Trace ancestors of the port-holding process to gather stale parent watchers (e.g. tsx, next dev)
        let ancestorPid = pid;
        while (ancestorPid) {
          const ppid = getParentPid(ancestorPid);
          if (ppid && ppid > 1) {
            if (protectedPids.has(ppid)) {
              // Stop tracing if we hit our own active launcher tree
              break;
            }
            pidsToTerminate.add(ppid);
            ancestorPid = ppid;
          } else {
            break;
          }
        }
      }
    }
  } catch (err) {
    // lsof exits with 1 if no process is found, which is normal and expected
  }
}

// Terminate the gathered stale processes
if (pidsToTerminate.size > 0) {
  console.log(`📡 Found ${pidsToTerminate.size} stale processes or parent watchers. Terminating...`);
  // Sort PIDs in descending order to kill children first before parents (preventing auto-respawn loops)
  const sortedPids = Array.from(pidsToTerminate).sort((a, b) => b - a);
  for (const pid of sortedPids) {
    try {
      process.kill(pid, 9); // SIGKILL
      console.log(`   ✅ Terminated PID ${pid}`);
    } catch (killErr) {
      // Process might already be dead from a cascading kill
    }
  }
} else {
  console.log('✅ No stale processes detected.');
}

console.log('🚀 Ports and watchers cleared. Launching dev environment...');
