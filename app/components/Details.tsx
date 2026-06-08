import { Accordion, AccordionItem, AccordionHeader, AccordionContent } from "~/components/Accordion";
import ScoreBadge from "~/components/ScoreBadge";

const sections: { key: keyof Feedback["sections"]; title: string }[] = [
    { key: "toneAndStyle", title: "Tone & Style" },
    { key: "content",      title: "Content" },
    { key: "structure",    title: "Structure" },
    { key: "skills",       title: "Skills" },
];

export default function Details({ feedback }: { feedback: Feedback }) {
    return (
        <Accordion>
            {sections.map(({ key, title }, i) => {
                const section = feedback.sections[key];
                return (
                    <AccordionItem key={key} index={i}>
                        <AccordionHeader>
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{title}</span>
                                <span className="text-sm text-gray-500">{section.score}/100</span>
                                <ScoreBadge score={section.score} />
                            </div>
                        </AccordionHeader>
                        <AccordionContent>
                            <div className="flex flex-col gap-4">
                                {section.what_is_good.length > 0 && (
                                    <div>
                                        <p className="text-sm font-semibold text-green-700 mb-2">What's good</p>
                                        <ul className="flex flex-col gap-1">
                                            {section.what_is_good.map((item, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <img src="/icons/check.svg" alt="good" className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {section.what_to_improve.length > 0 && (
                                    <div>
                                        <p className="text-sm font-semibold text-red-700 mb-2">What to improve</p>
                                        <ul className="flex flex-col gap-1">
                                            {section.what_to_improve.map((item, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <img src="/icons/warning.svg" alt="improve" className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}
