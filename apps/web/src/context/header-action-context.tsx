"use client";

import { ReactNode, createContext, useContext, useState, useCallback } from "react";

type HeaderActionContextValue = {
  mobileAction: ReactNode | null;
  setMobileAction: (node: ReactNode | null) => void;
};

const HeaderActionContext = createContext<HeaderActionContextValue>({
  mobileAction: null,
  setMobileAction: () => {},
});

export function HeaderActionProvider({ children }: { children: ReactNode }) {
  const [mobileAction, setMobileActionState] = useState<ReactNode | null>(null);
  const setMobileAction = useCallback((node: ReactNode | null) => setMobileActionState(node), []);
  return (
    <HeaderActionContext.Provider value={{ mobileAction, setMobileAction }}>
      {children}
    </HeaderActionContext.Provider>
  );
}

export function useHeaderAction() {
  return useContext(HeaderActionContext);
}
