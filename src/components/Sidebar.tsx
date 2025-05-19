import { Link, useLocation } from "wouter";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div
      className={`bg-neutral-800 text-white w-64 flex-shrink-0 transition-transform duration-300 
                 ease-in-out transform fixed inset-y-0 left-0 z-30 lg:relative 
                 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-700">
        <div className="flex items-center space-x-2">
          <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-7.208a2.5 2.5 0 01-2.5-2.5V8.5a2.5 2.5 0 115 0v1.792a2.5 2.5 0 01-2.5 2.5zM12 18a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
          <span className="text-lg font-semibold">DevSync</span>
        </div>
        <button onClick={toggleSidebar} className="lg:hidden text-neutral-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <nav className="mt-5 px-2 space-y-1">
        <Link href="/pending-edits">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/pending-edits') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            Pending Edits
          </a>
        </Link>
        <Link href="/approved-edits">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/approved-edits') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Approved Edits
          </a>
        </Link>
        <Link href="/rejected-edits">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/rejected-edits') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Rejected Edits
          </a>
        </Link>
        <Link href="/agents">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/agents') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
            </svg>
            Agents
          </a>
        </Link>
        <Link href="/locks">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/locks') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            Locks
          </a>
        </Link>
        <Link href="/logs">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/logs') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Logs
          </a>
        </Link>
        <Link href="/settings">
          <a className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors
            ${isActive('/settings') ? 'bg-neutral-700' : ''}`}>
            <svg className="mr-3 h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Settings
          </a>
        </Link>
      </nav>
      <div className="absolute bottom-0 w-full border-t border-neutral-700 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium">
            <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-xs text-neutral-400">DevSync v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
