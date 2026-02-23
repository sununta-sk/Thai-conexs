import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
const [isDarkMode, setIsDarkMode] = useState(false);
const toggleTheme = () => setIsDarkMode(!isDarkMode);

const theme = {
isDarkMode,
bg: isDarkMode ? '#000000' : '#f5f5f5',
card: isDarkMode ? '#1a1a1a' : '#ffffff',
text: isDarkMode ? '#ffffff' : '#000000',
border: isDarkMode ? '#333333' : '#eeeeee',
accent: '#e91e63',
subText: isDarkMode ? '#888888' : '#666666'
};

return (
<ThemeContext.Provider value={{ theme, toggleTheme }}>
{children}
</ThemeContext.Provider>
);
};

export const useTheme = () => useContext(ThemeContext);