
export const AI_RESPONSE_FORMAT = `
Return ONLY a JSON object (no markdown, no backticks) matching this exact shape:
{
  "overallScore": number,
  "ats": {
    "score": number,
    "tips": string[]
  },
  "toneAndStyle": number,
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