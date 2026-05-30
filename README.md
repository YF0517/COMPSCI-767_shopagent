# ShopAgent 
An AI-powered shopping assistant that reads your Gmail receipt history, learns your taste, and recommends smarter deals on things you already love and help you save money when you get paid, spend it wisely:)

## Demo
https://youtu.be/qtWZNRmW4Zs

## Demo(no sound only show it work)
https://youtu.be/W_NzoH7iouQ

## What it does
1. **Connects to Gmail** — Google OAuth read-only access scans your last 120 days of shopping emails
2. **You choose** — browse the extracted receipt list and select which emails to include in the analysis
3. **Quick quiz** — 3 targeted questions about your shopping priorities and deal preferences
4. **Two-phase AI analysis**
   - Claude reads all fetched emails and identifies genuine purchase receipts, extracting product names, brands, and amounts
   - Claude analyses your selected receipts and recommends 3 products you'd genuinely want — similar items, natural complements, or smarter deals on things you already buy
5. **CSV export** — download your personalised recommendations with product details, match scores, and shopping links


## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (`App.jsx`, `agent.js`, `GoogleAuth.jsx`) |
| Backend | Express.js (`server.js`) — required for secure API key handling |
| AI | Anthropic Claude Haiku 4.5 — two-phase extract then recommend |
| Data | Gmail REST API (read-only) + Google OAuth 2.0 |
| Prompt | `shop-agent.md` — taste-match and deal optimisation system prompt |

## Reproduction instructions

### Prerequisites
- Node.js 18+
- Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)
- Google Cloud project with Gmail API enabled and OAuth 2.0 credentials (see step 4)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/shopagent.git
cd shopagent
```

### 2. Install dependencies
```bash
yarn install
```

### 3. Set up environment variables
Create a `.env` file in the project root use the .env.example:
```
VITE_API_KEY = YOUR_KEY_HERE
VITE_GOOGLE_CLIENT_ID = YOUR_GOOGLE_CLIENT_ID
```

### 4. Set up Google OAuth
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorised JavaScript origins: `http://localhost:5173`
5. Authorised redirect URIs: `http://localhost:5173`
6. Enable the **Gmail API** under APIs & Services → Library
7. Add your Gmail address as a test user under OAuth consent screen → Audience → Test users

### 5. Run the app (two terminals required)

**Terminal 1 — backend:**
```bash
node server.js
# Should print: API key loaded and ShopAgent backend at http://localhost:3001
```

**Terminal 2 — frontend:**
```bash
yarn dev
# Open http://localhost:5173
```


### 6. Use the app
1. Click **Sign in with Google** — approve Gmail read-only access in the popup
2. Select which receipt emails to analyse
3. Answer 3 preference questions
4. View your 3 personalised recommendations
5. Export to CSV

## Project structure
```
shopagent/
├── config/                     # Configuration
│   ├── .env                    # API keys — not committed to git
│   ├── .env.example            # Template for new developers
│   └── vite.config.js          # Vite dev server with proxy routes to Express
├── src/                        # Frontend (React + Vite)
│   ├── promp/                  # AI system prompts
│   │   ├── shop-agent.md       # Recommendation prompt
│   │   └── receipt-extractor.md # Extraction prompt
│   ├── tests/                   # Test suite
│   │   ├── agent.test.js        # Unit tests — CSV export, JSON parsing
│   │   └── server.test.js       # Integration + E2E tests — API endpoints
│   ├── agent.js                # Gmail fetch, Claude calls, CSV export, eval logger
│   ├── App.jsx                 # Main UI — 4-step wizard, product cards, eval panel
│   ├── components.jsx          # Reusable UI components
│   ├── GoogleAuth.jsx          # Google OAuth 2.0 token helper
│   └── main.jsx                # React entry point
├── .gitignore
├── index.html                  # Vite entry point
├── package.json
├── README.md
├── server.js                   # Backend — Express :3001, Claude API proxy
└── yarn.lock
```

## Agentic behaviours demonstrated
- **Multi-step pipeline**: OAuth → Gmail fetch → AI extraction → quiz → AI analysis → output
- **Tool use**: Gmail REST API + Claude AI as distinct tools called in sequence
- **Memory**: quiz answers + receipt history carried across pipeline steps
- **Decision-making**: filters non-purchase emails, scores product match quality 0–100
- **Two-phase reasoning**: first Claude call extracts structured data, second call reasons over it

## Testing & Evaluation

### Run tests
```bash
NODE_ENV=test yarn test
```

### Automated test results — 10 tests, 2 files, all passing 
```
✓ src/tests/agent.test.js   (3 tests)  ~40ms
✓ src/tests/server.test.js  (7 tests)  ~1.7s
─────────────────────────────────────
```
### Test cases

| # | Task | Input | Expected | Result | Type |
|---|---|---|---|---|---|
| 1 | CSV generates correct headers | 1 product object with all fields | CSV contains product name, brand, category | ✅ Pass | Unit |
| 2 | CSV handles empty product list | Empty array `[]` | CSV still contains ShopAgent header | ✅ Pass | Unit |
| 3 | JSON parser strips markdown | `` ```json
{"test":true}
``` `` | Returns parsed `{ test: true }` object | ✅ Pass | Unit |
| 4 | Backend config endpoint | `GET /auth/config` | Returns `{ clientId: "..." }` with status 200 | ✅ Pass | Integration |
| 5 | Claude API rejects empty body | `POST /api/v1/messages` with `{}` | Returns status 400 — not 200 | ✅ Pass | Integration |
| 6 | Claude API returns recommendation | Real Sephora receipt sent as prompt | Status 200, JSON with `product` and `reason` fields | ✅ Pass | E2E |

### Example task — E2E test (Test #6)
**Input sent to Claude:**
```
Receipt: Sephora NZ $83.73
Products: DIOR Addict Lip Glow, MAKE UP FOR EVER Mist & Fix Setting Spray
Task: Recommend 1 similar product. Return JSON: { "product": "name", "reason": "why" }
```
**Claude's response:**
```json
{
  "product": "Charlotte Tilbury Airbrush Flawless Setting Spray",
  "reason": "Similar to MAKE UP FOR EVER Setting Spray — long-lasting finish at a similar price point available at Mecca NZ"
}
```
**Result:** ✅ Status 200, valid JSON, product name non-empty, reason references receipt

### Failure cases observed during development

| Failure | Cause | Fix applied |
|---|---|---|
| `mcp_servers: Extra inputs not permitted` | Anthropic API rejects MCP from browser | Switched to Gmail REST API called directly |
| `x-api-key header is required` | API key not loaded in Vite plugin | Rewrote to use Express backend with `fs.readFileSync` |
| `Agent returned unexpected format` | Claude returned plain text, not JSON | Added strict JSON-only instruction to system prompt |
| Gmail returns 0 emails | Subject-keyword filter too strict | Broadened query, added HTML body extraction |
| `describe is not defined` | vitest globals not loaded | Added explicit imports in test files |

### Performance observations

| Metric | Observed value |
|---|---|
| Gmail fetch (50 emails, metadata only) | ~3–5 seconds |
| Gmail fetch (40 emails, full HTML body) | ~8–12 seconds |
| Claude extraction call (40 emails) | ~2–4 seconds |
| Claude recommendation call | ~1–3 seconds |
| Total pipeline (Gmail → recommendations) | ~15–20 seconds |
| Unit tests (agent.test.js) | ~40ms |
| Integration + E2E tests (server.test.js) | ~1.7s |

### CI — GitHub Actions
Tests run automatically on every push to `main` via `.github/workflows/test.yml`.


## Critical Reflection
### Known limitations
- Gmail snippet only (no full email body) — some product names missed
- OAuth tokens expire after 1 hour — no auto-refresh
- Claude may hallucinate product prices — verify before purchasing
- HTML email parsing | Deeply nested table layouts (e.g. some Sephora emails) can miss product names — body text is extracted but table cells may collapse into whitespace
- promp change a little then the whole filter system behaves totally differently. Hrad to be consistant.

### Design trade-offs

- Haiku model vs Sonnet: Haiku is ~10x cheaper and fast, but produces less accurate product extraction on complex HTML emails. Sonnet would improve quality at higher cost.
- Gmail REST API vs MCP: Direct REST API works in local dev with user OAuth token. MCP would be more elegant but requires Anthropic's own auth handshake — incompatible with a self-hosted app.
- Session memory only: React state is simple and requires no database setup. Trade-off: no long-term learning — the agent starts fresh every session

### Possible improvements
- Better prompting.
- Automate OAuth token refreshing
- Upgrade to Sonnet for extraction.



