import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Resumaxxer" },
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

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Track Your Applications & Resume Ratings</h1>
                    <h2>Review your submissions & check AI-powered feedback.</h2>
                </div>
                {loadingResumes ? (
                    <div className="flex justify-center w-full py-16">
                        <img src="/images/resume-scan.gif" alt="loading" className="w-48" />
                    </div>
                ) : resumes.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-16">
                        <p className="text-gray-500 text-lg">No resumes found.</p>
                        <button onClick={() => navigate("/upload")} className="primary-button w-fit">
                            Upload Your First Resume
                        </button>
                    </div>
                ) : (
                    <div className="resumes-section">
                        {resumes.map((resume) => (
                            <ResumeCard key={resume.id} resume={resume} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
