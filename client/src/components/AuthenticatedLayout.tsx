import React from 'react';
import { useAuth } from "@/hooks/use-auth";
import Navigation from "./Navigation";
import MobileNavigation from "./MobileNavigation";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="pt-16 pb-16 md:pb-0">
        {children}
      </main>
      <MobileNavigation />
    </>
  );
};

export default AuthenticatedLayout;