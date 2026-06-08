import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "ResMind — Resume Analyzer" },
        { name: "description", content: "Smart Feedback to Optimize Your Resume" },
    ];
}

export default function Home() {
    const { kv, isLoading, auth } = usePuterStore();
    const navigate = useNavigate();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate("/auth?next=/");
    }, [isLoading, auth.isAuthenticated]);

    useEffect(() => {
        if (!auth.isAuthenticated) return;
        const loadResumes = async () => {
            setLoadingResumes(true);
            const items = (await kv.list("resume:*", true)) as KVItem[];
            const parsed = items?.map((item) => JSON.parse(item.value) as Resume) ?? [];
            setResumes(parsed);
            setLoadingResumes(false);
        };
        loadResumes();
    }, [auth.isAuthenticated]);

    const avgScore = resumes.length
        ? Math.round(resumes.reduce((s, r) => s + (r.feedback?.overallScore ?? 0), 0) / resumes.length)
        : null;

    return (
        <main className="min-h-screen bg-gradient">
            <div className="absolute top-20 left-1/3 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-40 right-1/4 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl pointer-events-none" />

            <section className="relative main-section">
                {/* Hero */}
                <div className="page-heading pt-10 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1>Track Your Resume<br />& Applications</h1>
                    <h2>AI-powered feedback to land your dream role.</h2>

                    {/* Stats */}
                    {resumes.length > 0 && (
                        <div className="flex gap-4 mt-2 flex-wrap justify-center">
                            <div className="stat-card text-center min-w-[100px]">
                                <p className="text-3xl font-bold text-gradient">{resumes.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Resumes</p>
                            </div>
                            {avgScore !== null && (
                                <div className="stat-card text-center min-w-[100px]">
                                    <p className="text-3xl font-bold text-gradient">{avgScore}</p>
                                    <p className="text-xs text-gray-500 font-medium">Avg Score</p>
                                </div>
                            )}
                            <div className="stat-card text-center min-w-[100px] cursor-pointer hover:shadow-md transition-all duration-200" onClick={() => navigate("/upload")}>
                                <p className="text-3xl font-bold text-indigo-500">+</p>
                                <p className="text-xs text-gray-500 font-medium">New Review</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                {loadingResumes ? (
                    <div className="flex flex-col items-center gap-4 py-20">
                        <img src="/images/resume-scan.gif" alt="loading" className="w-40 opacity-80" />
                        <p className="text-gray-400 text-sm animate-pulse">Loading your resumes...</p>
                    </div>
                ) : resumes.length === 0 ? (
                    <div className="flex flex-col items-center gap-6 py-20 animate-in fade-in duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center">
                            <img src="/icons/info.svg" alt="" className="w-10 h-10 opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="text-gray-700 font-semibold text-lg">No resumes yet</p>
                            <p className="text-gray-400 text-sm mt-1">Upload your first resume to get AI-powered feedback</p>
                        </div>
                        <button onClick={() => navigate("/upload")} className="primary-button w-fit px-8 py-3 text-base">
                            Upload Your First Resume
                        </button>
                    </div>
                ) : (
                    <div className="resumes-section animate-in fade-in duration-500">
                        {resumes.map((resume) => (
                            <ResumeCard key={resume.id} resume={resume} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
