// context/SetupContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getFirstProfile, getDrivers, getBrokers } from "../db";

type SetupContextType = {
  setupComplete: boolean;
  checkSetupStatus: () => void;
};

const SetupContext = createContext<SetupContextType>({
  setupComplete: false,
  checkSetupStatus: () => {},
});

export const useSetup = () => useContext(SetupContext);

export const SetupProvider = ({ children }: { children: React.ReactNode }) => {
  const [setupComplete, setSetupComplete] = useState(false);

  const checkSetupStatus = async () => {
    const profile = await getFirstProfile();
    const drivers = await getDrivers();
    const brokers = await getBrokers();

    const isComplete =
      !!profile?.farm_name &&
      !!profile?.price_per_acre &&
      drivers.length > 0 &&
      brokers.length > 0;

    setSetupComplete(isComplete);
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  return (
    <SetupContext.Provider value={{ setupComplete, checkSetupStatus }}>
      {children}
    </SetupContext.Provider>
  );
};
