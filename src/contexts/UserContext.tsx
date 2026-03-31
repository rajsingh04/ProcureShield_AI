import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  name?: string | null;
  email?: string | null;
};

type UserContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const parseJwt = (token: string | null): User | null => {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return {
      name: decoded.name || decoded.preferred_username || decoded.email,
      email: decoded.email,
    } as User;
  } catch (e) {
    return null;
  }
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() =>
    parseJwt(localStorage.getItem("authToken")),
  );

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setUser(parseJwt(token));
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
};

export default UserContext;
