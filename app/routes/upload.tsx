import Navbar from "~/components/Navbar";
import { useState } from "react";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

const Upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const { fs, kv, ai } = usePuterStore();
    const navigate = useNavigate();

    const handleAnalyze = async ({
        companyName, jobTitle, jobDescription, file,
    }: {
        companyName: string; jobTitle: string; jobDescription: string; file: File;
    }) => {
        setIsProcessing(true);

        setStatusText("Uploading resume...");
        const uploadedFile = await fs.upload([file]);
        if (!uploadedFile) { setStatusText("❌ Failed to upload file."); return; }

        setStatusText("Converting to image...");
        const { convertPdfToImage } = await import("~/lib/pdf-to-image");
        const imageFile = await convertPdfToImage(file);
        if (!imageFile) { setStatusText("❌ Failed to convert PDF to image."); return; }

        setStatusText("Uploading image...");
        const uploadedImage = await fs.upload([imageFile]);
        if (!uploadedImage) { setStatusText("❌ Failed to upload image."); return; }

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
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream internship</h1>
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-4 mt-8">
                            <h2 className="text-xl font-semibold text-gray-700">{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full max-w-md" alt="scanning" />
                        </div>
                    ) : (
                        <>
                            <h2>Drop your resume for your ATS score and tips to improve</h2>
                            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                                <div className="form-div">
                                    <label htmlFor="company-name">Company Name</label>
                                    <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-title">Job Title</label>
                                    <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-description">Job Description</label>
                                    <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="uploader">Upload Resume</label>
                                    <FileUploader onFileSelect={(f) => setFile(f)} />
                                </div>
                                <button type="submit" className="primary-button w-fit" disabled={!file}>
                                    Analyze Resume
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
