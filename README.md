# Tailr

An AI resume builder you talk to. Paste a job description, optionally upload
your existing resume, refine the draft through conversation, and when you
approve it Tailr generates a polished, ATS-ready PDF.

It will not invent experience. Wording, structure, and emphasis are fair game;
employers, dates, degrees, and metrics are not.

## How it works

```
chat message (+ optional PDF/DOCX)
  -> file uploaded to Cloudinary, text extracted
  -> AI drafts a tailored resume in plain text
  -> user approves
  -> AI calls the generate_resume_pdf tool
  -> resume JSON -> HTML template -> Gotenberg -> PDF
  -> PDF uploaded to Cloudinary, download URL returned in chat
```

The AI never designs the PDF. It produces structured JSON, and the backend
renders it through one of three HTML templates.

## Stack

- Node.js, Express 5, TypeScript
- MongoDB with Mongoose
- Gotenberg (headless Chromium) for HTML to PDF
- Cloudinary for file storage
- Gemini or OpenAI, selected by one environment variable
- `pdf-parse` for PDFs, `mammoth` for DOCX

## Getting started

Requires Node 20+, Docker, and a MongoDB instance.

```bash
cd server
npm install
cp .env.example .env     # then fill in the values
```

Start Gotenberg:

```bash
docker compose up -d
```

Run the API:

```bash
npm run dev              # http://localhost:4000
```

### Environment

| Variable | Notes |
| --- | --- |
| `MONGODB_URI` | Local instance or an Atlas connection string |
| `GOTENBERG_URL` | `http://localhost:3001` locally |
| `AI_PROVIDER` | `gemini` or `openai` |
| `GEMINI_API_KEY` | Free tier: https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | Needed only when `AI_PROVIDER=openai` |
| `CLOUDINARY_*` | Cloud name, API key, API secret |

## API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Service and database status |
| `POST` | `/chat` | Create a chat session |
| `GET` | `/chat` | List sessions, most recent first |
| `GET` | `/chat/:chatId` | One session with its full message history |
| `POST` | `/chat/:chatId/message` | Send a message, optionally with attachments |

`POST /chat/:chatId/message` accepts JSON (`{ "message": "..." }`) or multipart
with a `files` field. Attachments must be PDF or DOCX, up to 10MB, 3 per
message. The response returns every message produced that turn, so a generation
turn returns the tool call, the tool result, and the assistant's reply.

## Templates

- `modern-accent` — the default: clean typography with a subtle colour accent
- `classic-ats` — plain black and white, for conservative fields
- `compact-professional` — denser layout for long careers

All three are single column with real text and no tables or images, so
applicant tracking systems parse them reliably.

Preview all three without touching the API:

```bash
npm run test:pdf         # writes PDFs to server/output/
```

## Project layout

```
server/src/
  chat/        sessions, messages, and the orchestration service
  ai/          provider interface, OpenAI and Gemini, prompt, tools
  pdf/         Gotenberg client and the HTML templates
  files/       Cloudinary uploads and PDF/DOCX parsing
  documents/   generated document records
  shared/      errors and error middleware
```

`chat.service.ts` coordinates the flow. Every other service does one job and
knows nothing about HTTP.
