import { Link } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import ScoreCircle from "~/components/ScoreCircle";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath } }: { resume: Resume }) => {
    const { fs } = usePuterStore();
    const [cardImageUrl, setCardImageUrl] = useState("");

    useEffect(() => {
        if (!imagePath) return;
        fs.read(imagePath).then(blob => {
            if (blob) setCardImageUrl(URL.createObjectURL(blob));
        });
    }, [imagePath]);

    return (
        <Link to={`/resume/${id}`} className="resume-card group">
            <div className="resume-card-header">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Company</p>
                    <h2 className="!text-gray-900 font-bold text-lg leading-tight break-words">{companyName}</h2>
                    <p className="text-sm text-gray-400 break-words truncate">{jobTitle}</p>
                </div>
                <div className="shrink-0">
                    <ScoreCircle score={feedback.overallScore} />
                </div>
            </div>

            {cardImageUrl ? (
                <div className="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    <img
                        src={cardImageUrl}
                        alt="resume preview"
                        className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
                    />
                </div>
            ) : (
                <div className="flex-1 rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center bg-gray-50/50">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                        <img src="/images/pdf.png" alt="" className="w-10 h-10" />
                        <p className="text-xs text-gray-400">Loading preview...</p>
                    </div>
                </div>
            )}
        </Link>
    );
};

export default ResumeCard;
