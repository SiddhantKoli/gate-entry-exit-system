import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Student {
    student_id: string;
    full_name: string;
    department: string;
    year: string;
    status: string;
    created_at: string;
}

export default function Students() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);

    // New Student Form State
    const [newStudent, setNewStudent] = useState({
        student_id: '',
        full_name: '',
        department: '',
        year: '',
        email: ''
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    async function fetchStudents() {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddStudent(e: React.FormEvent) {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('students')
                .insert([newStudent]);

            if (error) throw error;

            setShowForm(false);
            setNewStudent({ student_id: '', full_name: '', department: '', year: '', email: '' });
            fetchStudents();
        } catch (error: any) {
            alert('Error adding student: ' + error.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this student?')) return;

        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('student_id', id);

            if (error) throw error;
            fetchStudents();
        } catch (error: any) {
            alert('Error deleting student: ' + error.message);
        }
    }

    const filteredStudents = students.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    Student Management
                </h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center gap-2"
                >
                    {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Student</>}
                </button>
            </div>

            {showForm && (
                <div className="glass-card p-6 mb-8 animate-slide-up">
                    <h2 className="text-xl font-bold mb-4 text-white">Register New Student</h2>
                    <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Student ID</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={newStudent.student_id}
                                onChange={e => setNewStudent({ ...newStudent, student_id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={newStudent.full_name}
                                onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Department</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={newStudent.department}
                                onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Year</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={newStudent.year}
                                onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" className="w-full btn-primary mt-2">
                                Register Student
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search students..."
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Student ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dept/Year</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Registered</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No students found</td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.student_id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{student.student_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{student.full_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">{student.department} - {student.year}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                            {format(new Date(student.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                    onClick={() => handleDelete(student.student_id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
