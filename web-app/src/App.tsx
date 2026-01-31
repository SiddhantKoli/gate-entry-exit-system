import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Students from './pages/Students';
import Logs from './pages/Logs';

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background">
                <Navbar />
                <main className="py-8">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/scanner" element={<Scanner />} />
                        <Route path="/students" element={<Students />} />
                        <Route path="/logs" element={<Logs />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
