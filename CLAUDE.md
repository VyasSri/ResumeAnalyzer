# AI Resume Analyzer — CLAUDE.md

## Project Overview
A serverless AI-powered resume analyzer called **ResMind**. Users authenticate via Puter.js,
upload a PDF resume + job description, and receive an ATS score with detailed feedback across
four categories: Tone & Style, Content, Structure, and Skills.

**Stack:** React + React Router v7 · TypeScript · Tailwind CSS v4 · Zustand · Puter.js (auth, file storage, KV, AI)

---

## What Is Already Built (do NOT recreate these)

- `vite.config.ts`, `react-router.config.ts`, `tsconfig.json` — project config
- `app/app.css` — full Tailwind theme with custom classes: `.navbar`, `.primary-button`,
  `.resume-card`, `.resume-card-header`, `.gradient-border`, `.page-heading`,
  `.main-section`, `.auth-button`, `.form-div`, `.resumes-section`, `.feedback-section`
- `app/root.tsx` — includes Puter.js `<script>` tag and calls `init()` from usePuterStore
- `app/routes.ts` — routes for `/`, `/auth`, `/upload`, `/resume/:id` (stubs exist)
- `app/routes/home.tsx` — homepage with Navbar, hero section, maps over resumes array
- `app/routes/auth.tsx` — login/logout page, redirect logic with `?next=` param
- `app/components/Navbar.tsx` — nav with logo link + "Upload Resume" primary button
- `app/components/ResumeCard.tsx` — card linking to `/resume/:id`, shows company/title/score
- `app/components/ScoreCircle.tsx` — SVG circle that fills based on score prop
- `app/lib/puter.ts` — full Zustand store (`usePuterStore`) wrapping Puter.js:
  - `init()`, `auth` object, `isLoading`, `isAuthenticated`
  - `fs.upload(files[])`, `fs.readData(path)` → returns Blob
  - `kv.get(key)`, `kv.set(key, value)`, `kv.list(prefix)` → returns `KVItem[]`
  - `ai.feedback(filePath, prompt)` → returns Puter AI chat response
- `types/index.d.ts` — global interfaces:
  ```ts
  interface Resume {
    id: string;
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    resumePath: string;
    imagePath: string;
    feedback: Feedback;
  }
  interface Feedback {
    overallScore: number;
    ats: { score: number; tips: string[] };
    toneAndStyle: number;
    content: number;
    structure: number;
    skills: number;
    sections: {
      toneAndStyle: { score: number; what_is_good: string[]; what_to_improve: string[] };
      content:      { score: number; what_is_good: string[]; what_to_improve: string[] };
      structure:    { score: number; what_is_good: string[]; what_to_improve: string[] };
      skills:       { score: number; what_is_good: string[]; what_to_improve: string[] };
    };
  }
  interface KVItem { key: string; value: string; }
  ```
- `types/puter.d.ts` — Window augmentation so `window.puter` is typed
- `constants/index.ts` — contains `prepareInstructions(jobTitle, jobDescription)` and
  `AI_RESPONSE_FORMAT` string (see spec below)
- `app/routes/upload.tsx` — exists with: Navbar, `isProcessing` state, `statusText` state,
  company name input, job title input. **Incomplete — continue from here.**

---

## What Needs to Be Built

Work through these in order. Each section lists the file, its purpose, and exact behavior.

---

### 1. `constants/index.ts` — fill in if missing

```ts
export const AI_RESPONSE_FORMAT = `
Return ONLY a JSON object (no markdown, no backticks) matching this exact shape:
{
  "overallScore": number,          // 0-100
  "ats": {
    "score": number,               // 0-100
    "tips": string[]               // 3-5 actionable tips
  },
  "toneAndStyle": number,          // 0-100
  "content": number,
  "structure": number,
  "skills": number,
  "sections": {
    "toneAndStyle": { "score": number, "what_is_good": string[], "what_to_improve": string[] },
    "content":      { "score": number, "what_is_good": string[], "what_to_improve": string[] },
    "structure":    { "score": number, "what_is_good": string[], "what_to_improve": string[] },
    "skills":       { "score": number, "what_is_good": string[], "what_to_improve": string[] }
  }
}`;

export const prepareInstructions = (jobTitle: string, jobDescription: string) => `
You are an expert ATS (Applicant Tracking System) and resume analyst.
Analyze and rate this resume. Be thorough and honest — low scores are okay if warranted.
${jobTitle ? `The candidate is applying for: ${jobTitle}` : ""}
${jobDescription ? `Job description:\n${jobDescription}` : ""}
Respond ONLY with the JSON object below. No other text, no markdown fences.
${AI_RESPONSE_FORMAT}`;
```

---

### 2. `app/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** crypto.randomUUID wrapper */
export const generateUUID = () => crypto.randomUUID();

/**
 * Format bytes to human-readable string (KB / MB / GB)
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
```

---

### 3. `app/lib/pdf-to-image.ts`

Uses `pdfjs-dist` to render page 1 of a PDF to a PNG `File`.

```ts
import * as pdfjsLib from "pdfjs-dist";

// Point worker at the CDN build so Vite doesn't bundle it
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function convertPdfToImage(file: File): Promise<File | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    return await new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          resolve(new File([blob], file.name.replace(/\.pdf$/i, ".png"), { type: "image/png" }));
        },
        "image/png"
      );
    });
  } catch (err) {
    console.error("PDF→Image conversion failed:", err);
    return null;
  }
}
```

---

### 4. `app/components/FileUploader.tsx`

Drag-and-drop PDF uploader using `react-dropzone`.

**Props:**
```ts
interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}
```

**Behavior:**
- `useDropzone` config: `multiple: false`, `accept: { "application/pdf": [".pdf"] }`, `maxSize: 20 * 1024 * 1024`
- `onDrop`: take `acceptedFiles[0] ?? null`, call `onFileSelect?.(file)`
- **No file selected state:** centered upload icon (`/icons/info.svg`, size-20) + text "**Click to upload** or drag and drop" + "PDF (max 20 MB)"
- **File selected state:** show PDF icon (`/images/pdf.png`, size-10) + filename (truncated) + formatted size + an ×-button that calls `onFileSelect?.(null)`
- Wrap everything in `<div {...getRootProps()} className="w-full gradient-border cursor-pointer">`
- Include `<input {...getInputProps()} />`

---

### 5. Complete `app/routes/upload.tsx`

Add what's missing to the already-started file:

**State to add:**
```ts
const [file, setFile] = useState<File | null>(null);
```

**Imports to add:**
```ts
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf-to-image";
import { generateUUID } from "~/utils";
import { prepareInstructions } from "../../constants";
import FileUploader from "~/components/FileUploader";
```

**Puter hooks at component top:**
```ts
const { fs, kv, ai } = usePuterStore();
const navigate = useNavigate();
```

**Replace the placeholder `<div>uploader</div>` with:**
```tsx
<FileUploader onFileSelect={(f) => setFile(f)} />
```

**`handleSubmit` function** (add after existing state):
```ts
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = (e.target as HTMLFormElement);
  if (!form) return;
  const formData = new FormData(form);
  const companyName = formData.get("company-name") as string;
  const jobTitle    = formData.get("job-title") as string;
  const jobDescription = formData.get("job-description") as string;

  if (!file) return;
  await handleAnalyze({ companyName, jobTitle, jobDescription, file });
};
```

**`handleAnalyze` async function:**
```ts
const handleAnalyze = async ({
  companyName, jobTitle, jobDescription, file,
}: {
  companyName: string; jobTitle: string; jobDescription: string; file: File;
}) => {
  setIsProcessing(true);

  // 1. Upload PDF
  setStatusText("Uploading resume...");
  const uploadedFile = await fs.upload([file]);
  if (!uploadedFile) { setStatusText("❌ Failed to upload file."); return; }

  // 2. Convert PDF → PNG
  setStatusText("Converting to image...");
  const imageFile = await convertPdfToImage(file);
  if (!imageFile) { setStatusText("❌ Failed to convert PDF to image."); return; }

  // 3. Upload PNG
  setStatusText("Uploading image...");
  const uploadedImage = await fs.upload([imageFile]);
  if (!uploadedImage) { setStatusText("❌ Failed to upload image."); return; }

  // 4. Build data record
  setStatusText("Preparing data...");
  const uuid = generateUUID();
  const data: Resume = {
    id: uuid,
    companyName,
    jobTitle,
    jobDescription,
    resumePath: uploadedFile.path,
    imagePath: uploadedImage.path,
    feedback: {} as Feedback,
  };
  await kv.set(`resume:${uuid}`, JSON.stringify(data));

  // 5. AI analysis
  setStatusText("Analyzing with AI...");
  const instructions = prepareInstructions(jobTitle, jobDescription);
  const response = await ai.feedback(uploadedFile.path, instructions);
  if (!response) { setStatusText("❌ AI analysis failed."); return; }

  const rawText = typeof response.message.content === "string"
    ? response.message.content
    : (response.message.content as { text: string }[])[0]?.text ?? "";

  data.feedback = JSON.parse(rawText);
  await kv.set(`resume:${uuid}`, JSON.stringify(data));

  setStatusText("✅ Analysis complete! Redirecting...");
  navigate(`/resume/${uuid}`);
};
```

**Processing UI** (replace the `{isProcessing && ...}` block):
```tsx
{isProcessing ? (
  <div className="flex flex-col items-center gap-4 mt-8">
    <h2 className="text-xl font-semibold text-gray-700">{statusText}</h2>
    <img src="/images/resume-scan.gif" className="w-full max-w-md" alt="scanning" />
  </div>
) : (
  <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
    {/* existing company-name, job-title inputs */}
    {/* job-description textarea with rows={5} */}
    {/* FileUploader */}
    <button type="submit" className="primary-button w-fit">Analyze Resume</button>
  </form>
)}
```

---

### 6. `app/routes/resume.tsx` — Resume Detail Page

Route: `/resume/:id`

**Layout:** two-column on desktop (resume image left, feedback right), stacked on mobile (feedback on top via `flex-col-reverse`).

**Data loading** (`useEffect` on `id`):
1. `kv.get(`resume:${id}`)` → parse JSON → `Resume` object
2. `fs.readData(data.resumePath)` → Blob → `URL.createObjectURL(new Blob([blob], {type:"application/pdf"}))` → `setResumeUrl`
3. `fs.readData(data.imagePath)` → Blob → `URL.createObjectURL(blob)` → `setImageUrl`
4. `setFeedback(data.feedback)`

**Auth guard** (useEffect on `isLoading`, `isAuthenticated`):
```ts
if (!isLoading && !isAuthenticated) navigate(`/auth?next=/resume/${id}`);
```

**Left section** (sticky, full viewport height, gradient bg):
- Shows `<img src={imageUrl}>` inside an `<a href={resumeUrl} target="_blank">` so users can open the PDF

**Right section:**
- `<h2>Resume Review</h2>`
- If feedback exists: render `<Summary feedback={feedback} />`, `<ATS score={feedback.ats.score} tips={feedback.ats.tips} />`, `<Details feedback={feedback} />`
- If no feedback yet: show a loading/scan image

---

### 7. `app/components/ScoreGauge.tsx`

Half-circle SVG gauge. Props: `{ score: number }` (0–100).

```tsx
export default function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* background track */}
        <path d="M 13 70 A 54 54 0 0 1 127 70" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
        {/* score arc */}
        <path
          d="M 13 70 A 54 54 0 0 1 127 70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
        />
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
          {score}
        </text>
      </svg>
      <p className="text-xs text-gray-500 -mt-1">out of 100</p>
    </div>
  );
}
```

---

### 8. `app/components/ScoreBadge.tsx`

Small colored badge. Props: `{ score: number }`.

- `score >= 70` → green bg, text "Strong"
- `score >= 50` → yellow bg, text "Good Start"
- else → red bg, text "Needs Work"

```tsx
export default function ScoreBadge({ score }: { score: number }) {
  const [label, cls] =
    score >= 70 ? ["Strong",     "bg-green-100 text-green-700"] :
    score >= 50 ? ["Good Start", "bg-yellow-100 text-yellow-700"] :
                  ["Needs Work", "bg-red-100 text-red-700"];
  return (
    <div className={`rounded-full px-3 py-0.5 text-xs font-semibold w-fit ${cls}`}>
      <p>{label}</p>
    </div>
  );
}
```

---

### 9. `app/components/Summary.tsx`

Props: `{ feedback: Feedback }`

Layout:
1. Top row: `<ScoreGauge score={feedback.overallScore} />` + text block ("Your Resume Score" + description)
2. Grid of 4 `Category` subcomponents (Tone & Style, Content, Structure, Skills)

**`Category` subcomponent** (defined inside Summary.tsx, not exported):
```tsx
function Category({ title, score }: { title: string; score: number }) {
  const color = score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="category">
      <div className="flex flex-row gap-2 items-center justify-center">
        <p>{title}</p>
        <p className="text-2xl"><span className={color}>{score}</span>/100</p>
      </div>
      <ScoreBadge score={score} />
    </div>
  );
}
```

Render:
```tsx
<Category title="Tone & Style" score={feedback.toneAndStyle} />
<Category title="Content"      score={feedback.content} />
<Category title="Structure"    score={feedback.structure} />
<Category title="Skills"       score={feedback.skills} />
```

---

### 10. `app/components/ATS.tsx`

Props: `{ score: number; tips: string[] }`

Color scheme same as ScoreBadge thresholds.

Layout card:
- Colored gradient header with icon + "ATS Score: {score}/100"
- Body: subtitle "How well your resume performs in ATS systems"
- Bulleted list of `tips`

---

### 11. `app/components/Accordion.tsx`

Headless accordion primitives. Export three: `Accordion`, `AccordionItem`, `AccordionHeader`, `AccordionContent`.

- `Accordion` wraps children, manages `openIndex` state
- `AccordionItem` passes index + open state via context
- `AccordionHeader` is a `<button>` that toggles; shows chevron rotated when open
- `AccordionContent` animates height (simple `max-h` toggle with transition)

Use `cn()` from `~/utils` for class merging.

---

### 12. `app/components/Details.tsx`

Props: `{ feedback: Feedback }`

Four `AccordionItem`s — one per section: Tone & Style, Content, Structure, Skills.

Each section shows:
- Section score + `ScoreBadge`
- "What's good" — bulleted green list from `what_is_good[]`
- "What to improve" — bulleted red list from `what_to_improve[]`

---

### 13. Update `app/routes/home.tsx` — Fetch Real Resumes

Replace mock `resumes` import with real data from Puter KV:

```ts
const { kv, fs, isLoading, isAuthenticated } = usePuterStore();
const [resumes, setResumes] = useState<Resume[]>([]);
const [loadingResumes, setLoadingResumes] = useState(false);

// Auth guard
useEffect(() => {
  if (!isLoading && !isAuthenticated) navigate("/auth?next=/");
}, [isLoading, isAuthenticated]);

// Fetch resumes
useEffect(() => {
  const loadResumes = async () => {
    setLoadingResumes(true);
    const items = (await kv.list("resume:*")) as KVItem[];
    const parsed = items?.map((item) => JSON.parse(item.value) as Resume) ?? [];
    setResumes(parsed);
    setLoadingResumes(false);
  };
  if (isAuthenticated) loadResumes();
}, [isAuthenticated]);
```

**Empty state:** if `!loadingResumes && resumes.length === 0`, show "No resumes found" + a link to `/upload`.

**Loading state:** if `loadingResumes`, show a centered scan GIF.

---

### 14. Update `app/components/ResumeCard.tsx` — Load Image from Puter FS

Add inside the component:
```ts
const { fs } = usePuterStore();
const [cardImageUrl, setCardImageUrl] = useState("");

useEffect(() => {
  if (!imagePath) return;
  const load = async () => {
    const blob = await fs.readData(imagePath);
    if (blob) setCardImageUrl(URL.createObjectURL(blob));
  };
  load();
}, [imagePath]);
```

Render `<img src={cardImageUrl}>` instead of the static path. Only show the image `div` if `cardImageUrl` is truthy.

---

### 15. `app/routes/wipe.tsx` — Dev-Only Data Reset

Simple admin page at `/wipe`. No pretty styling needed.

```ts
// On mount:
// 1. kv.list("resume:*") → for each item, kv.delete(item.key)
// 2. Show list of deleted keys
// 3. Button: "Wipe All Data" triggers the above
```

Add route to `app/routes.ts`: `{ path: "/wipe", file: "routes/wipe.tsx" }`.

---

## Puter KV Key Convention

All resume records stored as: `resume:{uuid}` → JSON string of `Resume` type.

List all: `kv.list("resume:*")` returns `KVItem[]` where `item.value` is the JSON string.

---

## Deployment Note (last step)

Before `npm run build`, set in `react-router.config.ts`:
```ts
export default { ssr: false };
```
Then upload contents of `build/client/` to Puter App Center.

---

## Do Not

- Do not use `localStorage` or `sessionStorage` anywhere — Puter KV is the store
- Do not add a backend or API routes — everything is client-side via Puter.js
- Do not change `app/lib/puter.ts` or the existing type declarations
- Do not rename existing CSS class names — they are defined in `app.css`


# Feature: Jobs Applied To

A dedicated page at `/jobs` that acts as a personal job application tracker. Users can log
every job they've applied to, monitor its status, and update details at any time — all stored
in Puter KV under the authenticated user's account.
 
---

## Data Shape

Each job entry stored as `job:{uuid}` in Puter KV:

```ts
interface JobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl?: string;          // link to the original posting
  salary?: string;          // e.g. "$120k–$140k"
  location?: string;        // e.g. "Remote" or "Austin, TX"
  jobDescription?: string;  // optional paste of the JD
  applicationDate: string;  // ISO date string
  status: ApplicationStatus;
  notes?: string;           // free-text e.g. "Recruiter called 3/12"
  nextStep?: string;        // e.g. "Technical interview on 3/20"
  resumeId?: string;        // optional link to a ResMind resume review
}
 
type ApplicationStatus =
  | "Saved"         // want to apply, haven't yet
  | "Applied"       // submitted
  | "Phone Screen"  // recruiter call scheduled/done
  | "Interview"     // technical or onsite
  | "Offer"         // received an offer
  | "Rejected"      // no go
  | "Withdrawn";    // pulled out yourself
```

Add this interface to `types/index.d.ts` alongside the existing `Resume` and `Feedback` types.
 
---

## Routes

Add to `app/routes.ts`:

```ts
{ path: "/jobs", file: "routes/jobs.tsx" }
```
 
---

## Page: `/jobs` — `app/routes/jobs.tsx`

### Layout (top to bottom)

1. Reuse existing `<Navbar />` at the top
2. Page heading: **"Jobs Applied To"** — use `.page-heading` class
3. Stats bar showing live counts per status (e.g. `12 Applied · 3 Interview · 1 Offer`)
4. Filter bar + search input (see Filtering section)
5. Full-width sortable table (see Table section)
6. Empty state when no entries exist: friendly message + "Log Your First Application" button
### Auth Guard

Same pattern as `/` and `/resume/:id`:

```ts
useEffect(() => {
  if (!isLoading && !isAuthenticated) navigate("/auth?next=/jobs");
}, [isLoading, isAuthenticated]);
```

### Data Loading

```ts
useEffect(() => {
  const load = async () => {
    const items = (await kv.list("job:*")) as KVItem[];
    const parsed = items?.map((item) => JSON.parse(item.value) as JobApplication) ?? [];
    setJobs(parsed);
  };
  if (isAuthenticated) load();
}, [isAuthenticated]);
```
 
---

## Table

### Columns

| Column | Notes |
|---|---|
| Company | Bold; renders as a link if `jobUrl` is set |
| Role | Job title |
| Status | Colored pill badge (see Status Colors below) |
| Applied Date | Formatted as "Jun 8, 2026" |
| Salary | Show `—` if not set |
| Location | Show `—` if not set |
| Resume | Clickable link to `/resume/{resumeId}` if linked, else `—` |
| Next Step | Truncated to one line with `title` tooltip for full text |
| Actions | Edit icon button + Delete icon button per row |

### Sorting

Clicking any column header toggles ascending/descending sort on that column.
Show a small up/down chevron next to the active sort column.

### Filtering

- A row of status pill buttons above the table. Clicking one filters the table to that status only. Clicking the active pill again clears the filter.
- A text search input that filters rows by company name or job title (case-insensitive).
---

## Add / Edit Modal

Triggered by the **"Add Job"** button (top right of page) or the **edit icon** on a row.
Rendered as a slide-in side panel or centered modal — not a new page.

### Form Fields

| Field | Type | Required | Default |
|---|---|---|---|
| Company Name | text input | ✅ | — |
| Job Title | text input | ✅ | — |
| Status | dropdown | ✅ | `"Applied"` |
| Application Date | date input | ✅ | today |
| Job URL | text input | — | — |
| Salary Range | text input | — | — |
| Location | text input | — | — |
| Next Step | text input | — | — |
| Notes | textarea | — | — |
| Link Resume Review | dropdown | — | Pull options from `kv.list("resume:*")`, display as `{companyName} — {jobTitle}` |
| Job Description | textarea (collapsible) | — | — |

### On Submit (Add)

```ts
const id = generateUUID();
const entry: JobApplication = { id, ...formValues };
await kv.set(`job:${id}`, JSON.stringify(entry));
// refresh jobs list, close modal
```

### On Submit (Edit)

```ts
await kv.set(`job:${existingEntry.id}`, JSON.stringify({ ...existingEntry, ...formValues }));
// refresh jobs list, close modal
```

### On Delete

Show a simple confirmation prompt ("Delete this application?").

```ts
await kv.delete(`job:${entry.id}`);
// refresh jobs list
```
 
---

## Status Badge Colors

Render as small rounded pills. Define color map:

| Status | Style |
|---|---|
| Saved | gray bg, gray text |
| Applied | blue bg, blue text |
| Phone Screen | purple bg, purple text |
| Interview | yellow bg, yellow text |
| Offer | green bg, green text |
| Rejected | red bg, red text |
| Withdrawn | orange bg, orange text |

Use Tailwind classes e.g. `bg-blue-100 text-blue-700` — same pattern as `ScoreBadge`.
 
---

## Navbar Update

Add a **"Jobs"** link to the existing `app/components/Navbar.tsx` between the logo and the
"Upload Resume" button:

```tsx
<Link to="/jobs" className="text-sm font-semibold text-gray-700 hover:text-black">
  Jobs
</Link>
```

Apply an active style (e.g. underline or color change) when the current path is `/jobs`.
Use `useLocation()` from `react-router` to detect the active route.
 
---

## Storage Convention

```
job:{uuid}  →  JSON string of JobApplication
```

List all entries: `kv.list("job:*")` returns `KVItem[]`. Parse each with `JSON.parse(item.value)`.
 
---

## Reuse These Existing Pieces

- `usePuterStore` from `~/lib/puter` — for `kv`, `isLoading`, `isAuthenticated`
- `generateUUID` from `~/utils`
- `cn()` from `~/utils` for class merging
- CSS classes from `app.css`: `.primary-button`, `.gradient-border`, `.navbar`, `.page-heading`, `.main-section`
- `<Navbar />` component
- `KVItem` type from `types/index.d.ts`
---

## Do Not

- Do not create a backend — all storage is via Puter KV
- Do not break existing resume review routes or components
- Do not add new global CSS — use existing utility classes and Tailwind only
 