import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ScoreBadge from "~/components/ScoreBadge";
import ScoreGauge from "~/components/ScoreGauge";
import {
    type CoPilotResult,
    type CoPilotScan,
    type CoPilotStep,
    runCoPilot,
} from "~/lib/copilot";
import { cn, generateUUID } from "~/lib/utils";
import { usePuterStore } from "~/lib/puter";

const steps: {
    id: CoPilotStep;
    label: string;
    description: string;
}[] = [
    {
        id: "extracting",
        label: "Extracting resume content",
        description: "Agent 1 of 4 - parsing structured resume data.",
    },
    {
        id: "analyzing",
        label: "Analyzing skill gaps",
        description: "Agent 2 of 4 - comparing against the job description.",
    },
    {
        id: "rewriting",
        label: "Rewriting weak sections",
        description: "Agent 3 of 4 - improving bullets and summary language.",
    },
    {
        id: "validating",
        label: "Validating and scoring",
        description: "Agent 4 of 4 - estimating the optimized ATS score.",
    },
];

const stepOrder = steps.map((item) => item.id);

const deltaClass = (delta: number) =>
    delta >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";

const ScoreRow = ({
    label,
    before,
    after,
}: {
    label: string;
    before: number;
    after: number;
}) => {
    const delta = after - before;

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <ScoreBadge score={after} />
            </div>
            <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-500">{before}</span>
                <span className="text-gray-300">to</span>
                <span className="text-lg font-black text-gray-900">{after}</span>
                <span
                    className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        deltaClass(delta)
                    )}
                >
                    {delta >= 0 ? "+" : ""}
                    {delta}
                </span>
            </div>
        </div>
    );
};

const copyText = async (text: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
};

const getRewriteLocation = (result: CoPilotResult, original: string) => {
    const normalizedOriginal = original.trim();

    for (const role of result.extracted.experience) {
        const bulletIndex = role.bullets.findIndex(
            (bullet) => bullet.trim() === normalizedOriginal
        );

        if (bulletIndex !== -1) {
            return {
                section: "Experience",
                title: role.title,
                company: role.company,
                dates: role.dates,
                bulletNumber: bulletIndex + 1,
            };
        }
    }

    return null;
};

const getWeakBulletReason = (result: CoPilotResult, original: string) =>
    result.gaps.weakBullets.find(
        (item) => item.original.trim() === original.trim()
    )?.reason;

const formatScanDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));

const getScoreDelta = (scan: CoPilotScan) => scan.result.validation.scoreDelta;

export default function CoPilotPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { ai, kv, isLoading, auth } = usePuterStore();

    const [resume, setResume] = useState<Resume | null>(null);
    const [history, setHistory] = useState<CoPilotScan[]>([]);
    const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
    const [step, setStep] = useState<CoPilotStep | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    const selectedScan =
        history.find((scan) => scan.id === selectedScanId) ?? history[0] ?? null;
    const result = selectedScan?.result ?? null;

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/resume/${id}/copilot`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate]);

    useEffect(() => {
        if (!auth.isAuthenticated || !id) return;

        const load = async () => {
            setLoadingData(true);
            const rawResume = await kv.get(`resume:${id}`);
            if (!rawResume) {
                setLoadingData(false);
                return;
            }

            setResume(JSON.parse(rawResume) as Resume);

            const rawHistory = await kv.get(`copilot-history:${id}`);
            if (rawHistory) {
                const parsedHistory = JSON.parse(rawHistory) as CoPilotScan[];
                setHistory(parsedHistory);
                setSelectedScanId(parsedHistory[0]?.id ?? null);
                setStep("done");
            } else {
                const cached = await kv.get(`copilot:${id}`);
                if (cached) {
                    const legacyScan: CoPilotScan = {
                        id: generateUUID(),
                        createdAt: new Date().toISOString(),
                        result: JSON.parse(cached) as CoPilotResult,
                    };

                    await kv.set(
                        `copilot-history:${id}`,
                        JSON.stringify([legacyScan])
                    );
                    setHistory([legacyScan]);
                    setSelectedScanId(legacyScan.id);
                    setStep("done");
                }
            }

            setLoadingData(false);
        };

        load();
    }, [auth.isAuthenticated, id, kv]);

    const activeStep = step ? stepOrder.indexOf(step) : -1;
    const statusText = useMemo(() => {
        if (step === "error") return "The pipeline stopped before completion.";
        if (step === "done") return "Co-Pilot analysis complete.";
        return steps.find((item) => item.id === step)?.description;
    }, [step]);

    const runPipeline = async () => {
        if (!resume || !id) return;

        setError(null);
        setSelectedScanId(null);

        try {
            const nextResult = await runCoPilot({
                resumePath: resume.resumePath,
                jobTitle: resume.jobTitle,
                jobDescription: resume.jobDescription,
                originalScore: resume.feedback?.overallScore ?? 0,
                ai,
                onStep: setStep,
            });

            const nextScan: CoPilotScan = {
                id: generateUUID(),
                createdAt: new Date().toISOString(),
                result: nextResult,
            };
            const nextHistory = [nextScan, ...history];

            await kv.set(`copilot-history:${id}`, JSON.stringify(nextHistory));
            await kv.set(`copilot:${id}`, JSON.stringify(nextResult));
            setHistory(nextHistory);
            setSelectedScanId(nextScan.id);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Co-Pilot failed to produce valid JSON."
            );
        }
    };

    if (loadingData) {
        return (
            <main className="min-h-screen bg-gradient">
                <section className="main-section justify-center min-h-screen">
                    <img
                        src="/images/resume-scan.gif"
                        alt="loading"
                        className="w-48 opacity-80"
                    />
                    <p className="text-sm text-gray-400 animate-pulse">
                        Loading Co-Pilot...
                    </p>
                </section>
            </main>
        );
    }

    if (!resume) {
        return (
            <main className="min-h-screen bg-gradient">
                <section className="main-section justify-center min-h-screen">
                    <p className="text-gray-500">Resume not found.</p>
                    <Link to="/" className="primary-button w-fit">
                        Go Home
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient">
            <section className="main-section">
                <div className="w-full max-w-6xl">
                    <Link to={`/resume/${id}`} className="back-button w-fit">
                        <img
                            src="/icons/back.svg"
                            alt="back"
                            className="h-4 w-4 opacity-60"
                        />
                        <span>Back to review</span>
                    </Link>
                </div>

                <header className="page-heading">
                    <h1>AI Resume Co-Pilot</h1>
                    <h2>
                        Four specialized agents parse, compare, rewrite, and
                        re-score your resume for {resume.jobTitle}.
                    </h2>
                </header>

                {!result && step !== "extracting" && step !== "analyzing" && step !== "rewriting" && step !== "validating" && (
                    <section className="gradient-border w-full max-w-5xl">
                        <div className="glass-card rounded-2xl p-8">
                            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
                                {steps.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                                    >
                                        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-black text-indigo-600">
                                            {index + 1}
                                        </div>
                                        <p className="font-bold text-gray-900">
                                            {item.label}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-gray-500">
                                            {item.description.replace(
                                                /^Agent \d of 4 - /,
                                                ""
                                            )}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {resume.companyName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Original score:{" "}
                                        {resume.feedback?.overallScore ?? 0}/100
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={runPipeline}
                                    className="primary-button w-fit px-8 py-3 text-base"
                                >
                                    Run Co-Pilot
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {(step === "extracting" ||
                    step === "analyzing" ||
                    step === "rewriting" ||
                    step === "validating" ||
                    step === "error") && (
                    <section className="glass-card w-full max-w-3xl p-8">
                        <div className="flex flex-col gap-4">
                            {steps.map((item, index) => {
                                const complete = index < activeStep;
                                const active = item.id === step;

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-start gap-4"
                                    >
                                        <div
                                            className={cn(
                                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                                                complete &&
                                                    "bg-green-500 text-white",
                                                active &&
                                                    "primary-gradient text-white animate-pulse",
                                                !complete &&
                                                    !active &&
                                                    "bg-gray-100 text-gray-300"
                                            )}
                                        >
                                            {complete ? "✓" : index + 1}
                                        </div>
                                        <div>
                                            <p
                                                className={cn(
                                                    "font-semibold",
                                                    active
                                                        ? "text-gray-900"
                                                        : "text-gray-500"
                                                )}
                                            >
                                                {item.label}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {statusText && (
                            <p className="mt-6 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
                                {statusText}
                            </p>
                        )}

                        {error && (
                            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                                <p className="text-sm font-semibold text-red-700">
                                    {error}
                                </p>
                                <button
                                    type="button"
                                    onClick={runPipeline}
                                    className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm"
                                >
                                    Try again
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {history.length > 0 && (
                    <section className="glass-card w-full max-w-6xl p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold uppercase text-indigo-500">
                                    Scan history
                                </p>
                                <h2 className="!text-2xl !text-gray-900 font-bold">
                                    Previous Co-Pilot runs
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={runPipeline}
                                className="primary-button w-fit"
                            >
                                Run New Scan
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                            {history.map((scan, index) => {
                                const selected = scan.id === selectedScan?.id;
                                const delta = getScoreDelta(scan);

                                return (
                                    <button
                                        type="button"
                                        key={scan.id}
                                        onClick={() =>
                                            setSelectedScanId(scan.id)
                                        }
                                        className={cn(
                                            "rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md",
                                            selected
                                                ? "border-indigo-300 ring-2 ring-indigo-100"
                                                : "border-gray-100"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    Scan #{history.length - index}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {formatScanDate(
                                                        scan.createdAt
                                                    )}
                                                </p>
                                            </div>
                                            <span
                                                className={cn(
                                                    "rounded-full px-2.5 py-1 text-xs font-bold",
                                                    deltaClass(delta)
                                                )}
                                            >
                                                {delta >= 0 ? "+" : ""}
                                                {delta}
                                            </span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-lg bg-gray-50 p-2">
                                                <p className="text-gray-400">
                                                    Before
                                                </p>
                                                <p className="font-black text-gray-800">
                                                    {scan.result.originalScore}
                                                </p>
                                            </div>
                                            <div className="rounded-lg bg-green-50 p-2">
                                                <p className="text-green-500">
                                                    After
                                                </p>
                                                <p className="font-black text-green-800">
                                                    {
                                                        scan.result.validation
                                                            .newOverallScore
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-xs text-gray-500">
                                            {
                                                scan.result.rewrites
                                                    .rewrittenBullets.length
                                            }{" "}
                                            rewrite
                                            {scan.result.rewrites
                                                .rewrittenBullets.length === 1
                                                ? ""
                                                : "s"}{" "}
                                            saved
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {result && (
                    <div className="flex w-full max-w-6xl flex-col gap-8">
                        <section className="glass-card p-8">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold uppercase text-indigo-500">
                                        Score comparison
                                    </p>
                                    <h2 className="!text-2xl !text-gray-900 font-bold">
                                        Before and after ATS fit
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
                                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                                    <p className="mb-3 text-center text-sm font-bold text-gray-500">
                                        Before
                                    </p>
                                    <ScoreGauge score={result.originalScore} />
                                </div>
                                <div className="rounded-2xl border border-green-100 bg-green-50/40 p-6">
                                    <div className="mb-3 flex items-center justify-center gap-2">
                                        <p className="text-sm font-bold text-green-700">
                                            After
                                        </p>
                                        <span
                                            className={cn(
                                                "rounded-full px-2.5 py-1 text-xs font-bold",
                                                deltaClass(
                                                    result.validation.scoreDelta
                                                )
                                            )}
                                        >
                                            {result.validation.scoreDelta >= 0
                                                ? "+"
                                                : ""}
                                            {result.validation.scoreDelta}
                                        </span>
                                    </div>
                                    <ScoreGauge
                                        score={
                                            result.validation.newOverallScore
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3 max-lg:grid-cols-1">
                                <ScoreRow
                                    label="ATS"
                                    before={resume.feedback?.ats?.score ?? 0}
                                    after={result.validation.newAtsScore}
                                />
                                <ScoreRow
                                    label="Tone and style"
                                    before={resume.feedback?.toneAndStyle ?? 0}
                                    after={result.validation.newToneAndStyle}
                                />
                                <ScoreRow
                                    label="Content"
                                    before={resume.feedback?.content ?? 0}
                                    after={result.validation.newContent}
                                />
                                <ScoreRow
                                    label="Structure"
                                    before={resume.feedback?.structure ?? 0}
                                    after={result.validation.newStructure}
                                />
                                <ScoreRow
                                    label="Skills"
                                    before={resume.feedback?.skills ?? 0}
                                    after={result.validation.newSkills}
                                />
                            </div>

                            {result.validation.topImprovements.length > 0 && (
                                <div className="mt-6 rounded-xl bg-white p-5">
                                    <p className="mb-3 font-bold text-gray-900">
                                        Top improvements
                                    </p>
                                    <ul className="flex flex-col gap-2">
                                        {result.validation.topImprovements.map(
                                            (item) => (
                                                <li
                                                    key={item}
                                                    className="text-sm leading-6 text-gray-600"
                                                >
                                                    {item}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}
                        </section>

                        <section className="glass-card p-8">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold uppercase text-indigo-500">
                                        Rewritten bullets
                                    </p>
                                    <h2 className="!text-2xl !text-gray-900 font-bold">
                                        Diff view
                                    </h2>
                                </div>
                                {result.rewrites.rewrittenBullets.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            copyText(
                                                result.rewrites.rewrittenBullets
                                                    .map(
                                                        (item) =>
                                                            `- ${item.rewritten}`
                                                    )
                                                    .join("\n")
                                            )
                                        }
                                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                                    >
                                        Copy All Rewrites
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-4">
                                {result.rewrites.rewrittenBullets.length ? (
                                    result.rewrites.rewrittenBullets.map(
                                        (item, index) => {
                                            const location = getRewriteLocation(
                                                result,
                                                item.original
                                            );
                                            const reason = getWeakBulletReason(
                                                result,
                                                item.original
                                            );

                                            return (
                                                <div
                                                    key={`${item.original}-${index}`}
                                                    className="overflow-hidden rounded-xl border border-gray-100 bg-white"
                                                >
                                                    <div className="border-b border-indigo-100 bg-indigo-50 p-4">
                                                        <p className="text-xs font-bold uppercase text-indigo-600">
                                                            Where to update
                                                        </p>
                                                        {location ? (
                                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-indigo-950">
                                                                <span className="rounded-full bg-white px-3 py-1 font-bold shadow-sm">
                                                                    {
                                                                        location.section
                                                                    }
                                                                </span>
                                                                <span className="font-semibold">
                                                                    {
                                                                        location.title
                                                                    }
                                                                </span>
                                                                <span className="text-indigo-300">
                                                                    at
                                                                </span>
                                                                <span className="font-semibold">
                                                                    {
                                                                        location.company
                                                                    }
                                                                </span>
                                                                {location.dates && (
                                                                    <span className="text-indigo-500">
                                                                        {
                                                                            location.dates
                                                                        }
                                                                    </span>
                                                                )}
                                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                                                    Bullet #
                                                                    {
                                                                        location.bulletNumber
                                                                    }
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="mt-2 text-sm text-indigo-900">
                                                                Match this to
                                                                the exact
                                                                original bullet
                                                                below.
                                                            </p>
                                                        )}
                                                        {reason && (
                                                            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm leading-6 text-indigo-900">
                                                                Why: {reason}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="border-b border-red-100 bg-red-50 p-4">
                                                    <p className="mb-2 text-xs font-bold uppercase text-red-600">
                                                        Before
                                                    </p>
                                                    <p className="text-sm leading-6 text-red-900 line-through decoration-red-400">
                                                        {item.original}
                                                    </p>
                                                </div>
                                                <div className="bg-green-50 p-4">
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <p className="text-xs font-bold uppercase text-green-700">
                                                            After
                                                        </p>
                                                        <button
                                                            type="button"
                                                            aria-label="Copy rewritten bullet"
                                                            onClick={() =>
                                                                copyText(
                                                                    item.rewritten
                                                                )
                                                            }
                                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-green-700 shadow-sm hover:bg-green-100"
                                                        >
                                                            ⧉
                                                        </button>
                                                    </div>
                                                    <p className="text-sm font-semibold leading-6 text-green-950">
                                                        {item.rewritten}
                                                    </p>
                                                </div>
                                            </div>
                                            );
                                        }
                                    )
                                ) : (
                                    <p className="rounded-xl bg-white p-5 text-sm text-gray-500">
                                        No weak bullets were returned by the
                                        rewrite agent.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
                            <div className="glass-card p-6">
                                <p className="font-bold text-gray-900">
                                    Missing keywords
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Add these to your skills section or weave
                                    them into your bullet points.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {result.gaps.missingKeywords.map((item) => (
                                        <button
                                            type="button"
                                            key={item}
                                            onClick={() => copyText(item)}
                                            className="rounded-full bg-orange-100 px-3 py-1.5 text-sm font-semibold text-orange-800"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <p className="font-bold text-gray-900">
                                    Skills to add
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Only add these if you genuinely have them.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {result.rewrites.suggestedSkillsToAdd.map(
                                        (item) => (
                                            <span
                                                key={item}
                                                className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-800"
                                            >
                                                {item}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>

                            {result.rewrites.improvedSummary && (
                                <div className="glass-card p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="font-bold text-gray-900">
                                            Summary rewrite
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copyText(
                                                    result.rewrites
                                                        .improvedSummary ?? ""
                                                )
                                            }
                                            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    {result.extracted.summary && (
                                        <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-400">
                                            {result.extracted.summary}
                                        </p>
                                    )}
                                    <p className="mt-3 rounded-xl bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-950">
                                        {result.rewrites.improvedSummary}
                                    </p>
                                </div>
                            )}

                            <div className="glass-card p-6">
                                <p className="font-bold text-gray-900">
                                    Gap overview
                                </p>
                                <p className="mt-4 border-l-4 border-indigo-300 pl-4 text-sm leading-6 text-gray-600">
                                    {result.gaps.overallGapSummary}
                                </p>
                            </div>
                        </section>
                    </div>
                )}
            </section>
        </main>
    );
}
