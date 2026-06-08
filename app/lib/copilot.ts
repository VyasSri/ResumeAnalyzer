export type CoPilotStep =
    | "extracting"
    | "analyzing"
    | "rewriting"
    | "validating"
    | "done"
    | "error";

export interface ExtractedResume {
    summary: string | null;
    experience: {
        company: string;
        title: string;
        dates: string;
        bullets: string[];
    }[];
    skills: string[];
    education: { institution: string; degree: string; dates: string }[];
    certifications: string[];
}

export interface GapAnalysis {
    missingKeywords: string[];
    weakBullets: { original: string; reason: string }[];
    missingSkills: string[];
    summaryGap: string | null;
    overallGapSummary: string;
}

export interface RewriteResult {
    improvedSummary: string | null;
    rewrittenBullets: { original: string; rewritten: string }[];
    suggestedSkillsToAdd: string[];
}

export interface ValidationResult {
    newOverallScore: number;
    newAtsScore: number;
    newToneAndStyle: number;
    newContent: number;
    newStructure: number;
    newSkills: number;
    scoreDelta: number;
    topImprovements: string[];
}

export interface CoPilotResult {
    extracted: ExtractedResume;
    gaps: GapAnalysis;
    rewrites: RewriteResult;
    validation: ValidationResult;
    originalScore: number;
}

export interface CoPilotScan {
    id: string;
    createdAt: string;
    result: CoPilotResult;
}

interface CoPilotAI {
    feedback: (path: string, message: string) => Promise<AIResponse | undefined>;
    chat: (
        prompt: string | ChatMessage[],
        imageURL?: string | PuterChatOptions,
        testMode?: boolean,
        options?: PuterChatOptions
    ) => Promise<AIResponse | undefined>;
}

const extractionPrompt = `You are a resume parser. Extract the content of this resume into a structured JSON object.
Return ONLY valid JSON, no markdown, no backticks.

{
  "summary": "string or null",
  "experience": [
    {
      "company": "string",
      "title": "string",
      "dates": "string",
      "bullets": ["string"]
    }
  ],
  "skills": ["string"],
  "education": [
    { "institution": "string", "degree": "string", "dates": "string" }
  ],
  "certifications": ["string or null"]
}`;

const getMessageText = (response: AIResponse | undefined): string => {
    if (!response?.message?.content) {
        throw new Error("AI response was empty.");
    }

    const { content } = response.message;
    if (typeof content === "string") return content;

    const firstText = content.find((item) => typeof item?.text === "string")?.text;
    if (!firstText) throw new Error("AI response did not include text content.");
    return firstText;
};

const parseJsonResponse = <T>(response: AIResponse | undefined): T => {
    const text = getMessageText(response).trim();
    const cleaned = text
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();

    return JSON.parse(cleaned) as T;
};

const clampScore = (score: unknown): number => {
    const value = Number(score);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
};

const normalizeExtractedResume = (resume: ExtractedResume): ExtractedResume => ({
    summary: resume.summary ?? null,
    experience: Array.isArray(resume.experience) ? resume.experience : [],
    skills: Array.isArray(resume.skills) ? resume.skills : [],
    education: Array.isArray(resume.education) ? resume.education : [],
    certifications: Array.isArray(resume.certifications)
        ? resume.certifications.filter((item): item is string => Boolean(item))
        : [],
});

const normalizeValidation = (
    validation: ValidationResult,
    originalScore: number
): ValidationResult => {
    const newOverallScore = clampScore(validation.newOverallScore);

    return {
        newOverallScore,
        newAtsScore: clampScore(validation.newAtsScore),
        newToneAndStyle: clampScore(validation.newToneAndStyle),
        newContent: clampScore(validation.newContent),
        newStructure: clampScore(validation.newStructure),
        newSkills: clampScore(validation.newSkills),
        scoreDelta: Number.isFinite(Number(validation.scoreDelta))
            ? Math.round(Number(validation.scoreDelta))
            : newOverallScore - originalScore,
        topImprovements: Array.isArray(validation.topImprovements)
            ? validation.topImprovements
            : [],
    };
};

const runTextAgent = async <T>(ai: CoPilotAI, prompt: string): Promise<T> => {
    const response = await ai.chat(prompt, { model: "claude-sonnet-4" });
    return parseJsonResponse<T>(response);
};

export const applyRewritesToResume = (
    extractedResume: ExtractedResume,
    rewrites: RewriteResult
) => {
    const rewrittenByOriginal = new Map(
        rewrites.rewrittenBullets.map((item) => [item.original, item.rewritten])
    );

    return {
        ...extractedResume,
        summary: rewrites.improvedSummary ?? extractedResume.summary,
        skills: Array.from(
            new Set([...extractedResume.skills, ...rewrites.suggestedSkillsToAdd])
        ),
        experience: extractedResume.experience.map((role) => ({
            ...role,
            bullets: role.bullets.map(
                (bullet) => rewrittenByOriginal.get(bullet) ?? bullet
            ),
        })),
    };
};

export const assembleResumeText = (resume: ExtractedResume): string => {
    const parts: string[] = [];

    if (resume.summary) {
        parts.push(`Summary\n${resume.summary}`);
    }

    if (resume.experience.length) {
        parts.push(
            `Experience\n${resume.experience
                .map((role) =>
                    [
                        `${role.title} | ${role.company} | ${role.dates}`,
                        ...role.bullets.map((bullet) => `- ${bullet}`),
                    ].join("\n")
                )
                .join("\n\n")}`
        );
    }

    if (resume.skills.length) {
        parts.push(`Skills\n${resume.skills.join(", ")}`);
    }

    if (resume.education.length) {
        parts.push(
            `Education\n${resume.education
                .map(
                    (item) =>
                        `${item.degree} | ${item.institution} | ${item.dates}`
                )
                .join("\n")}`
        );
    }

    if (resume.certifications.length) {
        parts.push(`Certifications\n${resume.certifications.join(", ")}`);
    }

    return parts.join("\n\n");
};

export async function runCoPilot({
    resumePath,
    jobTitle,
    jobDescription,
    originalScore,
    ai,
    onStep,
}: {
    resumePath: string;
    jobTitle: string;
    jobDescription: string;
    originalScore: number;
    ai: CoPilotAI;
    onStep: (step: CoPilotStep) => void;
}): Promise<CoPilotResult> {
    try {
        onStep("extracting");
        const extracted = normalizeExtractedResume(
            parseJsonResponse<ExtractedResume>(
                await ai.feedback(resumePath, extractionPrompt)
            )
        );

        onStep("analyzing");
        const gaps = await runTextAgent<GapAnalysis>(
            ai,
            `You are an ATS and hiring expert. Compare this resume against the job description below.
Return ONLY valid JSON, no markdown, no backticks.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Resume Data: ${JSON.stringify(extracted)}

Identify gaps and return:
{
  "missingKeywords": ["keywords in the JD not found anywhere in the resume"],
  "weakBullets": [
    {
      "original": "the weak bullet text",
      "reason": "why it is weak (no metric, wrong verb, missing keyword, etc.)"
    }
  ],
  "missingSkills": ["skills listed in JD missing from resume skills section"],
  "summaryGap": "what the summary is missing relative to this role, or null if no summary exists",
  "overallGapSummary": "2-3 sentence plain English summary of the biggest gaps"
}`
        );

        onStep("rewriting");
        const rewrites = await runTextAgent<RewriteResult>(
            ai,
            `You are an expert resume writer specializing in ATS optimization.
Using the gap analysis below, rewrite the identified weak bullets and improve the summary.

Rules:
- Start every bullet with a strong past-tense action verb
- Include a quantifiable metric in every bullet where plausible (%, time saved, $ impact, users)
- Weave in missing keywords naturally - never keyword-stuff
- Keep bullets to 1-2 lines maximum
- Do not invent experiences or companies - only improve how existing ones are described

Gap Analysis: ${JSON.stringify(gaps)}
Original Resume: ${JSON.stringify(extracted)}
Job Title: ${jobTitle}
Job Description: ${jobDescription}

Return ONLY valid JSON, no markdown, no backticks:
{
  "improvedSummary": "rewritten summary string, or null if no summary in original",
  "rewrittenBullets": [
    {
      "original": "exact original bullet text",
      "rewritten": "the improved version"
    }
  ],
  "suggestedSkillsToAdd": ["skills to add to the skills section - only real skills from the JD"]
}`
        );

        onStep("validating");
        const rewrittenResume = applyRewritesToResume(extracted, rewrites);
        const assembledResumeText = assembleResumeText(rewrittenResume);
        const validation = normalizeValidation(
            await runTextAgent<ValidationResult>(
                ai,
                `You are an ATS scoring system. Score this resume against the job description.
Be consistent with how ATS systems work - keyword match, formatting clarity,
section completeness, and relevance to the role.

Job Description: ${jobDescription}
Rewritten Resume Content: ${assembledResumeText}

Return ONLY valid JSON, no markdown, no backticks:
{
  "newOverallScore": number,
  "newAtsScore": number,
  "newToneAndStyle": number,
  "newContent": number,
  "newStructure": number,
  "newSkills": number,
  "scoreDelta": number,
  "topImprovements": ["3-4 specific things the rewrite fixed"]
}`
            ),
            originalScore
        );

        onStep("done");

        return {
            extracted,
            gaps,
            rewrites,
            validation,
            originalScore,
        };
    } catch (error) {
        onStep("error");
        throw error;
    }
}
