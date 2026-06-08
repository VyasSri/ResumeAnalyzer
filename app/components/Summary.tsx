import ScoreGauge from "~/components/ScoreGauge";
import ScoreBadge from "~/components/ScoreBadge";

function Category({ title, score }: { title: string; score: number }) {
    const color = score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
    return (
        <div className="category">
            <div className="flex flex-row gap-2 items-center justify-center">
                <p>{title}</p>
                <p className="text-2xl"><span className={color}>{score}</span>/100</p>
            </div>
            <ScoreBadge score={score} />
        </div>
    );
}

export default function Summary({ feedback }: { feedback: Feedback }) {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-row items-center gap-6">
                <ScoreGauge score={feedback.overallScore} />
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">Your Resume Score</h3>
                    <p className="text-gray-500 text-sm">Based on ATS compatibility, content quality, structure, and skills alignment.</p>
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
