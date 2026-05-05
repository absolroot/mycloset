const fs = require("node:fs")
const net = require("node:net")
const path = require("node:path")
const { spawn } = require("node:child_process")

const repoRoot = path.resolve(__dirname, "..")
const logsDir = path.join(repoRoot, "artifacts", "logs")
const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js")
const hasNonAsciiPath = /[^\x00-\x7F]/.test(repoRoot)
const isWindows = process.platform === "win32"

function sanitizeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseArgs(argv) {
  const viteArgs = []
  let label = ""
  let port = "5176"
  let host = "127.0.0.1"
  let hasPort = false
  let hasHost = false
  let hasStrictPort = false
  let allowReuse = true

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--no-reuse" || arg === "--force-new") {
      allowReuse = false
      continue
    }

    if (arg === "--log-label") {
      label = sanitizeSegment(argv[index + 1])
      index += 1
      continue
    }

    if (arg.startsWith("--log-label=")) {
      label = sanitizeSegment(arg.slice("--log-label=".length))
      continue
    }

    if (arg === "--port" && argv[index + 1]) {
      port = sanitizeSegment(argv[index + 1]) || port
      hasPort = true
      viteArgs.push(arg, argv[index + 1])
      index += 1
      continue
    }

    if (arg.startsWith("--port=")) {
      port = sanitizeSegment(arg.slice("--port=".length)) || port
      hasPort = true
    }

    if (arg === "--host") {
      hasHost = true
      if (argv[index + 1] && !argv[index + 1].startsWith("-")) {
        host = argv[index + 1]
        viteArgs.push(arg, argv[index + 1])
        index += 1
      } else {
        host = "0.0.0.0"
        viteArgs.push(arg)
      }
      continue
    }

    if (arg.startsWith("--host=")) {
      hasHost = true
      host = arg.slice("--host=".length) || host
    }

    if (arg === "--strictPort") {
      hasStrictPort = true
    }

    viteArgs.push(arg)
  }

  if (!hasHost) {
    viteArgs.push("--host", host)
  }

  if (!hasPort) {
    viteArgs.push("--port", port)
  }

  if (!hasStrictPort) {
    viteArgs.push("--strictPort")
  }

  return { allowReuse, host, label, port, viteArgs }
}

function createLogFilePaths(port, label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const suffix = [port, label, stamp].filter(Boolean).join("-")

  return {
    stdout: path.join(logsDir, `vite-dev-${suffix}.log`),
    stderr: path.join(logsDir, `vite-dev-${suffix}.err.log`),
  }
}

function quoteCmdArg(arg) {
  const value = String(arg)
  if (value && !/[\s&()^|<>"]/.test(value)) return value
  return `"${value.replace(/"/g, '\\"')}"`
}

function createViteCommand(viteArgs) {
  if (isWindows && hasNonAsciiPath && !process.version.startsWith("v20.")) {
    const commandLine = ["npx.cmd", "-p", "node@20", "node", viteBin, repoRoot, ...viteArgs]
      .map(quoteCmdArg)
      .join(" ")

    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", commandLine],
      cwd: path.dirname(repoRoot),
    }
  }

  return {
    command: process.execPath,
    args: [viteBin, ...viteArgs],
    cwd: repoRoot,
  }
}

function hostForProbe(host) {
  if (!host || host === "0.0.0.0" || host === "::") return "127.0.0.1"
  return host
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: hostForProbe(host),
      port: Number(port),
      timeout: 700,
    })

    socket.on("connect", () => {
      socket.destroy()
      resolve(true)
    })

    socket.on("error", () => {
      resolve(false)
    })

    socket.on("timeout", () => {
      socket.destroy()
      resolve(false)
    })
  })
}

fs.mkdirSync(logsDir, { recursive: true })

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})

async function main() {
  const { allowReuse, host, label, port, viteArgs } = parseArgs(process.argv.slice(2))
  const probeHost = hostForProbe(host)

  if (allowReuse && await isPortOpen(probeHost, port)) {
    console.log(`Dev server already appears to be running at http://${probeHost}:${port}/`)
    console.log("Reuse the existing server instead of starting another Vite process.")
    console.log("Use `npm run dev -- --port <port> --no-reuse` only when a separate server is required.")
    return
  }

  const logFiles = createLogFilePaths(port, label)
  const stdout = fs.createWriteStream(logFiles.stdout, { flags: "a" })
  const stderr = fs.createWriteStream(logFiles.stderr, { flags: "a" })
  const viteCommand = createViteCommand(viteArgs)

  console.log(`Vite dev logs: ${path.relative(repoRoot, logFiles.stdout)}`)
  console.log(`Vite dev errors: ${path.relative(repoRoot, logFiles.stderr)}`)

  let child

  try {
    child = spawn(viteCommand.command, viteCommand.args, {
      cwd: viteCommand.cwd,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    })
  } catch (error) {
    console.error(error.message)
    stderr.write(`${error.stack || error.message}\n`)
    stdout.end()
    stderr.end()
    process.exit(1)
  }

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk)
    stdout.write(chunk)
  })

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk)
    stderr.write(chunk)
  })

  child.on("error", (error) => {
    console.error(error.message)
    stderr.write(`${error.stack || error.message}\n`)
    process.exitCode = 1
  })

  child.on("exit", (code, signal) => {
    stdout.end()
    stderr.end()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exitCode = code || 0
  })
}
