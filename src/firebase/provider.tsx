
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { app, db, auth } from './index';

interface FirebaseContextProps {
  app: any;
  db: any;
  auth: any;
  isReady: boolean;
}

const FirebaseContext = createContext<FirebaseContextProps>({
  app: null,
  db: null,
  auth: null,
  isReady: false
});

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (app && db && auth) {
      setReady(true);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ app, db, auth, isReady: ready }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
