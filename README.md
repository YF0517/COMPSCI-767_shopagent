# ShopAgent 
An AI-powered shopping assistant that reads your Gmail receipt history, learns your taste, and recommends smarter deals on things you already love and help you save money when you get paid, spend it wisely:)


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

## Known limitations
- Gmail snippet only (no full email body) — some product names missed
- OAuth tokens expire after 1 hour — no auto-refresh
- Claude may hallucinate product prices — verify before purchasing
- 25 email cap per session
- No persistent user profile between sessions
- Sometimes meet bugs or fail when analyse your preference
