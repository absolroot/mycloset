const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const repoRoot = path.resolve(__dirname, "..")
const isWindows = process.platform === "win32"
const hasNonAsciiPath = /[^\x00-\x7F]/.test(repoRoot)

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: options.shell || false,
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function runRobocopy(args) {
  const result = spawnSync("robocopy", args, {
    stdio: "inherit",
    shell: false,
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if ((result.status || 0) >= 8) {
    process.exit(result.status)
  }
}

function build(cwd) {
  run("node", ["node_modules/typescript/bin/tsc", "-b"], cwd)
  run("node", ["node_modules/vite/bin/vite.js", "build"], cwd)
}

if (!isWindows || !hasNonAsciiPath) {
  build(repoRoot)
  process.exit(0)
}

const buildRoot = path.join(os.tmpdir(), "closet-build")
const excludedDirs = [".git", "node_modules", "dist", ".playwright-mcp", "assets\\temp"]
const excludedFiles = ["config.js", "*.log", "*.out", "*.err"]

runRobocopy([
  repoRoot,
  buildRoot,
  "/MIR",
  "/XD",
  ...excludedDirs,
  "/XF",
  ...excludedFiles,
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/NP",
])

const lockPath = path.join(buildRoot, "package-lock.json")
const hashPath = path.join(buildRoot, ".package-lock.sha256")
const lockHash = crypto.createHash("sha256").update(fs.readFileSync(lockPath)).digest("hex")
const currentHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, "utf8").trim() : ""
const npmCommand = isWindows ? "npm.cmd" : "npm"

if (!fs.existsSync(path.join(buildRoot, "node_modules")) || currentHash !== lockHash) {
  run(npmCommand, ["ci", "--prefer-offline", "--no-audit", "--fund=false"], buildRoot, { shell: isWindows })
  fs.writeFileSync(hashPath, `${lockHash}\n`, "ascii")
}

build(buildRoot)

runRobocopy([
  path.join(buildRoot, "dist"),
  path.join(repoRoot, "dist"),
  "/MIR",
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/NP",
])
