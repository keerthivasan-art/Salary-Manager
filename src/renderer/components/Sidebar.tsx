import React from 'react';
import { FileSpreadsheet, Landmark, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export type PageKey = 'salary-excel' | 'neft-letter';

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  const items: { key: PageKey; label: string; icon: React.ReactNode }[] = [
    { key: 'salary-excel', label: 'Salary Excel', icon: <FileSpreadsheet size={18} /> },
    { key: 'neft-letter', label: 'Bank NEFT Letter', icon: <Landmark size={18} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-800 leading-tight">SRI AKSHATA</div>
        <div className="text-xs text-pink-500 font-medium tracking-wide">SALARY MANAGER</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = item.key === activePage;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-pink-100 text-pink-700'
                  : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700 px-2">
          <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center">
            <User size={14} className="text-pink-600" />
          </div>
          <span className="font-medium">{currentUser?.displayName}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
