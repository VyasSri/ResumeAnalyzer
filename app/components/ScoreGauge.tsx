export default function ScoreGauge({ score }: { score: number }) {
    const radius = 54;
    const circumference = Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";

    return (
        <div className="flex flex-col items-center">
            <svg width="140" height="80" viewBox="0 0 140 80">
                <path d="M 13 70 A 54 54 0 0 1 127 70" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
                <path
                    d="M 13 70 A 54 54 0 0 1 127 70"
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={`${offset}`}
                />
                <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
                    {score}
                </text>
            </svg>
            <p className="text-xs text-gray-500 -mt-1">out of 100</p>
        </div>
    );
}
