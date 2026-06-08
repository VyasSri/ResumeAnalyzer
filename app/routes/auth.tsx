import { usePuterStore } from "~/lib/puter";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

export const meta: () => {}[] = () => ([
    { title: 'ResMind | Sign In' },
    { name: 'description', content: 'Log into your account' },
]);

const Auth = () => {
    const { isLoading, auth } = usePuterStore();
    const location = useLocation();
    const next = location.search.split('next=')[1] ?? '/';
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isAuthenticated) navigate(next);
    }, [auth.isAuthenticated, next]);

    return (
        <main className="min-h-screen bg-gradient flex items-center justify-center p-6">
            {/* Decorative blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative glass-card p-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Logo */}
                <div className="flex flex-col items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center shadow-xl shadow-indigo-200">
                        <span className="text-white text-2xl font-black">R</span>
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl mb-1">Welcome back</h1>
                        <p className="text-gray-500">Sign in to track your applications & get AI feedback</p>
                    </div>
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2 mb-8">
                    {["AI-powered resume scoring", "ATS compatibility analysis", "Job application tracker"].map(f => (
                        <div key={f} className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                <img src="/icons/check.svg" alt="" className="w-3 h-3" />
                            </div>
                            {f}
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <button className="auth-button animate-pulse opacity-70 w-full">
                        Connecting...
                    </button>
                ) : auth.isAuthenticated ? (
                    <button className="auth-button w-full" onClick={auth.signOut}>
                        Sign Out
                    </button>
                ) : (
                    <button className="auth-button w-full" onClick={auth.signIn}>
                        Continue with Puter
                    </button>
                )}

                <p className="text-center text-xs text-gray-400 mt-4">
                    Powered by Puter.js — no password required
                </p>
            </div>
        </main>
    );
};

export default Auth;
