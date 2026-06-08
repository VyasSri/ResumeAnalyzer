import ScoreGauge from "~/components/ScoreGauge";
import ScoreBadge from "~/components/ScoreBadge";

const categoryIcons: Record<string, string> = {
    "Tone & Style": "🎯",
    "Content": "📝",
    "Structure": "🏗️",
    "Skills": "⚡",
};

function Category({ title, score }: { title: string; score: number }) {
    const color = score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
    const bg = score >= 70 ? "bg-green-50 border-green-100" : score >= 50 ? "bg-yellow-50 border-yellow-100" : "bg-red-50 border-red-100";
    return (
        <div className={`category ${bg}`}>
            <div className="flex items-center gap-2">
                <span className="text-base">{categoryIcons[title]}</span>
                <div>
                    <p className="text-xs font-medium text-gray-600">{title}</p>
                    <p className="text-lg font-black"><span className={color}>{score}</span><span className="text-gray-300 text-sm font-normal">/100</span></p>
                </div>
            </div>
            <ScoreBadge score={score} />
        </div>
    );
}

export default function Summary({ feedback }: { feedback: Feedback }) {
    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <ScoreGauge score={feedback.overallScore} />
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overall Score</p>
                    <p className="text-base font-medium text-gray-700">Based on ATS compatibility, content quality, structure, and skills alignment.</p>
                </div>
            </div>
            <div className="resume-summary">
                <Category title="Tone & Style" score={feedback.toneAndStyle} />
                <Category title="Content"      score={feedback.content} />
                <Category title="Structure"    score={feedback.structure} />
                <Category title="Skills"       score={feedback.skills} />
            </div>
        </div>
    );
}
