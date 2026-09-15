import React from 'react';
import {
  FilePlus2,
  History,
  Settings2,
  Wifi,
  WifiOff,
  Building2,
  Lock,
  Receipt,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { ShopSettings } from '../types';

interface NavbarProps {
  activeTab: 'create' | 'history' | 'settings';
  onSelectTab: (tab: 'create' | 'history' | 'settings') => void;
  shopSettings?: ShopSettings;
  rdStatus: {
    connected: boolean;
    status: 'online' | 'offline' | 'warning' | 'checking';
    latencyMs?: number;
    message?: string;
  };
  onCheckRDStatus: () => void;
  onLockSession?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  shopSettings,
  rdStatus,
  onCheckRDStatus,
  onLockSession,
}) => {
  const restaurantName = shopSettings?.restaurantName || 'บริษัท โซลาว จำกัด';
  const taxId = shopSettings?.taxId || '0505559001193';

  return (
    <header className="sticky top-0 z-40 bg-[#161c24] text-white border-b border-[#2a3441] shadow-xs select-none no-print">
      {/* Top Identity & Status Strip */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Store Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-inner border border-emerald-500/30 text-white font-bold shrink-0">
              <Receipt className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {restaurantName}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-md bg-[#222c38] text-slate-300 border border-slate-700/60">
                  TIN: {taxId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
                <span>ระบบออกใบกำกับภาษีเต็มรูป ภ.พ.20</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium">เวอร์ชันร้านอาหาร</span>
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden sm:flex items-center bg-[#222c38] p-1 rounded-xl border border-slate-700/50 shadow-inner">
            <button
              id="nav-tab-create"
              type="button"
              onClick={() => onSelectTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              <FilePlus2 className="w-4 h-4" />
              <span>ออกใบกำกับภาษี</span>
            </button>

            <button
              id="nav-tab-history"
              type="button"
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ประวัติเอกสาร</span>
            </button>

            <button
              id="nav-tab-settings"
              type="button"
              onClick={() => onSelectTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>ตั้งค่าร้าน</span>
            </button>
          </nav>

          {/* Right Utilities: RD Web Service status badge & Lock */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live RD Service Status Pill */}
            <button
              type="button"
              onClick={onCheckRDStatus}
              title="คลิกเพื่อทดสอบสัญญาณเชื่อมต่อระบบสรรพากร (rd.go.th)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                rdStatus.status === 'online'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : rdStatus.status === 'checking'
                  ? 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {rdStatus.status === 'online' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden md:inline">สรรพากร</span>
                  <span className="font-semibold">Online</span>
                  {rdStatus.latencyMs && (
                    <span className="text-[10px] text-emerald-400/80 font-mono hidden lg:inline">
                      {rdStatus.latencyMs}ms
                    </span>
                  )}
                </>
              ) : rdStatus.status === 'checking' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span className="text-[11px]">ทดสอบ...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px]">ไม่เชื่อมต่อ RD</span>
                </>
              )}
            </button>

            {/* Lock session button */}
            {onLockSession && (
              <button
                type="button"
                onClick={onLockSession}
                title="ล็อคหน้าจอ / สลับกะแคชเชียร์"
                className="p-2 text-slate-400 hover:text-white bg-[#222c38] hover:bg-slate-700 rounded-lg border border-slate-700/50 transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="sm:hidden flex items-center justify-around py-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onSelectTab('create')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition-colors ${
              activeTab === 'create' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FilePlus2 className="w-4 h-4 mb-0.5" />
            <span>ออกเอกสาร</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition-colors ${
              activeTab === 'history' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span>ประวัติ</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition-colors ${
              activeTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Settings2 className="w-4 h-4 mb-0.5" />
            <span>ตั้งค่าร้าน</span>
          </button>
        </div>
      </div>
    </header>
  );
};
