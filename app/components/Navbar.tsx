import { Link, useLocation } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { cn } from "~/lib/utils";

const navLinks = [
    { to: "/",       label: "Home" },
    { to: "/jobs",   label: "Jobs" },
    { to: "/upload", label: "Upload" },
    { to: "/wipe",   label: "Wipe" },
];

const Navbar = () => {
    const { pathname } = useLocation();
    const { auth, isLoading } = usePuterStore();

    return (
        <nav className="navbar">
            <Link to="/" className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-lg primary-gradient flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-black">R</span>
                </div>
                <span className="text-sm font-bold text-gradient tracking-tight">ResMind</span>
            </Link>

            <div className="flex items-center gap-0.5">
                {navLinks.map(({ to, label }) => (
                    <Link
                        key={to}
                        to={to}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                            pathname === to
                                ? "primary-gradient text-white shadow-md shadow-indigo-200"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        )}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {!isLoading && auth.isAuthenticated && (
                    <div className="flex items-center gap-2 max-sm:hidden">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs font-bold">
                                {auth.getUser()?.username?.[0]?.toUpperCase()}
                            </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{auth.getUser()?.username}</span>
                    </div>
                )}
                {!isLoading && (
                    auth.isAuthenticated ? (
                        <button
                            onClick={auth.signOut}
                            className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                        >
                            Sign Out
                        </button>
                    ) : (
                        <Link to="/auth" className="primary-button text-sm w-fit">
                            Sign In
                        </Link>
                    )
                )}
            </div>
        </nav>
    );
};

export default Navbar;
