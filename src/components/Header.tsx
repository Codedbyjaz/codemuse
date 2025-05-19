import { useLocation } from "wouter";

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [location] = useLocation();

  const getPageTitle = () => {
    switch (true) {
      case location.startsWith('/pending-edits'):
        return 'Pending Edits';
      case location.startsWith('/approved-edits'):
        return 'Approved Edits';
      case location.startsWith('/rejected-edits'):
        return 'Rejected Edits';
      case location.startsWith('/agents'):
        return 'Agent Management';
      case location.startsWith('/locks'):
        return 'Lock Configuration';
      case location.startsWith('/logs'):
        return 'System Logs';
      case location.startsWith('/settings'):
        return 'Settings';
      case location.startsWith('/edit/'):
        return 'Edit Details';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center z-10">
      <div className="flex items-center justify-between w-full px-4">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-neutral-600 hover:text-neutral-900 mr-4"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-neutral-800">{getPageTitle()}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
            System Online
          </span>
          <div className="relative">
            <button className="p-1 text-neutral-600 hover:text-neutral-900">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
