'use client';

import { createContext, useContext } from 'react';

type User = {
  id: string;
  email: string;
  role: string;
};

const UserContext = createContext<User | null>(null);

export const useUser = () => useContext(UserContext);

export function UserProvider({
                               children,
                               user,
                             }: {
  children: React.ReactNode;
  user: User | null;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
