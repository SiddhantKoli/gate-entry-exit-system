import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Trash2, Camera, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { loadModels, getFaceDescriptor } from '../lib/faceApi';

interface Student {
    student_id: string;
    full_name: string;
    department: string;
    year: string;
    status: string;
    created_at: string;
    face_descriptor?: any;
}

export default function Students() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [capturingFace, setCapturingFace] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // New Student Form State
    const [newStudent, setNewStudent] = useState({
        student_id: '',
        full_name: '',
        department: '',
        year: '',
        email: '',
        face_descriptor: null as number[] | null
    });

    useEffect(() => {
        fetchStudents();
        loadModels().then(() => setModelsLoaded(true));
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

    const startCamera = async () => {
        setCapturingFace(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setCapturingFace(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCapturingFace(false);
    };

    const handleCaptureFace = async () => {
        if (videoRef.current) {
            const descriptor = await getFaceDescriptor(videoRef.current);
            if (descriptor) {
                // Convert Float32Array to regular array for Supabase JSONB
                setNewStudent({ ...newStudent, face_descriptor: Array.from(descriptor) });
                stopCamera();
            } else {
                alert("No face detected! Please try again.");
            }
        }
    };

    async function handleAddStudent(e: React.FormEvent) {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('students')
                .insert([newStudent]);

            if (error) throw error;

            setShowForm(false);
            setNewStudent({ student_id: '', full_name: '', department: '', year: '', email: '', face_descriptor: null });
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
                    onClick={() => {
                        setShowForm(!showForm);
                        if (capturingFace) stopCamera();
                    }}
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

                        {/* Face Capture Section */}
                        <div className="md:col-span-2 mt-4 p-4 border border-white/5 rounded-xl bg-zinc-900/50">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Face Recognition Setup</label>

                            {!capturingFace && !newStudent.face_descriptor ? (
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    disabled={!modelsLoaded}
                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-white/10"
                                >
                                    <Camera className="w-4 h-4" />
                                    {modelsLoaded ? 'Setup Face ID' : 'Loading AI Models...'}
                                </button>
                            ) : capturingFace ? (
                                <div className="space-y-4">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        className="w-full max-w-sm rounded-lg border border-primary/50 mirror"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCaptureFace}
                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                        >
                                            Capture & Analyze
                                        </button>
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="px-4 py-2 bg-zinc-800 text-white rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Face Descriptor Captured Successfully</span>
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="ml-auto text-xs text-zinc-400 hover:text-white"
                                    >
                                        Retake
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="w-full btn-primary mt-4 disabled:opacity-50"
                                disabled={!newStudent.face_descriptor}
                            >
                                Register Student
                            </button>
                            {!newStudent.face_descriptor && (
                                <p className="text-xs text-center text-zinc-500 mt-2 italic">Face ID is required for registration</p>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search master registry..."
                    className="w-full pl-10 pr-4 py-3 bg-surface/30 border border-text-main/10 rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-text-main/5 border-b border-text-main/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Student ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Dept/Year</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Registered</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-text-main/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-text-muted">Loading registry...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-text-muted">No records found</td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.student_id} className="hover:bg-text-main/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-text-main font-medium">{student.student_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main font-bold">{student.full_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted font-medium">{student.department} • {student.year}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                                            {format(new Date(student.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
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

