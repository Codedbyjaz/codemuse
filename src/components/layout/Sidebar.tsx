import { Link, useLocation } from "wouter";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  function isActiveLink(path: string): boolean {
    return location === path;
  }

  return (
    <>
      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`${isOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:flex flex-col w-64 bg-secondary-900 text-white h-screen overflow-y-auto lg:fixed`}>
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center">
            <div className="mr-3 flex-shrink-0 w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582a1 1 0 00-.62.919V16a1 1 0 001 1h9.148a1 1 0 001-1V6.824a1 1 0 00-.62-.919L11 4.323V3a1 1 0 00-1-1zM5.18 7.976L10 6.323l4.82 1.653v7.023h-9.64V7.976z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">DevSync</h1>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            <span className="px-2 py-1 bg-gray-800 rounded-md">v2.0.0</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 pl-2">Main</p>
            <Link href="/">
              <a className={`flex items-center text-sm py-2 px-2 rounded-md ${isActiveLink('/') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </a>
            </Link>
            <Link href="/configuration">
              <a className={`flex items-center text-sm py-2 px-2 rounded-md mt-1 ${isActiveLink('/configuration') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Configuration
              </a>
            </Link>
            <Link href="/logs">
              <a className={`flex items-center text-sm py-2 px-2 rounded-md mt-1 ${isActiveLink('/logs') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Logs
              </a>
            </Link>
          </div>
          
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 pl-2">Agents</p>
            <Link href="/agents">
              <a className={`flex items-center text-sm py-2 px-2 rounded-md ${isActiveLink('/agents') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                All Agents
              </a>
            </Link>
          </div>
          
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 pl-2">System</p>
            <Link href="/locks">
              <a className={`flex items-center text-sm py-2 px-2 rounded-md ${isActiveLink('/locks') ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Locks
              </a>
            </Link>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-500 flex-shrink-0"></div>
            <div className="ml-3">
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-gray-400">admin@devsync.io</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
