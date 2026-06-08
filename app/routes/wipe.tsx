import { useState } from "react";
import { usePuterStore } from "~/lib/puter";

export default function Wipe() {
    const { kv } = usePuterStore();
    const [deleted, setDeleted] = useState<string[]>([]);
    const [running, setRunning] = useState(false);

    const handleWipe = async () => {
        setRunning(true);
        const items = (await kv.list("resume:*")) as KVItem[];
        const keys: string[] = [];
        for (const item of items ?? []) {
            await kv.delete(item.key);
            keys.push(item.key);
        }
        setDeleted(keys);
        setRunning(false);
    };

    return (
        <main className="p-8 flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Dev — Wipe All Resume Data</h1>
            <button onClick={handleWipe} disabled={running} className="primary-button w-fit">
                {running ? "Wiping..." : "Wipe All Data"}
            </button>
            {deleted.length > 0 && (
                <div>
                    <p className="font-semibold">Deleted {deleted.length} record(s):</p>
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                        {deleted.map((k) => <li key={k}>{k}</li>)}
                    </ul>
                </div>
            )}
        </main>
    );
}
