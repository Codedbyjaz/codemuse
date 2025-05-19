import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - hidden on mobile, shown on larger screens */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3 flex-shrink-0 w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582a1 1 0 00-.62.919V16a1 1 0 001 1h9.148a1 1 0 001-1V6.824a1 1 0 00-.62-.919L11 4.323V3a1 1 0 00-1-1zM5.18 7.976L10 6.323l4.82 1.653v7.023h-9.64V7.976z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">DevSync</h1>
          </div>
          <button 
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={toggleSidebar}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Main Content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
