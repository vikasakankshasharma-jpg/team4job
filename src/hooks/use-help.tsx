
"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

type HelpContent = {
  title: string | null;
  content: React.ReactNode | null;
};

type HelpContextType = {
  title: string | null;
  content: React.ReactNode | null;
  setHelp: (help: HelpContent) => void;
};

const HelpContext = createContext<HelpContextType | null>(null);

export const HelpProvider = ({ children }: { children: React.ReactNode }) => {
  const [help, setHelp] = useState<HelpContent>({ title: null, content: null });

  const value = useMemo(() => ({
    ...help,
    setHelp,
  }), [help]);

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error("useHelp must be used within a HelpProvider");
  }
  return context;
};
