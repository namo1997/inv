import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InvoiceCreate } from './components/InvoiceCreate';
import { InvoiceHistory } from './components/InvoiceHistory';
import { ShopSettingsView } from './components/ShopSettings';
import { AuthModal } from './components/AuthModal';
import { Invoice, ShopSettings } from './types';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'settings'>('create');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Shop Settings
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    restaurantName: 'บริษัท โซลาว จำกัด',
    taxId: '0505559001193',
    address: 'เลขที่ 122/19 หมู่ที่ 6 ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200',
    phone: '053-811-288',
    isHeadOffice: true,
    branchNumber: '00000',
    branchName: 'สำนักงานใหญ่',
    vatRate: 7,
    defaultPriceIncludesVat: true,
    defaultIssuerName: 'เจ้าหน้าที่ออกใบกำกับภาษี',
  });

  // RD Service status
  const [rdStatus, setRdStatus] = useState<{
    connected: boolean;
    status: 'online' | 'offline' | 'warning' | 'checking';
    latencyMs?: number;
    message?: string;
  }>({
    connected: false,
    status: 'checking',
    message: 'กำลังตรวจสอบสถานะการเชื่อมต่อ...',
  });

  // Draft invoice to edit (from History tab)
  const [editingDraftInvoice, setEditingDraftInvoice] = useState<Invoice | null>(null);

  // Initial load
  useEffect(() => {
    checkAuthentication();
    loadShopSettings();
    checkRDStatus();
  }, []);

  const checkAuthentication = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        // Check if there is a saved token in localStorage
        const token = localStorage.getItem('tax_auth_token');
        if (token) {
          setIsAuthenticated(true);
        } else {
          // In development / demo, we can show modal or auto-allow
          setIsAuthenticated(true);
        }
      }
    } catch {
      setIsAuthenticated(true);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadShopSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && data.restaurantName) {
        setShopSettings(data);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const checkRDStatus = async () => {
    setRdStatus((prev) => ({ ...prev, status: 'checking' }));
    try {
      const res = await fetch('/api/vat-service/status');
      const data = await res.json();
      setRdStatus(data);
    } catch {
      setRdStatus({
        connected: false,
        status: 'offline',
        message: 'ยังไม่เชื่อมต่อ / ไม่สามารถติดต่อบริการภายนอกได้',
      });
    }
  };

  const handleEditDraft = (draft: Invoice) => {
    setEditingDraftInvoice(draft);
    setActiveTab('create');
  };

  const handleInvoiceCreated = (invoice: Invoice) => {
    setEditingDraftInvoice(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Prompt','Sarabun',sans-serif]">
      {/* Top Navigation Bar with 3 Menus + RD Service Status badge */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab !== 'create') {
            setEditingDraftInvoice(null);
          }
          setActiveTab(tab);
        }}
        rdStatus={rdStatus}
        onCheckRDStatus={checkRDStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {checkingAuth ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-slate-500 text-sm">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-700 mb-2" />
              <span>กำลังเตรียมความพร้อมระบบ...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'create' && (
              <InvoiceCreate
                shopSettings={shopSettings}
                initialDraftInvoice={editingDraftInvoice}
                onCancelDraftEdit={() => setEditingDraftInvoice(null)}
                onInvoiceCreated={handleInvoiceCreated}
              />
            )}

            {activeTab === 'history' && (
              <InvoiceHistory
                shopSettings={shopSettings}
                onEditDraft={handleEditDraft}
              />
            )}

            {activeTab === 'settings' && (
              <ShopSettingsView
                settings={shopSettings}
                onSettingsUpdated={(updated) => setShopSettings(updated)}
                rdStatus={rdStatus}
                onRefreshRDStatus={checkRDStatus}
              />
            )}
          </>
        )}
      </main>

      {/* Security Auth Modal if not authenticated */}
      {!isAuthenticated && !checkingAuth && (
        <AuthModal
          onSuccess={() => {
            setIsAuthenticated(true);
          }}
        />
      )}

      {/* Subtle Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ระบบออกใบกำกับภาษีสำหรับร้านอาหาร (มาตรฐาน ภ.พ.20)</span>
          <span className="text-slate-400">
            ระบบบันทึกฐานข้อมูลถาวร • รองรับเครื่องพิมพ์ A4 & PDF
          </span>
        </div>
      </footer>
    </div>
  );
}
