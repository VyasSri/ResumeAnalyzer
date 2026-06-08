import { Accordion, AccordionItem, AccordionHeader, AccordionContent } from "~/components/Accordion";
import ScoreBadge from "~/components/ScoreBadge";

const sections: { key: keyof Feedback["sections"]; title: string; icon: string }[] = [
    { key: "toneAndStyle", title: "Tone & Style", icon: "🎯" },
    { key: "content",      title: "Content",      icon: "📝" },
    { key: "structure",    title: "Structure",    icon: "🏗️" },
    { key: "skills",       title: "Skills",       icon: "⚡" },
];

export default function Details({ feedback }: { feedback: Feedback }) {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Detailed Breakdown</p>
            <Accordion>
                {sections.map(({ key, title, icon }, i) => {
                    const section = feedback.sections[key];
                    return (
                        <AccordionItem key={key} index={i}>
                            <AccordionHeader>
                                <div className="flex items-center gap-3">
                                    <span className="text-base">{icon}</span>
                                    <span className="font-semibold text-gray-800">{title}</span>
                                    <span className="text-xs text-gray-400 font-mono">{section.score}/100</span>
                                    <ScoreBadge score={section.score} />
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <div className="flex flex-col gap-4 pt-1">
                                    {section.what_is_good.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">✓ What's working</p>
                                            <div className="flex flex-col gap-2">
                                                {section.what_is_good.map((item, j) => (
                                                    <div key={j} className="flex items-start gap-3 text-sm text-gray-700 bg-green-50/60 rounded-xl px-3 py-2.5">
                                                        <img src="/icons/check.svg" alt="" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {section.what_to_improve.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">↑ Areas to improve</p>
                                            <div className="flex flex-col gap-2">
                                                {section.what_to_improve.map((item, j) => (
                                                    <div key={j} className="flex items-start gap-3 text-sm text-gray-700 bg-orange-50/60 rounded-xl px-3 py-2.5">
                                                        <img src="/icons/warning.svg" alt="" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}
