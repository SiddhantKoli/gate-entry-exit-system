import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Camera } from 'lucide-react';
import { clsx } from 'clsx';

export default function Scanner() {
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'info'; message: string; data?: any } | null>(null);
    const [lastScan, setLastScan] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanner = async () => {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length) {
                const cameraId = devices[0].id;

                // Use a new instance each time to avoid state issues
                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode("reader");
                }

                await scannerRef.current.start(
                    cameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText) => {
                        handleScan(decodedText);
                    },
                    (_errorMessage) => {
                        // parsing error, ignore
                    }
                );
                setScanning(true);
                setScanResult(null);
            } else {
                setScanResult({ type: 'error', message: 'No cameras found' });
            }
        } catch (err) {
            console.error(err);
            setScanResult({ type: 'error', message: 'Failed to start camera. Ensure permission is granted.' });
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (e) {
                console.warn("Failed to stop scanner", e);
            }
            setScanning(false);
        }
    };

    const handleScan = async (studentId: string) => {
        if (studentId === lastScan) return; // Debounce

        setLastScan(studentId);
        setTimeout(() => setLastScan(null), 5000); // 5s debounce

        try {
            // 1. Check Student
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('student_id', studentId)
                .single();

            if (studentError || !student) {
                setScanResult({ type: 'error', message: `Student ID ${studentId} not found!` });
                return;
            }

            // 2. Check for active entry
            const { data: activeLog, error: _logError } = await supabase
                .from('gate_logs')
                .select('*')
                .eq('student_id', studentId)
                .is('exit_time', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (activeLog) {
                // Process Exit
                const { error: updateError } = await supabase
                    .from('gate_logs')
                    .update({ exit_time: new Date().toISOString() })
                    .eq('id', activeLog.id);

                if (updateError) throw updateError;
                setScanResult({
                    type: 'success',
                    message: `Goodbye, ${student.full_name}`,
                    data: { ...student, status: 'Logged Out', time: new Date().toLocaleTimeString() }
                });

            } else {
                // Process Entry
                const { error: insertError } = await supabase
                    .from('gate_logs')
                    .insert({ student_id: studentId });

                if (insertError) throw insertError;
                setScanResult({
                    type: 'success',
                    message: `Welcome, ${student.full_name}`,
                    data: { ...student, status: 'Logged In', time: new Date().toLocaleTimeString() }
                });
            }

        } catch (error: any) {
            setScanResult({ type: 'error', message: error.message });
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 animate-fade-in">
            <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                QR Scanner
            </h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Scanner Area */}
                <div className="glass-card p-4 flex flex-col items-center">
                    <div id="reader" className="w-full bg-black rounded-lg overflow-hidden h-80 flex items-center justify-center relative border border-zinc-800">
                        {!scanning && (
                            <div className="text-center">
                                <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                                <p className="text-zinc-500">Camera is off</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={scanning ? stopScanner : startScanner}
                        className={clsx(
                            "mt-6 w-full py-3 rounded-xl font-medium transition-all shadow-lg transform active:scale-95",
                            scanning
                                ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20"
                                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                        )}
                    >
                        {scanning ? 'Stop Scanner' : 'Start Camera'}
                    </button>
                </div>

                {/* Results Area */}
                <div className="glass-card p-6 flex flex-col justify-center min-h-[300px]">
                    {!scanResult ? (
                        <div className="text-center text-zinc-500">
                            <Camera className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p>Scan a QR code to see details here</p>
                        </div>
                    ) : (
                        <div className="text-center animate-pulse-once">
                            <div className="mb-4 inline-flex p-4 rounded-full bg-zinc-800/50">
                                {scanResult.type === 'success' && <CheckCircle className="w-12 h-12 text-emerald-500" />}
                                {scanResult.type === 'error' && <XCircle className="w-12 h-12 text-rose-500" />}
                            </div>

                            <h2 className={clsx("text-2xl font-bold mb-2",
                                scanResult.type === 'success' ? "text-white" : "text-rose-500"
                            )}>
                                {scanResult.type === 'success' ? 'Scan Successful' : 'Error'}
                            </h2>

                            <p className="text-lg text-zinc-300 mb-6">{scanResult.message}</p>

                            {scanResult.data && (
                                <div className="bg-zinc-800/50 p-5 rounded-xl text-left border border-white/5 shadow-inner">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Student ID</label>
                                            <span className="text-white font-mono bg-zinc-700/50 px-2 py-0.5 rounded text-xs">{scanResult.data.student_id}</span>
                                        </div>
                                        <div>
                                            <label className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Time</label>
                                            <span className="text-white">{scanResult.data.time}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Status</label>
                                            <span className={clsx("font-bold",
                                                scanResult.data.status === 'Logged In' ? 'text-emerald-400' : 'text-orange-400'
                                            )}>{scanResult.data.status}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setScanResult(null)}
                                className="mt-6 text-zinc-400 hover:text-white text-sm hover:underline transition-colors"
                            >
                                Scan Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
