# ResMind — AI Resume Analyzer

An AI-powered resume analyzer and job application tracker. Upload your resume, get an ATS score and detailed feedback across four categories, and track every job you apply to — all stored in your personal Puter.js cloud account with no backend required.

---

## Features

- **AI Resume Scoring** — Upload a PDF resume and receive an overall score (0–100) powered by Claude AI
- **ATS Analysis** — See how well your resume passes Applicant Tracking Systems with actionable tips
- **Detailed Feedback** — Scores and specific improvements for Tone & Style, Content, Structure, and Skills
- **Resume Preview** — Page-1 image preview of your PDF generated in the browser
- **Job Application Tracker** — Log every job you apply to with status, salary, location, next steps, and notes
- **Linked Reviews** — Connect a job application to its corresponding resume review
- **Data Manager** — Paginated card view to selectively delete resumes and job records
- **No backend** — All data stored in Puter KV; auth via Puter.js (no password needed)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + React Router v7 (SPA mode) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Storage / Auth / AI | [Puter.js](https://puter.com) |
| PDF rendering | pdfjs-dist |
| File upload | react-dropzone |
| Build tool | Vite |

---

## Using the App

### 1. Sign In
Visit the app and click **Sign In** — this uses Puter.js OAuth, no password or account creation needed.

### 2. Analyze a Resume
1. Click **Upload** in the navbar
2. Enter the company name, job title, and optionally paste the job description
3. Drop or select your PDF resume (max 20 MB)
4. Click **Analyze Resume →** and wait ~30 seconds for the AI to process it
5. You'll be redirected to the review page showing your score, ATS analysis, and category breakdowns

### 3. Browse Reviews
The **Home** page shows all your uploaded resumes as cards with company, role, and score. Click any card to view the full feedback.

### 4. Track Job Applications
1. Click **Jobs** in the navbar
2. Click **+ Add Job** to log an application
3. Fill in company, role, status, date, salary, location, next step, notes, and optionally link it to a resume review
4. Use the filter pills and search bar to find specific applications
5. Click the edit icon on any row to update it; click the delete icon to remove it

### 5. Manage Data
The **Wipe** page lets you browse all stored resumes and job records as selectable cards (paginated, 20 per page). Select individual records or entire pages, then click **Delete Selected** to remove them.

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

---

## Deployment

This is a fully static SPA — no server required. Build output goes to `build/client/`.

```bash
npm run build
```

### Vercel (recommended — auto-deploys from GitHub)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
3. Vercel auto-detects the framework. Set **Output Directory** to `build/client` if it doesn't detect it
4. Click **Deploy** — done. Every push to `main` redeploys automatically
5. Your live URL will be `https://your-project.vercel.app`

### Netlify

1. Push your repo to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
3. The `netlify.toml` in this repo handles build command and publish directory automatically
4. Click **Deploy site** — your URL will be `https://your-project.netlify.app`

### Puter App Center

1. Run `npm run build`
2. Go to [puter.com](https://puter.com), open the App Center
3. Upload the contents of `build/client/` as a new app
4. Your app runs natively inside the Puter environment with zero config

---

## Project Structure

```
app/
  components/       # Reusable UI components
  lib/              # puter.ts store, pdf-to-image, utils
  routes/           # home, auth, upload, resume, jobs, wipe
  app.css           # Tailwind theme + custom classes
  root.tsx          # App shell with Navbar + Puter init
constants/          # AI prompt format + instructions
types/              # Global TypeScript interfaces
public/             # Static assets (icons, images, PDF worker)
```
