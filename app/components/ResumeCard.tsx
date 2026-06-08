import { Link } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import ScoreCircle from "~/components/ScoreCircle";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath } }: { resume: Resume }) => {
    const { fs } = usePuterStore();
    const [cardImageUrl, setCardImageUrl] = useState("");

    useEffect(() => {
        if (!imagePath) return;
        const load = async () => {
            const blob = await fs.read(imagePath);
            if (blob) setCardImageUrl(URL.createObjectURL(blob));
        };
        load();
    }, [imagePath]);

    return (
        <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    <h2 className="!text-black font-bold break-words">{companyName}</h2>
                    <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
                </div>
                <div className="shrink-0">
                    <ScoreCircle score={feedback.overallScore} />
                </div>
            </div>
            {cardImageUrl && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <img
                        src={cardImageUrl}
                        alt="resume"
                        className="w-full h-87.5 max-sm:h-50 object-cover object-top"
                    />
                </div>
            )}
        </Link>
    );
};

export default ResumeCard;
