# README.TOMORROW.md — Docs‑First Build Plan

This plan assumes you’ve already set up **Next.js 15**, **Tailwind**, **TypeScript**, **Supabase Auth**, and **React PDF Viewer** (with `pdfjs-dist@3.4.120`). Tomorrow’s goal is to complete the **AI tutor** experience end-to-end using **official docs and videos** only.

---

## ✅ Status Recap
- Auth + routing + worker config ✅
- Remaining: **Storage + Upload**, **Split-screen Viewer + Chat**, **AI tools (page jump + highlights)**, **Persistence**, **Context extraction**, **Voice**, **Deploy**

---

## 🔧 Environment sanity (quick)
Check you have these in `.env.local` (names may vary if you already created them):
- `NEXT_PUBLIC_SUPABASE_URL=`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- `SUPABASE_SERVICE_ROLE_KEY=` (server-only)
- `DATABASE_URL=` (Postgres for Prisma)
- `OPENAI_API_KEY=`

---

## 1) Supabase Storage — private bucket + signed upload + signed read
**Goal:** Upload a PDF to a **private** bucket and view it via **short‑lived signed URLs**.

### Tasks
- [ ] Create **private** bucket `pdfs`
- [ ] Bucket policies (UI → Buckets → `pdfs` → Policies):
  - **SELECT**: allow `authenticated` to read **own** objects (owner = `auth.uid()` or path prefix `<userId>/...`)
  - **INSERT**: allow `authenticated` to upload to `pdfs` and set owner = `auth.uid()`
- [ ] API: `POST /api/upload` → server creates **signed upload URL** (short‑lived); return `{ url, token, fileId }`
- [ ] Client: PUT file to the **signed upload URL** (`Authorization: Bearer <token>`)
- [ ] API: `POST /api/files/finalize` → signed **read** URL → fetch bytes → **count pages** (pdfjs) → save metadata
- [ ] API: `GET /api/files/[id]/signed-url` → **time‑boxed** read URL for the viewer

### Docs to open (by name)
- Supabase: “**Storage createSignedUploadUrl (JS)**”
- Supabase: “**Storage uploadToSignedUrl (JS)**”
- Supabase: “**Storage createSignedUrl (JS)**”
- Supabase: “**Storage RLS / access control**”

### Acceptance
- [ ] `/upload` → choose PDF → PUT succeeds
- [ ] Can fetch a **signed read** URL and open PDF for ~60–120s
- [ ] Another user cannot read it (RLS works)

---

## 2) Split‑screen PDF Viewer (React PDF Viewer)
**Goal:** Left = viewer (toolbar + page navigation). Right = chat shell.

### Tasks
- [ ] Use `<Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">`
- [ ] `<Viewer fileUrl={signedUrl} plugins={[defaultLayoutPlugin(), pageNavigationPlugin()]} />`
- [ ] Basic 2‑pane page: left viewer, right “Chat” panel (UI only)

### Docs to open (by name)
- React PDF Viewer: “**Getting Started**”, “**Worker**”
- React PDF Viewer: “**default-layout plugin**”
- React PDF Viewer: “**page-navigation plugin**”

### Acceptance
- [ ] Toolbar works (zoom, prev/next, page jump)
- [ ] Signed URL renders the PDF

---

## 3) AI Chat (Vercel AI SDK v5) + Page Control Tool
**Goal:** Streaming chat; AI can **change pages** in the viewer.

### Tasks
- [ ] Install: `ai`, `@ai-sdk/openai`, `openai`
- [ ] Server route uses **`streamText()`** with a tool: `set_page(page:number)`
- [ ] Client uses **`useChat()`**; on tool call → **`pageNavigationPlugin().jumpToPage(page-1)`**
- [ ] System prompt: “When content is on another page, call `set_page` first (1-based).”

### Docs to open (by name)
- Vercel AI SDK: “**useChat (UI)**”
- Vercel AI SDK: “**Tool calling with streamText**”
- OpenAI Node SDK: “**Responses API (text)**”

### Acceptance
- [ ] Typing “Go to page 4” changes the viewer to page 4

---

## 4) Programmatic Highlights / Annotations (Percent‑based)
**Goal:** AI can **highlight** or **circle** areas that remain aligned under zoom.

### Tasks
- [ ] Add `@react-pdf-viewer/highlight`
- [ ] Implement `highlightPlugin({ trigger: None, renderHighlights })`
- [ ] Keep annotations as **percentages**: `{ pageIndex, left, top, width, height, kind }`
- [ ] Add tools: `highlight_rect_pct` and `highlight_circle_pct` (0–100 values)
- [ ] In `renderHighlights`, use `getCssProperties(area, rotation)` to position

### Docs to open (by name)
- React PDF Viewer: “**highlight plugin**”
- React PDF Viewer: “**render highlight areas**” (example with `getCssProperties`)

### Acceptance
- [ ] Prompt: “Circle the legend on this page” → orange ring appears correctly and stays aligned after zoom

---

## 5) Persistence (Prisma) — Conversations, Messages, Annotations
**Goal:** Reload restores chat + marks; sessions are resumable.

### Minimal models (example)
```prisma
model File {
  id           String   @id @default(cuid())
  userId       String
  name         String
  bucket       String
  path         String
  pages        Int?
  createdAt    DateTime @default(now())
  conversations Conversation[]
  annotations   Annotation[]
}

model Conversation {
  id         String   @id @default(cuid())
  userId     String
  fileId     String
  createdAt  DateTime @default(now())
  file       File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  messages   Message[]
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // 'user' | 'assistant' | 'tool'
  content        Json
  createdAt      DateTime @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

model Annotation {
  id        String   @id @default(cuid())
  userId    String
  fileId    String
  pageIndex Int
  kind      String   // 'rect' | 'circle'
  left      Float
  top       Float
  width     Float
  height    Float
  createdAt DateTime @default(now())
  file      File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
}
```

### Tasks
- [ ] Migrate
- [ ] Routes:
  - `GET/POST /api/conversations/[id]/messages`
  - `GET/POST/DELETE /api/files/[id]/annotations`
- [ ] Load messages + annotations on mount; save on every message/tool call

### Docs to open (by name)
- Prisma: “**Next.js with Prisma (App Router)**”
- Prisma: “**Relations**”
- Next.js: “**Route Handlers**”

### Acceptance
- [ ] Reload → last chat + annotations render automatically

---

## 6) PDF Text Extraction (Grounding)
**Goal:** Better answers + page citations.

### Tasks
- [ ] On `finalize`, fetch signed read URL server‑side, parse bytes with **pdfjs** and `getTextContent()` **per page**
- [ ] Save `PageText(fileId, pageIndex, text)` (or JSON blob per file)
- [ ] In chat route: simple retrieval (keyword match → top pages) → include snippets and recommend `set_page`

### Docs to open (by name)
- PDF.js examples: “**Text Layer / getTextContent**”
- “**pdfjs-dist in Node**” (examples repo)

### Acceptance
- [ ] Ask: “What is a virus?” → short answer + “see page X” and auto-jump

---

## 7) Voice I/O (Browser APIs)
**Goal:** Mic to text; speech synthesis for replies.

### Tasks
- [ ] STT: `window.SpeechRecognition` or `webkitSpeechRecognition` (Chrome)
- [ ] TTS: `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`
- [ ] Feature detect; provide text fallback

### Docs to open (by name)
- Web Speech: “**SpeechRecognition**”
- Web Speech: “**SpeechSynthesis**”

### Acceptance
- [ ] Mic button records a question; “Speak reply” reads the AI answer

---

## 8) Deployment & Deliverables
**Goal:** Deployed demo + repo + setup instructions.

### Tasks
- [ ] Vercel deploy (set env vars)
- [ ] `.env.example` with all required keys
- [ ] README setup steps + commands
- [ ] Email **marelle@studyfetch.com** with repo + demo link (per assignment)

### Docs to open (by name)
- Vercel: “**Environment Variables**”
- Next.js on Vercel: “**Deploy a Next.js app**”

---

## 🧩 Gotchas (quick reminders)
- **Next.js 15 route handlers**: `params` is **async** — destructure with `const { id } = await ctx.params`
- **Worker URL**: Keep `pdfjs-dist` version in your `workerUrl` to avoid mismatches
- **Storage policies**: Apply to **storage.objects** (bucket UI writes them for you); use user‑prefixed paths (`<userId>/...`)

---

## ⚡ Suggested flow tomorrow
1) Storage (signed upload + read) → test with a real PDF
2) Viewer split‑screen, toolbar, page nav → view the signed URL
3) AI chat (`useChat`) + `set_page` tool → page jumps on command
4) Highlight plugin + percent coords → AI draws boxes/rings
5) Prisma persistence for messages + annotations → reload restores state
6) PDF text extraction for context → better answers + page citations
7) Voice in/out → final polish
8) Deploy, README, `.env.example`, email

Ship it 🚀
