import { useState } from "react";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

const steps = [
    { label: "Uploading resume" },
    { label: "Converting to image" },
    { label: "Uploading image" },
    { label: "Saving data" },
    { label: "Running AI analysis" },
    { label: "Done" },
];

const Upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [statusText, setStatusText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const { fs, kv, ai } = usePuterStore();
    const navigate = useNavigate();

    const step = (i: number, text: string) => { setCurrentStep(i); setStatusText(text); };

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: {
        companyName: string; jobTitle: string; jobDescription: string; file: File;
    }) => {
        setIsProcessing(true);

        step(0, "Uploading resume...");
        const uploadedFile = await fs.upload([file]);
        if (!uploadedFile) { setStatusText("❌ Failed to upload file."); return; }

        step(1, "Converting PDF to image...");
        const { convertPdfToImage } = await import("~/lib/pdf-to-image");
        const imageFile = await convertPdfToImage(file);
        if (!imageFile) { setStatusText("❌ Failed to convert PDF to image."); return; }

        step(2, "Uploading image...");
        const uploadedImage = await fs.upload([imageFile]);
        if (!uploadedImage) { setStatusText("❌ Failed to upload image."); return; }

        step(3, "Saving your data...");
        const uuid = generateUUID();
        const data: Resume = {
            id: uuid, companyName, jobTitle, jobDescription,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            feedback: {} as Feedback,
        };
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        step(4, "Analyzing with AI — this may take a moment...");
        const instructions = prepareInstructions(jobTitle, jobDescription);
        const response = await ai.feedback(uploadedFile.path, instructions);
        if (!response) { setStatusText("❌ AI analysis failed."); return; }

        const rawText = typeof response.message.content === "string"
            ? response.message.content
            : (response.message.content as { text: string }[])[0]?.text ?? "";

        data.feedback = JSON.parse(rawText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        step(5, "Analysis complete!");
        setTimeout(() => navigate(`/resume/${uuid}`), 600);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const companyName = formData.get("company-name") as string;
        const jobTitle = formData.get("job-title") as string;
        const jobDescription = formData.get("job-description") as string;
        if (!file) return;
        await handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="min-h-screen bg-gradient">
            <div className="absolute top-32 right-1/4 w-72 h-72 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

            <section className="main-section relative">
                <div className="page-heading pt-10 pb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1>Analyze Your Resume</h1>
                    <h2>Get an ATS score and expert AI feedback in seconds</h2>
                </div>

                {isProcessing ? (
                    <div className="glass-card p-10 w-full max-w-lg animate-in fade-in duration-300">
                        <div className="flex flex-col items-center gap-6">
                            <img src="/images/resume-scan.gif" className="w-48 opacity-90" alt="scanning" />
                            <div className="w-full flex flex-col gap-3">
                                {steps.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                                            i < currentStep ? "bg-green-500" :
                                            i === currentStep ? "primary-gradient animate-pulse" :
                                            "bg-gray-100"
                                        }`}>
                                            {i < currentStep && <img src="/icons/check.svg" alt="" className="w-3 h-3 brightness-0 invert" />}
                                        </div>
                                        <span className={`text-sm transition-all duration-300 ${
                                            i === currentStep ? "font-semibold text-gray-900" :
                                            i < currentStep ? "text-gray-400 line-through" :
                                            "text-gray-300"
                                        }`}>{s.label}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 text-center">{statusText}</p>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-8 w-full max-w-2xl animate-in fade-in duration-300">
                        <form id="upload-form" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4 w-full max-sm:grid-cols-1">
                                <div className="form-div">
                                    <label htmlFor="company-name">Company Name</label>
                                    <input type="text" name="company-name" placeholder="e.g. Google" id="company-name" required />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-title">Job Title</label>
                                    <input type="text" name="job-title" placeholder="e.g. Software Engineer" id="job-title" required />
                                </div>
                            </div>
                            <div className="form-div w-full">
                                <label htmlFor="job-description">Job Description <span className="text-gray-400 font-normal">(optional but improves accuracy)</span></label>
                                <textarea rows={4} name="job-description" placeholder="Paste the job description here..." id="job-description" />
                            </div>
                            <div className="form-div w-full">
                                <label>Resume PDF</label>
                                <FileUploader onFileSelect={(f) => setFile(f)} />
                            </div>
                            <button type="submit" className="primary-button w-fit px-8 py-3 text-base" disabled={!file}>
                                Analyze Resume →
                            </button>
                        </form>
                    </div>
                )}
            </section>
        </main>
    );
};

export default Upload;
