# Durable Object Starter — Claude Chat

A minimal full-stack starter for building AI chat apps on Cloudflare Workers:

- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** — edge runtime
- **[Durable Objects](https://developers.cloudflare.com/durable-objects/)** — one DO per user, storing conversations + messages in embedded SQLite
- **[AI SDK v6](https://ai-sdk.dev/)** — `streamText` with tool calls, streaming UI messages
- **[AI SDK Elements](https://elements.ai-sdk.dev/)** — `<Conversation>`, `<Message>`, `<PromptInput>`, `<Tool>` (shadcn-registry components)
- **[@ai-sdk/anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)** — Claude Haiku 4.5 (switchable to Sonnet 4.6 via one constant in `src/chat-session.ts`)
- **React 19 + Vite + Tailwind v4 + shadcn/ui** — served as [static assets](https://developers.cloudflare.com/workers/static-assets/) from the same Worker
- **Multi-user demo** — hardcoded user picker (Alice 🦊 / Bob 🐻 / Charlie 🐼), each with their own isolated conversation history

## Architecture

```
┌─────────────┐       ┌──────────────┐      ┌─────────────────────┐
│ React SPA   │──────▶│ Worker       │─────▶│ ChatSession DO      │
│ (Vite build)│       │ (thin router)│      │  (one per userId)   │
│  useChat    │       │              │      │  - SQLite storage   │
│  Elements   │       │  /api/*      │      │  - streamText +     │
└─────────────┘       └──────────────┘      │    tool calls       │
                                            └─────────────────────┘
```

- **One Durable Object instance per user** (`CHAT_SESSION.getByName(userId)`)
- That DO owns the user's conversations in SQLite — conversations survive deploys & restarts
- All AI SDK calls happen inside the DO. The worker is just a thin router
- Response streaming uses `toUIMessageStreamResponse()` + `onFinish` to persist the final message list
- The built React app is served via the `ASSETS` binding — one Worker, no separate hosting

## Tools

The assistant has four demo tools wired up in `src/tools.ts`:

| Tool               | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `get_weather`      | Mock weather + temperature for any city      |
| `get_current_time` | Current UTC time                             |
| `flip_coin`        | Flip 1–10 coins                              |
| `roll_dice`        | Roll N dice with M sides                     |

## Getting started

### Prerequisites

- Node 20+, `pnpm`
- A Cloudflare account (for deploy only — local dev works without)
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
pnpm install

# Local dev secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars and paste your ANTHROPIC_API_KEY
```

### Develop

```bash
pnpm dev
```

This runs **Vite** (`http://localhost:5173`) and **Wrangler** (`http://localhost:8787`) together. Use `5173` in your browser — Vite proxies `/api/*` to Wrangler.

### Other scripts

```bash
pnpm build        # vite build → dist/client
pnpm typecheck    # both tsconfigs (worker + web)
pnpm deploy       # build, then wrangler deploy
pnpm cf-typegen   # regenerate worker-configuration.d.ts after wrangler.jsonc changes
```

### Deploy

```bash
# Set your secret in Cloudflare (once)
npx wrangler secret put ANTHROPIC_API_KEY

# Ship it
pnpm deploy
```

Secrets set via the dashboard or `wrangler secret put` persist across deploys — `wrangler deploy` only pushes code, it never touches secrets.

## Project layout

```
.
├── src/                     # Cloudflare Worker
│   ├── index.ts             # Router: /api/* + ASSETS fallback
│   ├── chat-session.ts      # ChatSession Durable Object (SQLite + streamText)
│   ├── tools.ts             # AI SDK tool definitions
│   ├── shared/users.ts      # Hardcoded user list (shared with frontend)
│   └── env.d.ts             # Extends Env with ANTHROPIC_API_KEY secret
├── web/                     # React + Vite app
│   ├── index.html
│   └── src/
│       ├── App.tsx                  # Layout, user picker, conversation sidebar
│       ├── components/
│       │   ├── Chat.tsx             # useChat + DefaultChatTransport + AI Elements
│       │   ├── ConversationList.tsx
│       │   ├── UserPicker.tsx
│       │   ├── ai-elements/         # shadcn-registry components from elements.ai-sdk.dev
│       │   └── ui/                  # shadcn primitives
│       └── lib/api.ts
├── wrangler.jsonc           # DO binding, assets binding, migrations
├── vite.config.ts
├── tsconfig.json            # worker
└── tsconfig.web.json        # frontend (DOM lib)
```

## API reference

| Method   | Path                                         | Body / Query             |
| -------- | -------------------------------------------- | ------------------------ |
| `GET`    | `/api/users`                                 | —                        |
| `GET`    | `/api/conversations?userId=`                 |                          |
| `POST`   | `/api/conversations?userId=`                 | `{ title?: string }`     |
| `GET`    | `/api/conversations/:id/messages?userId=`    |                          |
| `DELETE` | `/api/conversations/:id?userId=`             |                          |
| `POST`   | `/api/chat?userId=`                          | `{ conversationId, messages: UIMessage[] }` — streams a UI message response |

The `userId` must match one of the hardcoded ids in `src/shared/users.ts`.

## License

MIT
