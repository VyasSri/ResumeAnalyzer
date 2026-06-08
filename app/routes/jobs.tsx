import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { cn, generateUUID } from "~/lib/utils";
import StatusBadge from "~/components/StatusBadge";

const ALL_STATUSES: ApplicationStatus[] = ["Saved", "Applied", "Phone Screen", "Interview", "Offer", "Rejected", "Withdrawn"];

const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = (): Omit<JobApplication, "id"> => ({
    companyName: "",
    jobTitle: "",
    status: "Applied",
    applicationDate: today(),
    jobUrl: "",
    salary: "",
    location: "",
    nextStep: "",
    notes: "",
    resumeId: "",
    jobDescription: "",
});

type SortKey = "companyName" | "jobTitle" | "status" | "applicationDate" | "salary" | "location" | "nextStep";

export default function Jobs() {
    const { kv, isLoading, auth } = usePuterStore();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState<JobApplication[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [filterStatus, setFilterStatus] = useState<ApplicationStatus | null>(null);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("applicationDate");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [jdOpen, setJdOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate("/auth?next=/jobs");
    }, [isLoading, auth.isAuthenticated]);

    const loadJobs = async () => {
        setLoadingJobs(true);
        const items = ((await kv.list("job:*", true)) ?? []) as KVItem[];
        setJobs(items.map((i) => JSON.parse(i.value) as JobApplication));
        setLoadingJobs(false);
    };

    useEffect(() => {
        if (!auth.isAuthenticated) return;
        loadJobs();
        kv.list("resume:*", true).then((items) => {
            const r = ((items ?? []) as KVItem[]).map((i) => JSON.parse(i.value) as Resume);
            setResumes(r);
        });
    }, [auth.isAuthenticated]);

    const openAdd = () => { setEditingJob(null); setForm(emptyForm()); setJdOpen(false); setModalOpen(true); };
    const openEdit = (job: JobApplication) => { setEditingJob(job); setForm({ ...job }); setJdOpen(!!job.jobDescription); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingJob) {
            await kv.set(`job:${editingJob.id}`, JSON.stringify({ ...editingJob, ...form }));
        } else {
            const id = generateUUID();
            await kv.set(`job:${id}`, JSON.stringify({ id, ...form }));
        }
        closeModal();
        loadJobs();
    };

    const handleDelete = async (id: string) => {
        await kv.delete(`job:${id}`);
        setDeleteConfirmId(null);
        loadJobs();
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const displayed = [...jobs]
        .filter(j => !filterStatus || j.status === filterStatus)
        .filter(j => !search || j.companyName.toLowerCase().includes(search.toLowerCase()) || j.jobTitle.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const av = String(a[sortKey] ?? "");
            const bv = String(b[sortKey] ?? "");
            return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    const stats = ALL_STATUSES.map(s => ({ status: s, count: jobs.filter(j => j.status === s).length })).filter(s => s.count > 0);

    const SortIcon = ({ col }: { col: SortKey }) => (
        <span className="ml-1 text-gray-400">
            {sortKey === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
    );

    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div className="form-div">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );

    return (
        <main className="min-h-screen bg-gradient">
            <div className="absolute top-24 left-1/3 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

            <section className="main-section relative">
                {/* Heading + stats */}
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                        <div>
                            <h1>Jobs Applied To</h1>
                            <h2 className="mt-1">Track every application in one place.</h2>
                        </div>
                        <button onClick={openAdd} className="primary-button w-fit px-6 py-2.5 shrink-0 mt-2">
                            + Add Job
                        </button>
                    </div>

                    {stats.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-4">
                            {stats.map(({ status, count }) => (
                                <div key={status} className="stat-card flex-row items-center gap-2 py-3 px-4">
                                    <StatusBadge status={status} />
                                    <span className="text-lg font-black text-gray-800">{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filter + Search */}
                <div className="flex flex-wrap gap-3 w-full items-center glass-card p-4">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                        <input
                            type="text"
                            placeholder="Search company or role..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 w-56"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ALL_STATUSES.map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(f => f === s ? null : s)}
                                className={cn(
                                    "rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200 cursor-pointer",
                                    filterStatus === s
                                        ? "primary-gradient text-white border-transparent shadow-md shadow-indigo-200"
                                        : "border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:text-indigo-600"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table / Empty state */}
                {loadingJobs ? (
                    <div className="flex flex-col items-center gap-3 py-20">
                        <img src="/images/resume-scan.gif" alt="loading" className="w-36 opacity-80" />
                        <p className="text-gray-400 text-sm animate-pulse">Loading applications...</p>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center gap-5 py-20 animate-in fade-in duration-300">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center text-3xl">
                            💼
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-700 text-lg">{jobs.length === 0 ? "No applications yet" : "No results"}</p>
                            <p className="text-gray-400 text-sm mt-1">{jobs.length === 0 ? "Start tracking your job search journey" : "Try adjusting your filters"}</p>
                        </div>
                        {jobs.length === 0 && (
                            <button onClick={openAdd} className="primary-button w-fit px-8">Log Your First Application</button>
                        )}
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/80 animate-in fade-in duration-300">
                        <table className="w-full text-sm bg-white">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {([ ["companyName","Company"], ["jobTitle","Role"], ["status","Status"], ["applicationDate","Date"], ["salary","Salary"], ["location","Location"] ] as [SortKey, string][]).map(([key, label]) => (
                                        <th key={key} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 whitespace-nowrap transition-colors" onClick={() => toggleSort(key)}>
                                            {label} <SortIcon col={key} />
                                        </th>
                                    ))}
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Resume</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 whitespace-nowrap transition-colors" onClick={() => toggleSort("nextStep")}>
                                        Next Step <SortIcon col="nextStep" />
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayed.map(job => (
                                    <tr key={job.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                                        <td className="px-4 py-3.5 font-semibold text-gray-900">
                                            {job.jobUrl
                                                ? <a href={job.jobUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{job.companyName} ↗</a>
                                                : job.companyName}
                                        </td>
                                        <td className="px-4 py-3.5 text-gray-600">{job.jobTitle}</td>
                                        <td className="px-4 py-3.5"><StatusBadge status={job.status} /></td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 text-xs">{fmt(job.applicationDate)}</td>
                                        <td className="px-4 py-3.5 text-gray-400 text-xs">{job.salary || "—"}</td>
                                        <td className="px-4 py-3.5 text-gray-400 text-xs">{job.location || "—"}</td>
                                        <td className="px-4 py-3.5">
                                            {job.resumeId
                                                ? <Link to={`/resume/${job.resumeId}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">View →</Link>
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 max-w-[180px]">
                                            <span className="truncate block text-gray-500 text-xs" title={job.nextStep}>{job.nextStep || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {deleteConfirmId === job.id ? (
                                                <div className="flex items-center gap-2 bg-red-50 rounded-lg px-2 py-1">
                                                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                                                    <button onClick={() => handleDelete(job.id)} className="text-xs text-red-600 font-bold hover:text-red-800 cursor-pointer">Yes</button>
                                                    <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">No</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                    <button onClick={() => openEdit(job)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center cursor-pointer transition-colors" title="Edit">
                                                        <img src="/icons/pin.svg" alt="edit" className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirmId(job.id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center cursor-pointer transition-colors" title="Delete">
                                                        <img src="/icons/cross.svg" alt="delete" className="w-3 h-3 opacity-60" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={closeModal}>
                    <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{editingJob ? "Edit Application" : "New Application"}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{editingJob ? "Update your application details" : "Log a new job application"}</p>
                            </div>
                            <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors">
                                <img src="/icons/cross.svg" alt="close" className="w-3.5 h-3.5 opacity-60" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                                <Field label="Company Name *">
                                    <input required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Google" />
                                </Field>
                                <Field label="Job Title *">
                                    <input required value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="e.g. Software Engineer" />
                                </Field>
                                <Field label="Status *">
                                    <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ApplicationStatus }))}>
                                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                                <Field label="Application Date *">
                                    <input required type="date" value={form.applicationDate} onChange={e => setForm(f => ({ ...f, applicationDate: e.target.value }))} />
                                </Field>
                                <Field label="Job URL">
                                    <input type="url" value={form.jobUrl ?? ""} onChange={e => setForm(f => ({ ...f, jobUrl: e.target.value }))} placeholder="https://..." />
                                </Field>
                                <Field label="Salary Range">
                                    <input value={form.salary ?? ""} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="e.g. $120k–$140k" />
                                </Field>
                                <Field label="Location">
                                    <input value={form.location ?? ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Remote" />
                                </Field>
                                <Field label="Next Step">
                                    <input value={form.nextStep ?? ""} onChange={e => setForm(f => ({ ...f, nextStep: e.target.value }))} placeholder="e.g. Interview on 3/20" />
                                </Field>
                            </div>
                            <Field label="Link Resume Review">
                                <select value={form.resumeId ?? ""} onChange={e => setForm(f => ({ ...f, resumeId: e.target.value }))}>
                                    <option value="">— None —</option>
                                    {resumes.map(r => (
                                        <option key={r.id} value={r.id}>{r.companyName} — {r.jobTitle}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Notes">
                                <textarea rows={3} value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Recruiter called 3/12" />
                            </Field>
                            <div>
                                <button type="button" onClick={() => setJdOpen(o => !o)} className="text-sm text-indigo-500 hover:text-indigo-700 font-medium cursor-pointer transition-colors">
                                    {jdOpen ? "▾ Hide" : "▸ Add"} Job Description
                                </button>
                                {jdOpen && (
                                    <div className="mt-3">
                                        <textarea rows={5} value={form.jobDescription ?? ""} onChange={e => setForm(f => ({ ...f, jobDescription: e.target.value }))} placeholder="Paste the job description here..." className="w-full" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2 border-t border-gray-100">
                                <button type="submit" className="primary-button w-fit px-6">
                                    {editingJob ? "Save Changes" : "Add Application"}
                                </button>
                                <button type="button" onClick={closeModal} className="px-5 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
