import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, LogIn, LogOut } from 'lucide-react';

interface Stats {
    totalEntries: number;
    totalExits: number;
    currentlyInside: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({ totalEntries: 0, totalExits: 0, currentlyInside: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();

        // Set up realtime subscription
        const channel = supabase
            .channel('dashboard_stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () => {
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchStats() {
        try {
            // Get start of today in UTC? Or local?
            // For simplicity, let's just query everything and filter, or use DB capabilities.
            // But RLS policies might exist.
            // We'll use a precise query.
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

            const { data: logs, error } = await supabase
                .from('gate_logs')
                .select('*')
                .gte('created_at', startOfDay)
                .lt('created_at', endOfDay);

            if (error) throw error;

            if (logs) {
                const totalEntries = logs.length;
                const totalExits = logs.filter(l => l.exit_time).length;
                // currentlyInside is tricky if we don't have a specific "status". 
                // Logic: if we have entry but no exit -> inside.
                // This assumes logs are 1:1 sessions.
                const currentlyInside = logs.filter(l => !l.exit_time).length;

                setStats({
                    totalEntries,
                    totalExits,
                    currentlyInside
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }

    const StatCard = ({ title, value, icon: Icon, color, subColor }: any) => (
        <div className="glass-card p-6 relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity duration-500 scale-150 ${color}`}>
                <Icon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${subColor} bg-opacity-20 text-white shadow-lg`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-text-muted text-xs font-medium tracking-wide uppercase">{title}</h3>
                </div>
                <p className="text-5xl font-bold tracking-tight">{loading ? '-' : value}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-2 mb-8 text-left">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-text-main to-text-main/50 bg-clip-text text-transparent">
                    Dashboard Overview
                </h1>
                <p className="text-text-muted font-medium">Real-time gate activity statistics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Currently Inside"
                    value={stats.currentlyInside}
                    icon={Users}
                    color="text-indigo-500"
                    subColor="from-indigo-500/20 to-violet-500/20"
                />
                <StatCard
                    title="Total Entries"
                    value={stats.totalEntries}
                    icon={LogIn}
                    color="text-emerald-500"
                    subColor="from-emerald-500/20 to-teal-500/20"
                />
                <StatCard
                    title="Total Exits"
                    value={stats.totalExits}
                    icon={LogOut}
                    color="text-rose-500"
                    subColor="from-rose-500/20 to-pink-500/20"
                />
            </div>
        </div>
    );
}
