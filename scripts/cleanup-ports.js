const { execSync } = require('child_process');

const PORTS = [3000, 3001, 5001, 5002];

console.log('⚡ Auditing and reclaiming development ports...');

for (const port of PORTS) {
  try {
    // -t returns only PIDs, -i:port finds process on port
    const output = execSync(`lsof -t -i :${port}`).toString().trim();
    if (output) {
      const pids = output.split('\n').map(pid => parseInt(pid, 10)).filter(Boolean);
      for (const pid of pids) {
        // Skip current process
        if (pid === process.pid) continue;
        
        console.log(`📡 Port ${port} is occupied by PID ${pid}. Terminating process...`);
        try {
          process.kill(pid, 9); // SIGKILL
          console.log(`✅ Successfully terminated PID ${pid} occupying Port ${port}`);
        } catch (killErr) {
          console.error(`❌ Failed to terminate PID ${pid}:`, killErr.message);
        }
      }
    }
  } catch (err) {
    // lsof exits with 1 if no processes are found on the port, which is normal and expected
  }
}
console.log('🚀 Ports cleared. Launching dev environment...');
