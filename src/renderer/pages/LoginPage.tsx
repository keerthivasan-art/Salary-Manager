import React, { useState } from 'react';
import { Eye, EyeOff, LandPlot, Lock, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const lastUserId = useAuthStore((s) => s.lastUserId);

  const [userId, setUserId] = useState(lastUserId ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId.trim() || !password.trim()) {
      setError('Please enter both User ID and Password.');
      return;
    }
    const result = login({ userId, password });
    if (!result.success) {
      setError(result.error ?? 'Invalid User ID or Password.');
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
      <div className="w-full max-w-md bg-white rounded-card shadow-card border border-pink-100 p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
            <LandPlot className="text-pink-600" size={30} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-semibold text-gray-800 text-center">
            Sri Akshata Shopping Centre
          </h1>
          <p className="text-sm text-gray-500 mt-1">Salary Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">User ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white font-medium text-sm transition shadow-soft"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
