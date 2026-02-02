import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'emerald' | 'gold';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem('gatekeeper-theme') as Theme) || 'dark'
    );

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove all possible theme classes
        root.classList.remove('light', 'emerald', 'gold');

        // Add current theme class (except dark, which is the default)
        if (theme !== 'dark') {
            root.classList.add(theme);
        }

        localStorage.setItem('gatekeeper-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
