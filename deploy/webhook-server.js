const { createServer } = require("node:http");
const { createHmac, timingSafeEqual } = require("node:crypto");
const { execFile } = require("node:child_process");
const { resolve } = require("node:path");

const PORT = parseInt(process.env.DEPLOY_PORT || "9000");
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const DEPLOY_SCRIPT = resolve(__dirname, "..", "deploy.sh");

if (!WEBHOOK_SECRET) {
  console.error("GITHUB_WEBHOOK_SECRET is required");
  process.exit(1);
}

let deploying = false;

function verifySignature(payload, signature) {
  const expected =
    "sha256=" +
    createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function runDeploy() {
  if (deploying) {
    console.log("[deploy] Already in progress, skipping");
    return;
  }
  deploying = true;
  console.log(`[deploy] Starting at ${new Date().toISOString()}`);

  execFile(
    "bash",
    [DEPLOY_SCRIPT],
    { timeout: 300_000 },
    (error, stdout, stderr) => {
      deploying = false;
      if (error) {
        console.error("[deploy] FAILED:", error.message);
        if (stderr) console.error(stderr);
      } else {
        console.log("[deploy] SUCCESS");
      }
      if (stdout) console.log(stdout);
    },
  );
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, deploying }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/deploy") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  try {
    const body = await readBody(req);
    const signature = req.headers["x-hub-signature-256"];

    if (!signature || !verifySignature(body, signature)) {
      console.log("[deploy] Invalid signature");
      res.writeHead(401);
      res.end("Invalid signature");
      return;
    }

    const payload = JSON.parse(body);
    const event = req.headers["x-github-event"];

    if (event !== "push" || payload.ref !== "refs/heads/main") {
      res.writeHead(200);
      res.end("Ignored (not a push to main)");
      return;
    }

    console.log(
      `[deploy] Push to main by ${payload.pusher?.name}: ${payload.head_commit?.message}`,
    );
    res.writeHead(200);
    res.end("Deploy triggered");
    runDeploy();
  } catch (err) {
    console.error("[deploy] Request error:", err);
    res.writeHead(500);
    res.end("Internal error");
  }
});

server.listen(PORT, () => {
  console.log(`[deploy-hook] Listening on port ${PORT}`);
});
