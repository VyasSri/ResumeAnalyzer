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
            <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient">
                <img src="/images/resume-scan.gif" alt="loading" className="w-52 opacity-80" />
                <p className="text-gray-400 text-sm animate-pulse">Loading your resume review...</p>
            </main>
        );
    }

    if (!resume) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient">
                <p className="text-gray-500">Resume not found.</p>
                <Link to="/" className="primary-button w-fit">Go Home</Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col bg-white">
            {/* Sub-nav */}
            <div className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="back" className="w-4 h-4 opacity-60" />
                    <span>Back</span>
                </Link>
                <div className="flex flex-col items-end">
                    <p className="font-semibold text-gray-900">{resume.companyName}</p>
                    <p className="text-gray-400 text-xs">{resume.jobTitle}</p>
                </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row flex-1 min-h-0">
                {/* Left — resume preview */}
                <div className="lg:w-1/2 bg-gradient sticky top-[57px] lg:h-[calc(100vh-57px)] flex items-start justify-center p-8 overflow-auto border-r border-gray-100">
                    {imageUrl ? (
                        <a href={resumeUrl} target="_blank" rel="noreferrer" className="group relative block">
                            <img
                                src={imageUrl}
                                alt="resume preview"
                                className="rounded-2xl shadow-2xl max-w-full group-hover:shadow-indigo-200/60 transition-shadow duration-300"
                            />
                            <div className="absolute inset-0 rounded-2xl bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors duration-300 flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm text-indigo-600 text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
                                    Open PDF ↗
                                </span>
                            </div>
                        </a>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <img src="/images/resume-scan-2.gif" alt="loading" className="w-40 opacity-60" />
                            <p className="text-gray-400 text-sm animate-pulse">Loading preview...</p>
                        </div>
                    )}
                </div>

                {/* Right — feedback */}
                <div className="feedback-section max-lg:border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="!text-gray-900 font-bold text-2xl">Resume Review</h2>
                        {resume.feedback?.overallScore !== undefined && id && (
                            <div className="flex items-center gap-3">
                                <Link to={`/resume/${id}/copilot`} className="primary-button w-fit">
                                    ✦ Launch AI Co-Pilot
                                </Link>
                                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                                    <span className="text-xs text-indigo-500 font-medium">Overall</span>
                                    <span className="text-2xl font-black text-indigo-600">{resume.feedback.overallScore}</span>
                                    <span className="text-xs text-indigo-400">/100</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {resume.feedback?.overallScore !== undefined ? (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                            <Summary feedback={resume.feedback} />
                            <ATS score={resume.feedback.ats.score} tips={resume.feedback.ats.tips} />
                            <Details feedback={resume.feedback} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-12">
                            <img src="/images/resume-scan.gif" alt="scanning" className="w-40 opacity-80" />
                            <p className="text-gray-400 text-sm animate-pulse">Analysis in progress...</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
