// Belt-and-suspenders: the Firestore emulator's Java process runs
// detached and can survive Playwright's process-tree kill, orphaning
// the port. Best-effort, never fails the run.
//
// -sTCP:LISTEN restricts to processes *listening* on the port (the
// JVM), not those with active connections (the Playwright process
// itself, which holds an admin-SDK gRPC channel to the emulator).
// Without this filter, globalTeardown would SIGKILL its own process.
const { execSync } = require('node:child_process')
const {
  FIRESTORE_EMULATOR_PORT,
  AUTH_EMULATOR_PORT,
} = require('./support/env')

module.exports = async function globalTeardown() {
  for (const port of [
    FIRESTORE_EMULATOR_PORT,
    AUTH_EMULATOR_PORT,
  ]) {
    try {
      const pids = execSync(
        `lsof -ti:${port} -sTCP:LISTEN`,
        {
          stdio: ['ignore', 'pipe', 'ignore'],
        }
      )
        .toString()
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGKILL')
        } catch {
          // already gone
        }
      }
    } catch {
      // lsof unavailable, or nothing was listening — fine either way.
    }
  }
}
