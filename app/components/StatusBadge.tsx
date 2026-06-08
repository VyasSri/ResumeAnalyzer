import { cn } from "~/lib/utils";

const statusStyles: Record<ApplicationStatus, string> = {
    Saved:          "bg-gray-100 text-gray-700",
    Applied:        "bg-blue-100 text-blue-700",
    "Phone Screen": "bg-purple-100 text-purple-700",
    Interview:      "bg-yellow-100 text-yellow-700",
    Offer:          "bg-green-100 text-green-700",
    Rejected:       "bg-red-100 text-red-700",
    Withdrawn:      "bg-orange-100 text-orange-700",
};

export default function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
    return (
        <span className={cn("rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap", statusStyles[status], className)}>
            {status}
        </span>
    );
}
