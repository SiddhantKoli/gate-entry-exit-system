import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Camera, QrCode, UserCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { loadModels, getFaceDescriptor, compareFaces } from '../lib/faceApi';

type Mode = 'face' | 'qr';

export default function Scanner() {
    const [mode, setMode] = useState<Mode>('face');
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'info'; message: string; data?: any } | null>(null);
    const [lastActionTime, setLastActionTime] = useState<number>(0);
    const [scanning, setScanning] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [studentsData, setStudentsData] = useState<any[]>([]);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const faceDetectionInterval = useRef<any>(null);

    useEffect(() => {
        loadModels().then(() => {
            setModelsLoaded(true);
            fetchStudentsWithFaces();
        });

        return () => {
            stopAll();
        };
    }, []);

    async function fetchStudentsWithFaces() {
        const { data } = await supabase
            .from('students')
            .select('*')
            .not('face_descriptor', 'is', null);
        setStudentsData(data || []);
    }

    const stopAll = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch (e) { }
        }
        if (faceDetectionInterval.current) {
            clearInterval(faceDetectionInterval.current);
        }
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setScanning(false);
    };

    const startScanner = async () => {
        await stopAll();
        setScanResult(null);

        if (mode === 'qr') {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    const cameraId = devices[0].id;
                    if (!scannerRef.current) {
                        scannerRef.current = new Html5Qrcode("reader");
                    }
                    await scannerRef.current.start(
                        cameraId,
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText) => handleAction(decodedText, 'QR'),
                        () => { }
                    );
                    setScanning(true);
                }
            } catch (err) {
                setScanResult({ type: 'error', message: 'Failed to start QR scanner' });
            }
        } else {
            // Face mode
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setScanning(true);

                    faceDetectionInterval.current = setInterval(async () => {
                        if (Date.now() - lastActionTime < 5000) return; // 5s debounce

                        const descriptor = await getFaceDescriptor(videoRef.current!);
                        if (descriptor) {
                            // Find matching student
                            const student = studentsData.find(s => {
                                if (!s.face_descriptor) return false;
                                return compareFaces(Array.from(descriptor), s.face_descriptor);
                            });

                            if (student) {
                                handleAction(student.student_id, 'Face');
                            }
                        }
                    }, 1000);
                }
            } catch (err) {
                setScanResult({ type: 'error', message: 'Failed to start camera' });
            }
        }
    };

    const handleAction = async (studentId: string, method: 'QR' | 'Face') => {
        if (Date.now() - lastActionTime < 5000) return;
        setLastActionTime(Date.now());

        try {
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('student_id', studentId)
                .single();

            if (studentError || !student) {
                setScanResult({ type: 'error', message: `ID ${studentId} not recognized` });
                return;
            }

            const { data: activeLog } = await supabase
                .from('gate_logs')
                .select('*')
                .eq('student_id', studentId)
                .is('exit_time', null)
                .order('created_at', { ascending: false })
                .maybeSingle();

            if (activeLog) {
                await supabase
                    .from('gate_logs')
                    .update({ exit_time: new Date().toISOString() })
                    .eq('id', activeLog.id);

                setScanResult({
                    type: 'success',
                    message: `Goodbye, ${student.full_name}`,
                    data: { ...student, status: 'Logged Out', time: new Date().toLocaleTimeString(), method }
                });
            } else {
                await supabase
                    .from('gate_logs')
                    .insert({ student_id: studentId, scan_method: method });

                setScanResult({
                    type: 'success',
                    message: `Welcome, ${student.full_name}`,
                    data: { ...student, status: 'Logged In', time: new Date().toLocaleTimeString(), method }
                });
            }
        } catch (error: any) {
            setScanResult({ type: 'error', message: error.message });
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                        Gate Authentication
                    </h1>
                    <p className="text-zinc-500 mt-1">Select authentication method</p>
                </div>

                <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                    <button
                        onClick={() => { setMode('face'); stopAll(); setScanResult(null); }}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300",
                            mode === 'face' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        <UserCheck className="w-5 h-5" />
                        <span className="font-medium">Face ID</span>
                    </button>
                    <button
                        onClick={() => { setMode('qr'); stopAll(); setScanResult(null); }}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300",
                            mode === 'qr' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        <QrCode className="w-5 h-5" />
                        <span className="font-medium">QR Scanner</span>
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
                {/* Scanner Area */}
                <div className="lg:col-span-3">
                    <div className="glass-card p-4 relative group">
                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                            {mode === 'qr' ? (
                                <div id="reader" className="w-full h-full" />
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    className="w-full h-full object-cover mirror"
                                />
                            )}

                            {!scanning && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-sm transition-all duration-500">
                                    <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-4 group-hover:scale-110 transition-transform">
                                        <Camera className="w-12 h-12 text-zinc-500" />
                                    </div>
                                    <p className="text-zinc-400 font-medium">Camera is offline</p>
                                    {!modelsLoaded && mode === 'face' && (
                                        <p className="text-primary text-xs mt-2 animate-pulse">Initializing AI Models...</p>
                                    )}
                                </div>
                            )}

                            {/* Authentication Overlay */}
                            {scanning && mode === 'face' && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary/30 rounded-3xl animate-pulse">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={scanning ? stopAll : startScanner}
                            disabled={!modelsLoaded && mode === 'face'}
                            className={clsx(
                                "mt-6 w-full py-4 rounded-2xl font-bold transition-all transform active:scale-[0.98] shadow-xl flex items-center justify-center gap-3",
                                scanning
                                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-white/5"
                                    : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                            )}
                        >
                            {scanning ? (
                                <>Stop Process</>
                            ) : (
                                <>{mode === 'face' ? 'Start Face Recognition' : 'Start QR Scanner'}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6 h-full flex flex-col min-h-[400px]">
                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            Live Status
                        </h3>

                        {!scanResult ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <UserCheck className="w-16 h-16 text-zinc-700 mb-4" />
                                <p className="text-zinc-500">Awaiting authentication...</p>
                            </div>
                        ) : (
                            <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className={clsx(
                                    "p-6 rounded-2xl border mb-6 text-center",
                                    scanResult.type === 'success' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                                )}>
                                    <div className="mb-4 inline-flex p-4 rounded-full bg-zinc-900 shadow-inner">
                                        {scanResult.type === 'success' ? (
                                            <CheckCircle className="w-12 h-12 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-12 h-12 text-rose-500" />
                                        )}
                                    </div>

                                    <h2 className={clsx("text-2xl font-bold mb-2",
                                        scanResult.type === 'success' ? "text-white" : "text-rose-500"
                                    )}>
                                        {scanResult.type === 'success' ? 'Authorized' : 'Access Denied'}
                                    </h2>
                                    <p className="text-zinc-400">{scanResult.message}</p>
                                </div>

                                {scanResult.data && (
                                    <div className="space-y-4">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <div className="grid grid-cols-2 gap-y-4">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Method</p>
                                                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full font-bold">
                                                        {scanResult.data.method}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Time</p>
                                                    <p className="text-sm font-medium text-white">{scanResult.data.time}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Student ID</p>
                                                    <p className="text-sm font-mono text-zinc-300">{scanResult.data.student_id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Status</p>
                                                    <p className={clsx("text-sm font-bold",
                                                        scanResult.data.status === 'Logged In' ? 'text-emerald-400' : 'text-orange-400'
                                                    )}>{scanResult.data.status}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setScanResult(null)}
                                            className="w-full py-3 text-sm text-zinc-400 hover:text-white transition-colors border border-white/5 rounded-xl hover:bg-white/5"
                                        >
                                            Reset View
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

