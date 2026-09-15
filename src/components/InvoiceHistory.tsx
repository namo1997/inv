import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Printer,
  Edit3,
  Lock,
  Eye,
  FileCheck,
  Clock,
  RefreshCw,
  Building,
  User,
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import { Invoice, ShopSettings } from '../types';
import { formatCurrency } from '../utils/thaiBaht';
import { formatTaxId } from '../utils/taxValidation';
import { PrintModal } from './PrintModal';
import { InvoicePreview } from './InvoicePreview';

interface InvoiceHistoryProps {
  shopSettings: ShopSettings;
  onEditDraft: (draftInvoice: Invoice) => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  shopSettings,
  onEditDraft,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'draft'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected invoice for View/Print modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, fromDate, toDate]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (e) {
      console.error('Failed to fetch invoices', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleOpenView = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowViewModal(true);
  };

  const handleOpenPrint = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPrintModal(true);
  };

  // Financial Summary
  const summary = useMemo(() => {
    const issuedList = invoices.filter((i) => i.status === 'issued');
    const totalAmount = issuedList.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalVat = issuedList.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);
    const draftsCount = invoices.filter((i) => i.status === 'draft').length;

    return {
      issuedCount: issuedList.length,
      draftsCount,
      totalAmount,
      totalVat,
    };
  }, [invoices]);

  return (
    <div className="max-w-[1520px] mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Register Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-[#e2e0d8] p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            เอกสารสมบูรณ์
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {summary.issuedCount}
            </span>
            <span className="text-xs text-slate-500">ฉบับ</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e0d8] p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ฉบับร่างค้างอยู่
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-700">
              {summary.draftsCount}
            </span>
            <span className="text-xs text-slate-500">ฉบับ</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e0d8] p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ยอดขายรวมทั้งสิ้น
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {formatCurrency(summary.totalAmount)}
            </span>
            <span className="text-xs text-slate-500">บาท</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e0d8] p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ภาษีมูลค่าเพิ่ม (VAT 7%)
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-800">
              {formatCurrency(summary.totalVat)}
            </span>
            <span className="text-xs text-slate-500">บาท</span>
          </div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs overflow-hidden">
        {/* Search & Action Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                <span>สมุดทะเบียนคุมใบกำกับภาษี (Tax Invoice Register)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                เอกสารที่ออกแล้วได้รับการคุ้มครองไม่ให้แก้ไขหรือลบตามระเบียบกรมสรรพากร สามารถสั่งพิมพ์ซ้ำได้ตลอดเวลา
              </p>
            </div>

            <button
              type="button"
              onClick={fetchInvoices}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold self-start transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>
          </div>

          {/* Search Inputs */}
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ค้นหาเลขที่เอกสาร, ชื่อลูกค้า, เลขผู้เสียภาษี 13 หลัก, หรือเลขอ้างอิงบิล..."
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-medium"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="issued">ออกสมบูรณ์แล้ว</option>
                <option value="draft">ฉบับร่าง (Draft)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>ค้นหาข้อมูล</span>
              </button>
            </div>
          </form>

          {/* Date Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Calendar className="w-3 h-3" /> กรองตามวันที่:
            </span>
            <div className="flex items-center gap-1">
              <span>ตั้งแต่</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-0.5 text-xs border border-slate-300 rounded-md bg-slate-50"
              />
            </div>
            <div className="flex items-center gap-1">
              <span>ถึง</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-0.5 text-xs border border-slate-300 rounded-md bg-slate-50"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-slate-500 hover:text-slate-800 underline text-[10px]"
              >
                ล้างวันที่
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf9f5] border-b border-[#e2e0d8] text-slate-700 font-bold">
                <th className="py-2.5 px-3 w-36">เลขที่เอกสาร</th>
                <th className="py-2.5 px-3 w-28">วันที่</th>
                <th className="py-2.5 px-3">ผู้ซื้อ / ผู้รับบริการ</th>
                <th className="py-2.5 px-3 w-36">เลขผู้เสียภาษี</th>
                <th className="py-2.5 px-3 text-right w-28">ยอดก่อน VAT</th>
                <th className="py-2.5 px-3 text-right w-24">ภาษี VAT</th>
                <th className="py-2.5 px-3 text-right w-32">ยอดสุทธิ (บาท)</th>
                <th className="py-2.5 px-3 text-center w-24">สถานะ</th>
                <th className="py-2.5 px-3 text-center w-36">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    กำลังโหลดทะเบียนเอกสาร...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    ไม่พบรายการใบกำกับภาษีตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                      {inv.refBillNumber && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Ref: {inv.refBillNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {inv.date}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 truncate max-w-xs">
                        {inv.customerSnapshot.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {inv.customerSnapshot.isHeadOffice
                          ? 'สำนักงานใหญ่'
                          : `สาขา ${inv.customerSnapshot.branchNumber}`}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {formatTaxId(inv.customerSnapshot.taxId)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(inv.amountBeforeVat)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-semibold">
                      {formatCurrency(inv.vatAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.status === 'issued'
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {inv.status === 'issued' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span>สมบูรณ์</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>ฉบับร่าง</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(inv)}
                          title="ดูตัวอย่างแบบ A4"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPrint(inv)}
                          title="พิมพ์เอกสาร (ต้นฉบับ/สำเนา)"
                          className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {inv.status === 'draft' ? (
                          <button
                            type="button"
                            onClick={() => onEditDraft(inv)}
                            title="แก้ไขฉบับร่างนี้"
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-md transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            title="เอกสารออกสมบูรณ์แล้ว ไม่สามารถแก้ไขได้เพื่อความถูกต้องทางภาษี"
                            className="p-1.5 text-slate-300 cursor-not-allowed"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold">
                  ตรวจสอบเอกสาร: {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setShowPrintModal(true);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์เอกสารนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#e8e6df] flex justify-center">
              <div className="shadow-lg">
                <InvoicePreview
                  invoice={selectedInvoice}
                  shopSettings={shopSettings}
                  printCopyType="original"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedInvoice && (
        <PrintModal
          invoice={selectedInvoice}
          shopSettings={shopSettings}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
