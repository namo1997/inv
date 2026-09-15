import React, { useState } from 'react';
import { Printer, X, FileText, Files, Copy, Check } from 'lucide-react';
import { Invoice, ShopSettings } from '../types';
import { InvoicePreview } from './InvoicePreview';

interface PrintModalProps {
  invoice: Invoice;
  shopSettings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  invoice,
  shopSettings,
  isOpen,
  onClose,
}) => {
  const [copyMode, setCopyMode] = useState<'original' | 'copy' | 'both'>('original');

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Container - hide during print so only the dedicated print section shows */}
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] no-print border border-slate-300">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-[#faf9f5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-2xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                พิมพ์ใบกำกับภาษี #{invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-slate-500">
                เลือกรูปแบบเอกสารพิมพ์ออกกระดาษ A4 หรือบันทึกเป็น PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Option Controls & Preview */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-100/70">
          {/* Print Mode Selector */}
          <div className="bg-white p-3.5 rounded-lg border border-[#e2e0d8] shadow-2xs">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              เลือกชุดเอกสารที่ต้องการพิมพ์:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Original */}
              <button
                type="button"
                onClick={() => setCopyMode('original')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  copyMode === 'original'
                    ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    copyMode === 'original'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>เฉพาะต้นฉบับ</span>
                    {copyMode === 'original' && <Check className="w-3 h-3 text-emerald-800" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    ระบุ "ต้นฉบับ" (ORIGINAL) ส่งมอบให้ลูกค้า
                  </p>
                </div>
              </button>

              {/* Option 2: Copy */}
              <button
                type="button"
                onClick={() => setCopyMode('copy')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  copyMode === 'copy'
                    ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    copyMode === 'copy'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>เฉพาะสำเนา</span>
                    {copyMode === 'copy' && <Check className="w-3 h-3 text-emerald-800" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    ระบุ "สำเนา" (COPY) สำหรับเข้าแฟ้มบัญชีร้าน
                  </p>
                </div>
              </button>

              {/* Option 3: Both */}
              <button
                type="button"
                onClick={() => setCopyMode('both')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  copyMode === 'both'
                    ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    copyMode === 'both'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Files className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>ทั้งต้นฉบับ + สำเนา</span>
                    {copyMode === 'both' && <Check className="w-3 h-3 text-emerald-800" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    พิมพ์ทั้งสองแผ่นเป็นชุด (2 หน้า A4)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Document Preview Frame */}
          <div className="bg-slate-300/60 p-3 sm:p-5 rounded-lg overflow-x-auto shadow-inner">
            <div className="text-[11px] text-slate-600 mb-2 font-medium flex items-center justify-between">
              <span>ตัวอย่างแสดงผลก่อนส่งเครื่องพิมพ์:</span>
              <span className="text-slate-500">มาตรฐาน A4 (210 x 297 mm)</span>
            </div>
            <div className="transform origin-top scale-[0.9] sm:scale-100 transition-transform">
              <InvoicePreview
                invoice={invoice}
                shopSettings={shopSettings}
                printCopyType={copyMode}
                isCompact={false}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#faf9f5] border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            * หากต้องการบันทึกเป็นไฟล์ ให้เลือก Destination เป็น <strong>Save as PDF</strong> ในหน้าต่างพิมพ์
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร (Print / PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden during screen, displayed exclusively during window.print() */}
      <div className="print-only hidden">
        <InvoicePreview
          invoice={invoice}
          shopSettings={shopSettings}
          printCopyType={copyMode}
          isCompact={false}
        />
      </div>
    </div>
  );
};
