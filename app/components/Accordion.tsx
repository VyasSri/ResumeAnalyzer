import { createContext, useContext, useState } from "react";
import { cn } from "~/lib/utils";

const AccordionContext = createContext<{ openIndex: number | null; toggle: (i: number) => void }>({
    openIndex: null,
    toggle: () => {},
});

const ItemContext = createContext<{ index: number; isOpen: boolean }>({ index: 0, isOpen: false });

export function Accordion({ children }: { children: React.ReactNode }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);
    return (
        <AccordionContext.Provider value={{ openIndex, toggle }}>
            <div className="flex flex-col gap-2">{children}</div>
        </AccordionContext.Provider>
    );
}

export function AccordionItem({ children, index }: { children: React.ReactNode; index: number }) {
    const { openIndex } = useContext(AccordionContext);
    return (
        <ItemContext.Provider value={{ index, isOpen: openIndex === index }}>
            <div className="border border-gray-200 rounded-2xl overflow-hidden">{children}</div>
        </ItemContext.Provider>
    );
}

export function AccordionHeader({ children }: { children: React.ReactNode }) {
    const { toggle } = useContext(AccordionContext);
    const { index, isOpen } = useContext(ItemContext);
    return (
        <button
            onClick={() => toggle(index)}
            className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
        >
            <span>{children}</span>
            <img
                src="/icons/back.svg"
                alt="chevron"
                className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "-rotate-90" : "rotate-180")}
            />
        </button>
    );
}

export function AccordionContent({ children }: { children: React.ReactNode }) {
    const { isOpen } = useContext(ItemContext);
    return (
        <div className={cn("overflow-hidden transition-all duration-300", isOpen ? "max-h-[1000px]" : "max-h-0")}>
            <div className="px-5 pb-5">{children}</div>
        </div>
    );
}
