export default function ATS({ score, tips }: { score: number; tips: string[] }) {
    const [bgColor, textColor] =
        score >= 70 ? ["from-green-50 to-green-100", "text-green-700"] :
        score >= 50 ? ["from-yellow-50 to-yellow-100", "text-yellow-700"] :
                      ["from-red-50 to-red-100", "text-red-700"];

    return (
        <div className="gradient-border">
            <div className="flex flex-col gap-4 bg-white rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${bgColor} px-6 py-4 flex items-center gap-3`}>
                    <img src="/icons/ats-good.svg" alt="ATS" className="w-6 h-6" />
                    <p className={`font-semibold text-lg ${textColor}`}>ATS Score: {score}/100</p>
                </div>
                <div className="px-6 pb-5 flex flex-col gap-3">
                    <p className="text-gray-500 text-sm">How well your resume performs in ATS systems</p>
                    <ul className="flex flex-col gap-2">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="mt-1 shrink-0">•</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
