import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, QrCode, Users, FileText, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Scanner', path: '/scanner', icon: QrCode },
        { name: 'Students', path: '/students', icon: Users },
        { name: 'Logs', path: '/logs', icon: FileText },
    ];

    return (
        <nav className="glass sticky top-0 z-50 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                            <QrCode className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">Gate<span className="text-primary">Keeper</span></span>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {links.map((link) => {
                                const Icon = link.icon;
                                const isActive = location.pathname === link.path;
                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        className={clsx(
                                            'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
                                            isActive
                                                ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-zinc-400 hover:text-white p-2"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden glass border-t border-white/5 absolute w-full">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {links.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={clsx(
                                        'block px-3 py-2 rounded-md text-base font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors',
                                        location.pathname === link.path && 'bg-white/10 text-white'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-5 h-5" />
                                        {link.name}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}
