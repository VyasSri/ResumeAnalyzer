import { useEffect, useState } from "react";
import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";
import StatusBadge from "~/components/StatusBadge";
import { cn } from "~/lib/utils";

const PAGE_SIZE = 20;

type RecordType = "resume" | "job";

interface WipeItem {
    key: string;
    type: RecordType;
    title: string;
    subtitle: string;
    id: string;
    linkTo: string;
}

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function Wipe() {
    const { kv, auth } = usePuterStore();

    const [items, setItems] = useState<WipeItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [wiping, setWiping] = useState(false);
    const [wipedKeys, setWipedKeys] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState<RecordType | "all">("all");

    const loadItems = async () => {
        setLoading(true);
        const [resumeRaw, jobRaw] = await Promise.all([
            kv.list("resume:*", true),
            kv.list("job:*", true),
        ]);

        const resumes: WipeItem[] = ((resumeRaw ?? []) as KVItem[]).map((item) => {
            const r: Resume = JSON.parse(item.value);
            return {
                key: item.key,
                type: "resume",
                title: r.companyName ?? "Unknown Company",
                subtitle: r.jobTitle ?? "Unknown Role",
                id: r.id,
                linkTo: `/resume/${r.id}`,
            };
        });

        const jobs: WipeItem[] = ((jobRaw ?? []) as KVItem[]).map((item) => {
            const j: JobApplication = JSON.parse(item.value);
            return {
                key: item.key,
                type: "job",
                title: j.companyName,
                subtitle: j.jobTitle,
                id: j.id,
                linkTo: `/jobs`,
                status: j.status,
                date: j.applicationDate,
            } as WipeItem & { status: ApplicationStatus; date: string };
        });

        setItems([...resumes, ...jobs]);
        setLoading(false);
    };

    useEffect(() => {
        if (auth.isAuthenticated) loadItems();
    }, [auth.isAuthenticated]);

    const filtered = filter === "all" ? items : items.filter(i => i.type === filter);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const toggleSelect = (key: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const allKeys = filtered.map(i => i.key);
        const allSelected = allKeys.every(k => selected.has(k));
        setSelected(allSelected ? new Set() : new Set(allKeys));
    };

    const handleWipeSelected = async () => {
        if (selected.size === 0) return;
        setWiping(true);
        const keys = Array.from(selected);
        const wiped: string[] = [];
        for (const key of keys) {
            await kv.delete(key);
            wiped.push(key);
        }
        setWipedKeys(prev => [...prev, ...wiped]);
        setSelected(new Set());
        await loadItems();
        setWiping(false);
    };

    const setPageSafe = (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1)));

    const allOnPageSelected = paginated.length > 0 && paginated.every(i => selected.has(i.key));

    const togglePageSelection = () => {
        const pageKeys = paginated.map(i => i.key);
        setSelected(prev => {
            const next = new Set(prev);
            if (allOnPageSelected) pageKeys.forEach(k => next.delete(k));
            else pageKeys.forEach(k => next.add(k));
            return next;
        });
    };

    return (
        <main className="min-h-screen bg-gradient">
            <div className="absolute top-24 right-1/3 w-72 h-72 bg-red-100/20 rounded-full blur-3xl pointer-events-none" />

            <section className="main-section relative">
                {/* Header */}
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
                        <div>
                            <h1>Data Manager</h1>
                            <h2 className="mt-1">Select and delete resumes or job applications.</h2>
                        </div>
                        <button
                            onClick={handleWipeSelected}
                            disabled={selected.size === 0 || wiping}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-md shrink-0 mt-2",
                                selected.size > 0
                                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200 hover:-translate-y-0.5 cursor-pointer"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            {wiping ? "Deleting..." : `Delete Selected (${selected.size})`}
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 flex-wrap mt-4">
                        {(["all", "resume", "job"] as const).map(f => {
                            const count = f === "all" ? items.length : items.filter(i => i.type === f).length;
                            return (
                                <button
                                    key={f}
                                    onClick={() => { setFilter(f); setPage(0); }}
                                    className={cn(
                                        "stat-card flex-row items-center gap-2 py-2.5 px-5 cursor-pointer transition-all duration-200",
                                        filter === f ? "ring-2 ring-indigo-400 shadow-md" : "hover:shadow-md"
                                    )}
                                >
                                    <span className="text-xl font-black text-gradient">{count}</span>
                                    <span className="text-xs text-gray-500 font-medium capitalize">{f === "all" ? "Total Records" : f === "resume" ? "Resumes" : "Job Apps"}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Wiped log */}
                {wipedKeys.length > 0 && (
                    <div className="w-full glass-card p-4 border-l-4 border-green-400 animate-in fade-in duration-300">
                        <p className="text-sm font-semibold text-green-700 mb-2">✓ Deleted {wipedKeys.length} record(s)</p>
                        <div className="flex flex-wrap gap-2">
                            {wipedKeys.map(k => (
                                <span key={k} className="text-xs bg-green-50 text-green-600 rounded-full px-3 py-1 font-mono">{k}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center gap-3 py-20">
                        <img src="/images/resume-scan.gif" alt="loading" className="w-36 opacity-80" />
                        <p className="text-gray-400 text-sm animate-pulse">Loading records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-5 py-20">
                        <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-3xl">🗑️</div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-700 text-lg">Nothing to delete</p>
                            <p className="text-gray-400 text-sm mt-1">No {filter === "all" ? "records" : filter + "s"} found</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Select controls */}
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={togglePageSelection}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer transition-colors"
                                >
                                    {allOnPageSelected ? "Deselect page" : "Select page"}
                                </button>
                                <span className="text-gray-300">·</span>
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer transition-colors"
                                >
                                    {filtered.every(i => selected.has(i.key)) ? "Deselect all" : `Select all ${filtered.length}`}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                                {filtered.length} record{filtered.length !== 1 ? "s" : ""} · page {page + 1} of {totalPages}
                            </p>
                        </div>

                        {/* Cards grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full animate-in fade-in duration-300">
                            {paginated.map(item => {
                                const isSelected = selected.has(item.key);
                                const jobItem = item as WipeItem & { status?: ApplicationStatus; date?: string };
                                return (
                                    <div
                                        key={item.key}
                                        onClick={() => toggleSelect(item.key)}
                                        className={cn(
                                            "relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 group",
                                            isSelected
                                                ? "border-red-400 bg-red-50/60 shadow-md shadow-red-100"
                                                : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md shadow-sm"
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div className={cn(
                                            "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                                            isSelected ? "border-red-500 bg-red-500" : "border-gray-300 group-hover:border-indigo-400"
                                        )}>
                                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                        </div>

                                        {/* Type badge */}
                                        <span className={cn(
                                            "inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 mb-3",
                                            item.type === "resume"
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-purple-100 text-purple-700"
                                        )}>
                                            {item.type === "resume" ? "📄 Resume" : "💼 Job App"}
                                        </span>

                                        <p className="font-bold text-gray-900 text-sm leading-tight pr-6">{item.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</p>

                                        {item.type === "job" && jobItem.status && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <StatusBadge status={jobItem.status} />
                                                {jobItem.date && <span className="text-xs text-gray-400">{fmt(jobItem.date)}</span>}
                                            </div>
                                        )}

                                        {/* Link — stop propagation so clicking it doesn't toggle select */}
                                        <Link
                                            to={item.linkTo}
                                            onClick={e => e.stopPropagation()}
                                            className="mt-3 inline-block text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                                        >
                                            View →
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-3 mt-2">
                                <button
                                    onClick={() => setPageSafe(page - 1)}
                                    disabled={page === 0}
                                    className={cn(
                                        "w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200",
                                        page === 0 ? "border-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer text-gray-600"
                                    )}
                                >
                                    ←
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPageSafe(i)}
                                        className={cn(
                                            "w-9 h-9 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer",
                                            i === page
                                                ? "primary-gradient text-white shadow-md shadow-indigo-200"
                                                : "border border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPageSafe(page + 1)}
                                    disabled={page === totalPages - 1}
                                    className={cn(
                                        "w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200",
                                        page === totalPages - 1 ? "border-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer text-gray-600"
                                    )}
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
