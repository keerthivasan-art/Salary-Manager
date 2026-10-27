import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function TopBar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div>
        <div className="text-sm font-semibold text-gray-800">SRI AKSHATA SHOPPING CENTRE</div>
        <div className="text-xs text-gray-400">Salary Management System</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User size={16} className="text-pink-500" />
          <span>
            Logged in as: <span className="font-medium text-gray-800">{currentUser?.displayName}</span>
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-pink-600 transition px-3 py-1.5 rounded-lg hover:bg-pink-50"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  );
}
