import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Students from './pages/Students';
import Logs from './pages/Logs';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <div className="min-h-screen bg-background text-text-main transition-colors duration-300">
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
        </ThemeProvider>
    );
}

export default App;
