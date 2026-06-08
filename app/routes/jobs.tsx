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
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <section className="main-section">
                {/* Heading */}
                <div className="page-heading py-8 w-full">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-left">
                            <h1>Jobs Applied To</h1>
                            <h2>Track every application in one place.</h2>
                        </div>
                        <button onClick={openAdd} className="primary-button w-fit shrink-0">
                            + Add Job
                        </button>
                    </div>

                    {/* Stats bar */}
                    {stats.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-2">
                            {stats.map(({ status, count }) => (
                                <span key={status} className="text-sm text-gray-600">
                                    <StatusBadge status={status} /> <span className="ml-1 font-semibold">{count}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filter + Search */}
                <div className="flex flex-wrap gap-3 w-full items-center">
                    <input
                        type="text"
                        placeholder="Search company or role..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-64 !p-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                        {ALL_STATUSES.map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(f => f === s ? null : s)}
                                className={cn("rounded-full px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer",
                                    filterStatus === s ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table / Empty state */}
                {loadingJobs ? (
                    <div className="flex justify-center py-16">
                        <img src="/images/resume-scan.gif" alt="loading" className="w-32" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-16">
                        <p className="text-gray-500 text-lg">{jobs.length === 0 ? "No applications yet." : "No results match your filters."}</p>
                        {jobs.length === 0 && (
                            <button onClick={openAdd} className="primary-button w-fit">Log Your First Application</button>
                        )}
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto rounded-2xl shadow-sm border border-gray-100">
                        <table className="w-full text-sm bg-white">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                <tr>
                                    {([ ["companyName","Company"], ["jobTitle","Role"], ["status","Status"], ["applicationDate","Applied Date"], ["salary","Salary"], ["location","Location"] ] as [SortKey, string][]).map(([key, label]) => (
                                        <th key={key} className="px-4 py-3 text-left cursor-pointer hover:text-gray-800 whitespace-nowrap" onClick={() => toggleSort(key)}>
                                            {label}<SortIcon col={key} />
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left">Resume</th>
                                    <th className="px-4 py-3 text-left cursor-pointer hover:text-gray-800 whitespace-nowrap" onClick={() => toggleSort("nextStep")}>
                                        Next Step<SortIcon col="nextStep" />
                                    </th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayed.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold">
                                            {job.jobUrl
                                                ? <a href={job.jobUrl} target="_blank" rel="noreferrer" className="hover:underline text-blue-600">{job.companyName}</a>
                                                : job.companyName}
                                        </td>
                                        <td className="px-4 py-3">{job.jobTitle}</td>
                                        <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                                        <td className="px-4 py-3 whitespace-nowrap">{fmt(job.applicationDate)}</td>
                                        <td className="px-4 py-3 text-gray-500">{job.salary || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{job.location || "—"}</td>
                                        <td className="px-4 py-3">
                                            {job.resumeId
                                                ? <Link to={`/resume/${job.resumeId}`} className="text-blue-600 hover:underline text-xs">View</Link>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 max-w-[180px]">
                                            <span className="truncate block text-gray-600" title={job.nextStep}>{job.nextStep || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {deleteConfirmId === job.id ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-600">Delete?</span>
                                                    <button onClick={() => handleDelete(job.id)} className="text-xs text-red-600 font-semibold hover:underline cursor-pointer">Yes</button>
                                                    <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-500 hover:underline cursor-pointer">No</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => openEdit(job)} className="text-gray-400 hover:text-gray-700 cursor-pointer" title="Edit">
                                                        <img src="/icons/pin.svg" alt="edit" className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirmId(job.id)} className="text-gray-400 hover:text-red-500 cursor-pointer" title="Delete">
                                                        <img src="/icons/cross.svg" alt="delete" className="w-4 h-4" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-semibold">{editingJob ? "Edit Application" : "Add Application"}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                                <img src="/icons/cross.svg" alt="close" className="w-5 h-5" />
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
                                    <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ApplicationStatus }))} className="w-full p-4 inset-shadow rounded-2xl focus:outline-none bg-white">
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
                                    <input value={form.nextStep ?? ""} onChange={e => setForm(f => ({ ...f, nextStep: e.target.value }))} placeholder="e.g. Technical interview on 3/20" />
                                </Field>
                            </div>
                            <Field label="Link Resume Review">
                                <select value={form.resumeId ?? ""} onChange={e => setForm(f => ({ ...f, resumeId: e.target.value }))} className="w-full p-4 inset-shadow rounded-2xl focus:outline-none bg-white">
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
                                <button type="button" onClick={() => setJdOpen(o => !o)} className="text-sm text-blue-600 hover:underline cursor-pointer">
                                    {jdOpen ? "▾ Hide" : "▸ Add"} Job Description
                                </button>
                                {jdOpen && (
                                    <div className="mt-2">
                                        <textarea rows={5} value={form.jobDescription ?? ""} onChange={e => setForm(f => ({ ...f, jobDescription: e.target.value }))} placeholder="Paste the job description here..." className="w-full" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="primary-button w-fit">
                                    {editingJob ? "Save Changes" : "Add Application"}
                                </button>
                                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:bg-gray-50 cursor-pointer">
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
