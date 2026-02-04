"use client";

import React, { ReactNode } from 'react';
import { ThemeProvider } from './components/ThemeProvider'; // Adjust path if necessary

interface ClientLayoutProps {
  children: ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

export default ClientLayout;
