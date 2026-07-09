// Belt-and-suspenders: the Firestore emulator's Java process runs
// detached and can survive Playwright's process-tree kill, orphaning
// the port. Best-effort, never fails the run.
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
      const pids = execSync(`lsof -ti:${port}`, {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
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
