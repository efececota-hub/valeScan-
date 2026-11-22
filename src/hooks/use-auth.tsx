'use client';
import React, { createContext, useContext } from "react";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthContext.Provider value={{ user: null, isLoading: false }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);