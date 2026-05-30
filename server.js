import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readEnv(key) {
  try {
    const lines = fs.readFileSync(path.resolve("config/.env"), "utf-8").split("\n");
    for (const line of lines) {
      const m = line.match(new RegExp(`^${key}\\s*=\\s*(.+)$`));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return process.env[key] ?? "";
}

const API_KEY = readEnv("VITE_API_KEY");
const GOOGLE_CLIENT_ID = readEnv("VITE_GOOGLE_CLIENT_ID");

// Don't exit in test environment — just warn
if (!API_KEY && process.env.NODE_ENV !== "test") {
  console.error("VITE_API_KEY not found in .env");
  process.exit(1);
}

if (process.env.NODE_ENV !== "test") {
  console.log(`API key: sk-ant-...${API_KEY.slice(-4)}`);
  console.log(`Google Client ID: ${GOOGLE_CLIENT_ID ? "loaded" : "⚠️ missing"}`);
}

const client = new Anthropic({ apiKey: API_KEY || "test-key" });
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "4mb" }));

app.post("/api/v1/messages", async (req, res) => {
  try {
    const { system, messages, max_tokens = 2000, model = "claude-haiku-4-5-20251001" } = req.body;
    const response = await client.messages.create({ model, max_tokens, system, messages });
    res.json(response);
  } catch (err) {
    console.error("Claude error:", err.message);
    res.status(err.status || 500).json({ error: { message: err.message } });
  }
});

app.get("/auth/config", (req, res) => {
  res.json({ clientId: GOOGLE_CLIENT_ID });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(3001, () => console.log("ShopAgent backend at http://localhost:3001"));
}

export default app;