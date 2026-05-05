const http = require("node:http")

const DEFAULT_START_PORT = 5176
const DEFAULT_END_PORT = 5190
const startPort = Number(process.argv[2] || DEFAULT_START_PORT)
const endPort = Number(process.argv[3] || DEFAULT_END_PORT)

function probe(host, port) {
  return new Promise((resolve) => {
    const request = http.get({
      host,
      port,
      path: "/",
      timeout: 800,
    }, (response) => {
      response.resume()
      resolve({
        host,
        port,
        statusCode: response.statusCode,
        server: response.headers.server || "",
      })
    })

    request.on("error", () => {
      resolve(null)
    })

    request.on("timeout", () => {
      request.destroy()
      resolve(null)
    })
  })
}

async function main() {
  const results = []

  for (let port = startPort; port <= endPort; port += 1) {
    const probes = await Promise.all([
      probe("127.0.0.1", port),
      probe("localhost", port),
    ])

    for (const result of probes) {
      if (result) results.push(result)
    }
  }

  if (!results.length) {
    console.log(`No dev server detected on ports ${startPort}-${endPort}.`)
    return
  }

  console.log(`Detected local dev servers on ports ${startPort}-${endPort}:`)
  for (const result of results) {
    const server = result.server ? ` (${result.server})` : ""
    console.log(`- http://${result.host}:${result.port}/ responded ${result.statusCode}${server}`)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
