import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export default function ResumePage() {
    const { id } = useParams<{ id: string }>();
    const { kv, fs, isLoading, auth } = usePuterStore();
    const navigate = useNavigate();

    const [resume, setResume] = useState<Resume | null>(null);
    const [resumeUrl, setResumeUrl] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string>("");
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading, auth.isAuthenticated]);

    useEffect(() => {
        if (!auth.isAuthenticated || !id) return;
        const load = async () => {
            setLoadingData(true);
            const raw = await kv.get(`resume:${id}`);
            if (!raw) { setLoadingData(false); return; }
            const data: Resume = JSON.parse(raw);
            setResume(data);

            const pdfBlob = await fs.read(data.resumePath);
            if (pdfBlob) setResumeUrl(URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" })));

            const imgBlob = await fs.read(data.imagePath);
            if (imgBlob) setImageUrl(URL.createObjectURL(imgBlob));

            setLoadingData(false);
        };
        load();
    }, [auth.isAuthenticated, id]);

    if (loadingData) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <img src="/images/resume-scan.gif" alt="loading" className="w-64" />
            </main>
        );
    }

    if (!resume) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-gray-500">Resume not found.</p>
                <Link to="/" className="primary-button w-fit">Go Home</Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col">
            <div className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="back" className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                </Link>
                <div className="flex flex-col items-end">
                    <p className="font-semibold">{resume.companyName}</p>
                    <p className="text-gray-500 text-sm">{resume.jobTitle}</p>
                </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row flex-1">
                {/* Left — resume image */}
                <div className="lg:w-1/2 bg-gradient sticky top-0 lg:h-screen flex items-start justify-center p-6 overflow-auto">
                    {imageUrl ? (
                        <a href={resumeUrl} target="_blank" rel="noreferrer">
                            <img src={imageUrl} alt="resume preview" className="rounded-xl shadow-lg max-w-full" />
                        </a>
                    ) : (
                        <img src="/images/resume-scan-2.gif" alt="loading" className="w-48" />
                    )}
                </div>

                {/* Right — feedback */}
                <div className="feedback-section">
                    <h2 className="!text-black font-bold">Resume Review</h2>
                    {resume.feedback?.overallScore !== undefined ? (
                        <div className="flex flex-col gap-8">
                            <Summary feedback={resume.feedback} />
                            <ATS score={resume.feedback.ats.score} tips={resume.feedback.ats.tips} />
                            <Details feedback={resume.feedback} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 mt-8">
                            <p className="text-gray-500">Analysis in progress...</p>
                            <img src="/images/resume-scan.gif" alt="scanning" className="w-48" />
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
