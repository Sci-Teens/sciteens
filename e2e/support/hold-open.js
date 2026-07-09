// Keeps `firebase emulators:exec` alive so it owns emulator
// start/stop as one graceful lifecycle (see playwright.config.js).
function shutdown() {
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
setInterval(() => {}, 1 << 30)
