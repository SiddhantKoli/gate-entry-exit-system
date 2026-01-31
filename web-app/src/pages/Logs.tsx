import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface Log {
    id: number;
    student_id: string;
    students: {
        full_name: string;
        department: string;
    };
    entry_time: string;
    exit_time: string | null;
    scan_method: string;
    created_at: string;
}

export default function Logs() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();

        // Subscribe to new logs
        const channel = supabase
            .channel('logs_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchLogs() {
        try {
            const { data, error } = await supabase
                .from('gate_logs')
                .select(`
          *,
          students (
            full_name,
            department
          )
        `)
                .order('created_at', { ascending: false })
                .limit(100); // Pagination could be added here

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.students?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    Activity Logs
                </h1>
                <button className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export
                </button>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search by name or ID..."
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Loading activity...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No activity found</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const isExit = !!log.exit_time;
                                    return (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                                                <div className="flex flex-col">
                                                    <span className="text-white">{format(new Date(log.created_at), 'd MMM, HH:mm')}</span>
                                                    <span className="text-xs">{format(new Date(log.created_at), 'yyyy')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white">{log.students?.full_name || 'Unknown'}</span>
                                                    <span className="text-xs text-zinc-500 font-mono">{log.student_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    isExit ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                )}>
                                                    <span className={clsx("w-1.5 h-1.5 rounded-full", isExit ? "bg-rose-500" : "bg-emerald-500")}></span>
                                                    {isExit ? 'Exit' : 'Entry'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                                                {log.scan_method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                                {isExit && log.exit_time ? (
                                                    // Simple difference calculation could go here
                                                    format(new Date(log.exit_time), 'HH:mm')
                                                ) : (
                                                    <span className="text-emerald-500/70 italic text-xs">Active</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
