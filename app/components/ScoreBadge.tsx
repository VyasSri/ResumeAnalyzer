export default function ScoreBadge({ score }: { score: number }) {
    const [label, cls] =
        score >= 70 ? ["Strong",     "bg-green-100 text-green-700"] :
        score >= 50 ? ["Good Start", "bg-yellow-100 text-yellow-700"] :
                      ["Needs Work", "bg-red-100 text-red-700"];
    return (
        <div className={`rounded-full px-3 py-0.5 text-xs font-semibold w-fit ${cls}`}>
            <p>{label}</p>
        </div>
    );
}
