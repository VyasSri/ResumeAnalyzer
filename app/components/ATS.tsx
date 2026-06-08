export default function ATS({ score, tips }: { score: number; tips: string[] }) {
    const [bar, label, icon] =
        score >= 70 ? ["bg-green-500", "text-green-700", "/icons/ats-good.svg"] :
        score >= 50 ? ["bg-yellow-400", "text-yellow-700", "/icons/ats-warning.svg"] :
                      ["bg-red-500",   "text-red-700",    "/icons/ats-bad.svg"];

    return (
        <div className="flex flex-col gap-4 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                        <img src={icon} alt="ATS" className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ATS Score</p>
                        <p className={`text-lg font-black ${label}`}>{score}<span className="text-gray-300 text-sm font-normal">/100</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">ATS compatibility</p>
                </div>
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Recommendations</p>
                {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-700 py-2 border-b border-gray-50 last:border-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span>{tip}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
