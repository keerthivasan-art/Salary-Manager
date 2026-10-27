import React, { useState } from 'react';
import Sidebar, { PageKey } from './Sidebar';
import TopBar from './TopBar';
import SalaryExcelPage from '../pages/SalaryExcelPage';
import BankNeftLetterPage from '../pages/BankNeftLetterPage';

export default function Layout() {
  const [activePage, setActivePage] = useState<PageKey>('salary-excel');

  return (
    <div className="flex h-screen w-screen bg-pink-50/40">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === 'salary-excel' && <SalaryExcelPage />}
          {activePage === 'neft-letter' && <BankNeftLetterPage />}
        </main>
      </div>
    </div>
  );
}
