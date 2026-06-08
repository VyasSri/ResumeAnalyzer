import { Link, useLocation } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { cn } from "~/lib/utils";

const navLinks = [
    { to: "/",       label: "Home" },
    { to: "/upload", label: "Upload" },
    { to: "/wipe",   label: "Wipe Data" },
];

const Navbar = () => {
    const { pathname } = useLocation();
    const { auth, isLoading } = usePuterStore();

    return (
        <nav className="navbar">
            <Link to="/">
                <p className="text-xl font-bold text-gradient">RESUME ANALYZER</p>
            </Link>

            <div className="flex items-center gap-1">
                {navLinks.map(({ to, label }) => (
                    <Link
                        key={to}
                        to={to}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                            pathname === to
                                ? "bg-gray-100 text-black"
                                : "text-dark-200 hover:bg-gray-50"
                        )}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div className="flex items-center gap-3">
                {!isLoading && auth.isAuthenticated && (
                    <p className="text-sm text-dark-200 max-sm:hidden">
                        {auth.getUser()?.username}
                    </p>
                )}
                {!isLoading && (
                    auth.isAuthenticated ? (
                        <button onClick={auth.signOut} className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                            Sign Out
                        </button>
                    ) : (
                        <Link to="/auth" className="primary-button w-fit text-sm">
                            Sign In
                        </Link>
                    )
                )}
            </div>
        </nav>
    );
};

export default Navbar;
