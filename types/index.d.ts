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
    ats: {
        score: number;
        tips: string[];
    };
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

interface KVItem {
    key: string;
    value: string;
}

type ApplicationStatus =
    | "Saved"
    | "Applied"
    | "Phone Screen"
    | "Interview"
    | "Offer"
    | "Rejected"
    | "Withdrawn";

interface JobApplication {
    id: string;
    companyName: string;
    jobTitle: string;
    jobUrl?: string;
    salary?: string;
    location?: string;
    jobDescription?: string;
    applicationDate: string;
    status: ApplicationStatus;
    notes?: string;
    nextStep?: string;
    resumeId?: string;
}
