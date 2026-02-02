import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, QrCode, Users, FileText, Menu, X, Sun, Moon, Leaf, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Scanner', path: '/scanner', icon: QrCode },
        { name: 'Students', path: '/students', icon: Users },
        { name: 'Logs', path: '/logs', icon: FileText },
    ];

    const themes = [
        { id: 'dark', icon: Moon, name: 'Dark' },
        { id: 'light', icon: Sun, name: 'Light' },
        { id: 'emerald', icon: Leaf, name: 'Emerald' },
        { id: 'gold', icon: Sparkles, name: 'Gold' },
    ] as const;

    return (
        <nav className="glass sticky top-0 z-50 border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                            <QrCode className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Gate<span className="text-primary">Keeper</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex items-baseline space-x-4">
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
                                                ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                                                : 'text-text-main/60 hover:text-text-main hover:bg-white/5'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="flex items-center bg-surface/30 p-1 rounded-xl border border-text-main/5">
                            {themes.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        title={t.name}
                                        className={clsx(
                                            'p-1.5 rounded-lg transition-all duration-200',
                                            theme === t.id
                                                ? 'bg-primary text-white shadow-lg'
                                                : 'text-text-main/40 hover:text-text-main hover:bg-white/5'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 text-text-main/60 hover:text-text-main"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-text-main/60 hover:text-text-main p-2"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden glass border-t absolute w-full shadow-2xl">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {links.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={clsx(
                                        'block px-4 py-3 rounded-xl text-base font-medium transition-all flex items-center gap-3',
                                        location.pathname === link.path
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-main/60 hover:bg-text-main/5'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {link.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}
