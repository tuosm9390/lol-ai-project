"use client";

import React from 'react';
import { useTheme } from './ThemeProvider'; // Adjust path if necessary
import { Sun, Moon } from 'lucide-react'; // Assuming lucide-react is installed for icons

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

export default ThemeToggleButton;
