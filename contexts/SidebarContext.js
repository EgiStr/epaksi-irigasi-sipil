'use client'

import React, { createContext, useContext, useState } from 'react';

// Create the Sidebar Context
const SidebarContext = createContext();

// Sidebar Provider Component
export const SidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const setSidebarState = (isOpen) => {
    setSidebarOpen(isOpen);
  };

  const setModalState = (isOpen) => {
    setIsModalOpen(isOpen);
    // Automatically close sidebar when modal opens
    if (isOpen) {
      setSidebarOpen(false);
    }
  };

  const value = {
    sidebarOpen,
    isModalOpen,
    toggleSidebar,
    setSidebarState,
    setModalState
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

// Custom hook to use the Sidebar Context
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;