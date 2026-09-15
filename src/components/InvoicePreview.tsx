import React from 'react';
import { Invoice, ShopSettings } from '../types';
import { formatCurrency } from '../utils/thaiBaht';

interface InvoicePreviewProps {
  invoice: Partial<Invoice>;
  shopSettings: ShopSettings;
  printCopyType?: 'original' | 'copy' | 'both';
  isCompact?: boolean;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  shopSettings,
  printCopyType = 'original',
  isCompact = false,
}) => {
  // Use snapshot if available (from historical invoice), else current shopSettings
  const shop = invoice.shopSnapshot || {
    restaurantName: shopSettings.restaurantName,
    taxId: shopSettings.taxId,
    address: shopSettings.address,
    phone: shopSettings.phone,
    isHeadOffice: shopSettings.isHeadOffice,
    branchNumber: shopSettings.branchNumber,
    branchName: shopSettings.branchName,
    logo: shopSettings.logo,
  };

  const customer = invoice.customerSnapshot || {
    name: 'ชื่อกิจการ / ลูกค้าทั่วไป',
    taxId: '0000000000000',
    address: 'ที่อยู่ผู้รับบริการ / ลูกค้า',
    isHeadOffice: true,
    branchNumber: '00000',
    branchName: 'สำนักงานใหญ่',
  };

  const items = invoice.items || [];
  // Fill empty rows if needed so invoice looks balanced on A4
  const minRows = 5;
  const emptyRowsCount = Math.max(0, minRows - items.length);

  const renderSingleSheet = (copyLabel: 'ต้นฉบับ' | 'สำเนา', englishLabel: 'ORIGINAL' | 'COPY', key: string) => {
    return (
      <div
        key={key}
        className={`invoice-sheet bg-white text-slate-900 border border-slate-300 shadow-sm mx-auto font-['Sarabun',sans-serif] ${
          isCompact ? 'p-6 text-xs' : 'p-8 sm:p-10 text-sm'
        }`}
        style={{
          width: '100%',
          maxWidth: '210mm',
          minHeight: isCompact ? 'auto' : '297mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Header: Shop Info & Document Title */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4 gap-4">
          {/* Seller / Restaurant Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {shop.logo ? (
                <img
                  src={shop.logo}
                  alt="Logo"
                  className="h-12 w-auto max-w-[120px] object-contain shrink-0"
                />
              ) : null}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {shop.restaurantName || 'ชื่อสถานประกอบการ'}
                </h2>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  เลขประจำตัวผู้เสียภาษีอากร:{' '}
                  <span className="font-mono font-bold tracking-wider">{shop.taxId || '-'}</span>{' '}
                  <span className="inline-block px-1.5 py-0.2 text-[11px] font-semibold border border-slate-700 rounded-sm ml-1">
                    {shop.isHeadOffice ? 'สำนักงานใหญ่' : `สาขาที่ ${shop.branchNumber || '00001'}`}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              {shop.address || 'ที่อยู่สถานประกอบการตามแบบ ภ.พ.20'}
              {shop.phone && <span> โทร. {shop.phone}</span>}
            </p>
          </div>

          {/* Title & Copy Badge */}
          <div className="text-right shrink-0">
            <div className="inline-block bg-slate-900 text-white px-3 py-1 text-base sm:text-lg font-bold tracking-tight rounded-xs">
              ใบกำกับภาษี
            </div>
            <div className="text-xs font-semibold text-slate-700 tracking-wider mt-0.5">
              TAX INVOICE
            </div>
            <div className="mt-1.5 inline-block border border-slate-800 px-2 py-0.5 text-xs font-bold bg-slate-100 rounded-xs">
              {copyLabel} ({englishLabel})
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              (เอกสารออกเป็นชุด)
            </div>
          </div>
        </div>

        {/* Meta Grid: Buyer Info (Left) & Invoice Meta (Right) */}
        <div className="grid grid-cols-12 gap-3 mb-4 text-xs">
          {/* Customer / Buyer Box */}
          <div className="col-span-7 border border-slate-300 rounded-xs p-3 bg-slate-50/50">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
              <span>ข้อมูลผู้ซื้อ / ผู้รับบริการ:</span>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {customer.name || 'ไม่ได้ระบุชื่อผู้ซื้อ'}
              </p>
              <p className="text-slate-700">
                <span className="font-semibold">เลขประจำตัวผู้เสียภาษี:</span>{' '}
                <span className="font-mono font-bold">{customer.taxId || '-'}</span>
              </p>
              <p className="text-slate-700">
                <span className="font-semibold">สถานประกอบการ:</span>{' '}
                {customer.isHeadOffice ? (
                  <span className="font-medium text-slate-900">สำนักงานใหญ่ (00000)</span>
                ) : (
                  <span className="font-medium text-slate-900">
                    สาขาที่ {customer.branchNumber || '-'} {customer.branchName ? `(${customer.branchName})` : ''}
                  </span>
                )}
              </p>
              <p className="text-slate-600 leading-snug">
                <span className="font-semibold text-slate-700">ที่อยู่:</span> {customer.address || '-'}
              </p>
              {customer.phone && (
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">โทร:</span> {customer.phone}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Metadata Box */}
          <div className="col-span-5 border border-slate-300 rounded-xs p-3 bg-slate-50/50 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-700">เลขที่เอกสาร (No.):</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {invoice.invoiceNumber || 'INV-XXXXXXXX-XXX'}
                </span>
              </div>
              <div className="flex justify-between items-baseline border-b border-slate-200 pb-1">
                <span className="font-semibold text-slate-700">วันที่ (Date):</span>
                <span className="font-medium text-slate-900">
                  {invoice.date || new Date().toISOString().split('T')[0]}
                </span>
              </div>
              {invoice.refBillNumber && (
                <div className="flex justify-between items-baseline border-b border-slate-200 pb-1">
                  <span className="font-semibold text-slate-700">อ้างอิงบิล (Ref #):</span>
                  <span className="font-medium text-slate-900 font-mono">
                    {invoice.refBillNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-slate-700">สถานะ:</span>
                <span
                  className={`font-semibold px-1.5 py-0.2 rounded-xs text-[11px] ${
                    invoice.status === 'issued'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {invoice.status === 'issued' ? 'ออกเอกสารสมบูรณ์' : 'ฉบับร่าง (Draft)'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-200">
              * ราคาแสดง {invoice.priceIncludesVat ? 'รวมภาษีมูลค่าเพิ่มแล้ว' : 'ยังไม่รวมภาษีมูลค่าเพิ่ม'}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-slate-800 rounded-xs overflow-hidden mb-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b border-slate-800 font-bold">
                <th className="py-2 px-2 text-center w-10 border-r border-slate-300">ลำดับ</th>
                <th className="py-2 px-3 border-r border-slate-300">รายการสินค้า / บริการ</th>
                <th className="py-2 px-2 text-center w-16 border-r border-slate-300">จำนวน</th>
                <th className="py-2 px-2 text-center w-16 border-r border-slate-300">หน่วย</th>
                <th className="py-2 px-3 text-right w-24 border-r border-slate-300">ราคา/หน่วย</th>
                <th className="py-2 px-3 text-right w-28">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900 border-r border-slate-200">
                    {item.description || '-'}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-800 border-r border-slate-200">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-200">
                    {item.unit || 'รายการ'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">
                    {formatCurrency(Number(item.unitPrice || 0))}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(Number(item.amount || 0))}
                  </td>
                </tr>
              ))}

              {/* Pad empty rows so table maintains aesthetic height on A4 */}
              {Array.from({ length: emptyRowsCount }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-7 text-transparent select-none">
                  <td className="border-r border-slate-200 text-center">-</td>
                  <td className="border-r border-slate-200">-</td>
                  <td className="border-r border-slate-200 text-center">-</td>
                  <td className="border-r border-slate-200 text-center">-</td>
                  <td className="border-r border-slate-200 text-right">-</td>
                  <td className="text-right">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Thai Baht Text + Calculation Totals */}
        <div className="grid grid-cols-12 gap-3 mb-6 text-xs">
          {/* Left: Thai Baht Text & Notes */}
          <div className="col-span-7 flex flex-col justify-between">
            <div className="border border-slate-300 rounded-xs p-3 bg-slate-50 mb-2">
              <span className="font-bold text-slate-700 block mb-0.5">
                จำนวนเงินตัวอักษร:
              </span>
              <p className="font-bold text-slate-900 text-sm">
                ({invoice.thaiBahtText || 'ศูนย์บาทถ้วน'})
              </p>
            </div>

            {invoice.notes && (
              <div className="border border-slate-200 rounded-xs p-2 text-slate-600 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-700">หมายเหตุ: </span>
                {invoice.notes}
              </div>
            )}
            {!invoice.notes && <div />}
          </div>

          {/* Right: Calculations Table */}
          <div className="col-span-5 border border-slate-800 rounded-xs overflow-hidden">
            <div className="divide-y divide-slate-200 text-xs">
              <div className="flex justify-between py-1.5 px-3 bg-white">
                <span className="text-slate-600">รวมเป็นเงิน:</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatCurrency(invoice.subtotal || 0)}
                </span>
              </div>

              {(invoice.discountAmount || 0) > 0 && (
                <div className="flex justify-between py-1.5 px-3 bg-white text-rose-700">
                  <span>หักส่วนลด:</span>
                  <span className="font-mono font-medium">
                    -{formatCurrency(invoice.discountAmount || 0)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 px-3 bg-white">
                <span className="text-slate-700">มูลค่าก่อนภาษีมูลค่าเพิ่ม:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(invoice.amountBeforeVat || 0)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 px-3 bg-white">
                <span className="text-slate-700">
                  ภาษีมูลค่าเพิ่ม VAT {invoice.vatRate || 7}%:
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(invoice.vatAmount || 0)}
                </span>
              </div>

              <div className="flex justify-between py-2 px-3 bg-slate-100 text-slate-900 font-bold border-t border-slate-800 text-sm">
                <span>จำนวนเงินรวมทั้งสิ้น:</span>
                <span className="font-mono text-base font-bold">
                  {formatCurrency(invoice.totalAmount || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Blocks */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs text-center mt-auto">
          {/* Customer Receiver */}
          <div>
            <div className="h-12 flex items-end justify-center">
              <div className="w-48 border-b border-dotted border-slate-500" />
            </div>
            <p className="mt-1.5 font-semibold text-slate-800">ผู้รับเอกสาร / ผู้จ่ายเงิน</p>
            <p className="text-[11px] text-slate-500">วันที่ ......./......./...........</p>
          </div>

          {/* Authorized Issuer */}
          <div>
            <div className="h-12 flex items-end justify-center">
              <span className="font-semibold text-slate-800 border-b border-slate-700 pb-0.5 px-4 font-mono">
                {invoice.issuerName || shopSettings.defaultIssuerName || 'ผู้มีอำนาจลงนาม'}
              </span>
            </div>
            <p className="mt-1.5 font-semibold text-slate-800">ผู้มีหน้าที่ออกใบกำกับภาษี</p>
            <p className="text-[11px] text-slate-500">
              วันที่ {invoice.date || new Date().toISOString().split('T')[0]}
            </p>
          </div>
        </div>

        {/* Footer legal text */}
        <div className="mt-6 pt-2 border-t border-slate-200 text-[10px] text-slate-600 flex justify-between">
          <span>ออกโดยระบบใบกำกับภาษีมาตรฐาน ภ.พ.20</span>
          <span>เอกสารฉบับนี้ใช้เป็นหลักฐานทางภาษีตามประมวลรัษฎากร</span>
        </div>
      </div>
    );
  };

  return (
    <div className="invoice-print-container">
      {/* If Original requested or both */}
      {(printCopyType === 'original' || printCopyType === 'both') &&
        renderSingleSheet('ต้นฉบับ', 'ORIGINAL', 'original-sheet')}

      {/* Page Break for print when both sheets are requested */}
      {printCopyType === 'both' && (
        <div className="page-break my-6 border-b-2 border-dashed border-slate-300 no-print text-center text-xs text-slate-500 py-1" />
      )}

      {/* If Copy requested or both */}
      {(printCopyType === 'copy' || printCopyType === 'both') &&
        renderSingleSheet('สำเนา', 'COPY', 'copy-sheet')}
    </div>
  );
};
