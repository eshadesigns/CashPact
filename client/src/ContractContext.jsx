import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ContractContext = createContext(null);

export function ContractProvider({ children }) {
  const [contract, setContract] = useState(() => {
    const saved = localStorage.getItem("contract");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (contract) localStorage.setItem("contract", JSON.stringify(contract));
  }, [contract]);

  const value = useMemo(() => ({ contract, setContract }), [contract]);

  return <ContractContext.Provider value={value}>{children}</ContractContext.Provider>;
}

export function useContract() {
  const ctx = useContext(ContractContext);
  if (!ctx) throw new Error("useContract must be used inside ContractProvider");
  return ctx;
}