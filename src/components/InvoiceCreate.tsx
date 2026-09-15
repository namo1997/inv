import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileCheck,
  Save,
  RotateCcw,
  Eye,
  UserCheck,
  Building,
  Sparkles,
  Layers,
  ChevronDown,
  Hash,
  Calendar,
  CreditCard,
  Building2,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { Customer, Invoice, InvoiceItem, RDLookupResult, ShopSettings } from '../types';
import { calculateInvoiceTotals, round2 } from '../utils/calculations';
import { formatCurrency } from '../utils/thaiBaht';
import { validateThaiTaxId, formatTaxId } from '../utils/taxValidation';
import { InvoicePreview } from './InvoicePreview';
import { RDVerificationModal } from './RDVerificationModal';
import { PrintModal } from './PrintModal';

interface InvoiceCreateProps {
  shopSettings: ShopSettings;
  onInvoiceCreated: (newInvoice: Invoice) => void;
  initialDraftInvoice?: Invoice | null;
  onCancelDraftEdit?: () => void;
}

export const InvoiceCreate: React.FC<InvoiceCreateProps> = ({
  shopSettings,
  onInvoiceCreated,
  initialDraftInvoice = null,
  onCancelDraftEdit,
}) => {
  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refBillNumber, setRefBillNumber] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(
    shopSettings.defaultPriceIncludesVat ?? true
  );
  const [vatRate, setVatRate] = useState(shopSettings.vatRate || 7);
  const [issuerName, setIssuerName] = useState(
    shopSettings.defaultIssuerName || 'เจ้าหน้าที่ออกใบกำกับภาษี'
  );
  const [notes, setNotes] = useState('');

  // Customer state
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isHeadOffice, setIsHeadOffice] = useState(true);
  const [branchNumber, setBranchNumber] = useState('00000');
  const [branchName, setBranchName] = useState('สำนักงานใหญ่');
  const [customerPhone, setCustomerPhone] = useState('');

  // Items state
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: 'ค่าอาหารและเครื่องดื่ม',
      quantity: 1,
      unit: 'รายการ',
      unitPrice: 1070,
      amount: 1070,
    },
  ]);

  // Discount
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // RD Service lookup state
  const [searchingRD, setSearchingRD] = useState(false);
  const [rdStatusMessage, setRdStatusMessage] = useState<string | null>(null);
  const [rdStatusType, setRdStatusType] = useState<'success' | 'warning' | 'info' | null>(null);
  const [rdLookupResult, setRdLookupResult] = useState<RDLookupResult | null>(null);
  const [showRDModal, setShowRDModal] = useState(false);

  // Saved customers autocomplete
  const [savedCustomers, setSavedCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Submit and lock states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [savedInvoiceForPrint, setSavedInvoiceForPrint] = useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Mobile view toggle (Form vs Live Preview)
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  // Preview zoom scale
  const [previewScale, setPreviewScale] = useState<number>(1);

  // Load next invoice number on mount
  useEffect(() => {
    if (initialDraftInvoice) {
      setInvoiceNumber(initialDraftInvoice.invoiceNumber);
      setDate(initialDraftInvoice.date);
      setRefBillNumber(initialDraftInvoice.refBillNumber || '');
      setPriceIncludesVat(initialDraftInvoice.priceIncludesVat);
      setVatRate(initialDraftInvoice.vatRate);
      setIssuerName(initialDraftInvoice.issuerName);
      setNotes(initialDraftInvoice.notes || '');

      setCustomerTaxId(initialDraftInvoice.customerSnapshot.taxId);
      setCustomerName(initialDraftInvoice.customerSnapshot.name);
      setCustomerAddress(initialDraftInvoice.customerSnapshot.address);
      setIsHeadOffice(initialDraftInvoice.customerSnapshot.isHeadOffice);
      setBranchNumber(initialDraftInvoice.customerSnapshot.branchNumber);
      setBranchName(initialDraftInvoice.customerSnapshot.branchName);
      setCustomerPhone(initialDraftInvoice.customerSnapshot.phone || '');

      setItems(initialDraftInvoice.items || []);
      setDiscountType(initialDraftInvoice.discountType || 'fixed');
      setDiscountValue(initialDraftInvoice.discountValue || 0);
    } else {
      fetchNextInvoiceNumber();
    }
    fetchSavedCustomers();
  }, [initialDraftInvoice]);

  const fetchNextInvoiceNumber = async () => {
    try {
      const res = await fetch('/api/invoices/next-number');
      const data = await res.json();
      if (data.nextInvoiceNumber) {
        setInvoiceNumber(data.nextInvoiceNumber);
      }
    } catch (e) {
      console.error('Failed to fetch next invoice number', e);
    }
  };

  const fetchSavedCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSavedCustomers(data);
      }
    } catch (e) {
      console.error('Failed to fetch saved customers', e);
    }
  };

  const taxIdCheck = useMemo(() => {
    return validateThaiTaxId(customerTaxId);
  }, [customerTaxId]);

  const totals = useMemo(() => {
    return calculateInvoiceTotals(
      items,
      priceIncludesVat,
      vatRate,
      discountType,
      discountValue
    );
  }, [items, priceIncludesVat, vatRate, discountType, discountValue]);

  const currentInvoiceData: Partial<Invoice> = useMemo(() => {
    return {
      invoiceNumber: invoiceNumber || 'INV-20260915-001',
      date,
      refBillNumber,
      status: 'draft',
      priceIncludesVat,
      vatRate,
      shopSnapshot: {
        restaurantName: shopSettings.restaurantName,
        taxId: shopSettings.taxId,
        address: shopSettings.address,
        phone: shopSettings.phone,
        isHeadOffice: shopSettings.isHeadOffice,
        branchNumber: shopSettings.branchNumber,
        branchName: shopSettings.branchName,
        logo: shopSettings.logo,
      },
      customerSnapshot: {
        name: customerName || 'ชื่อผู้ซื้อ / นิติบุคคลผู้รับบริการ',
        taxId: customerTaxId || '0000000000000',
        address: customerAddress || 'ที่อยู่ผู้รับบริการตาม ภ.พ.20',
        isHeadOffice,
        branchNumber,
        branchName,
        phone: customerPhone,
      },
      items,
      subtotal: totals.subtotal,
      discountType,
      discountValue,
      discountAmount: totals.discountAmount,
      totalAfterDiscount: totals.totalAfterDiscount,
      amountBeforeVat: totals.amountBeforeVat,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      thaiBahtText: totals.thaiBahtText,
      notes,
      issuerName,
    };
  }, [
    invoiceNumber,
    date,
    refBillNumber,
    priceIncludesVat,
    vatRate,
    shopSettings,
    customerName,
    customerTaxId,
    customerAddress,
    isHeadOffice,
    branchNumber,
    branchName,
    customerPhone,
    items,
    totals,
    discountType,
    discountValue,
    notes,
    issuerName,
  ]);

  const handleItemChange = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(val) : item.quantity;
          const price = field === 'unitPrice' ? Number(val) : item.unitPrice;
          updated.amount = round2(qty * price);
        }
        return updated;
      })
    );
  };

  const handleQuantityAdjust = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          amount: round2(newQty * item.unitPrice),
        };
      })
    );
  };

  const handleAddItem = () => {
    const newId = String(Date.now());
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        description: '',
        quantity: 1,
        unit: 'รายการ',
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([
        {
          id: String(Date.now()),
          description: '',
          quantity: 1,
          unit: 'รายการ',
          unitPrice: 0,
          amount: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleQuickAdd = (preset: { desc: string; unit: string; price: number }) => {
    if (items.length === 1 && !items[0].description) {
      setItems([
        {
          id: items[0].id,
          description: preset.desc,
          quantity: 1,
          unit: preset.unit,
          unitPrice: preset.price,
          amount: preset.price,
        },
      ]);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: preset.desc,
        quantity: 1,
        unit: preset.unit,
        unitPrice: preset.price,
        amount: preset.price,
      },
    ]);
  };

  const handleSearchRD = async () => {
    const cleanedTIN = customerTaxId.replace(/[^0-9]/g, '');
    if (cleanedTIN.length !== 13) {
      setRdStatusType('warning');
      setRdStatusMessage('กรุณาระบุเลขประจำตัวผู้เสียภาษี 13 หลักก่อนค้นหา');
      return;
    }

    setSearchingRD(true);
    setRdStatusMessage('กำลังตรวจสอบฐานข้อมูล VAT สรรพากร (rdws.rd.go.th)...');
    setRdStatusType('info');

    try {
      const res = await fetch('/api/vat-service/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxId: cleanedTIN }),
      });

      const data: RDLookupResult = await res.json();
      setSearchingRD(false);

      if (data.success && data.found) {
        setRdLookupResult(data);
        setShowRDModal(true);
        setRdStatusType('success');
        setRdStatusMessage('พบข้อมูลผู้ประกอบการจดทะเบียน VAT ในระบบกรมสรรพากร');
      } else {
        setRdStatusType('warning');
        setRdStatusMessage(
          data.message ||
            'ไม่พบข้อมูลในระบบภาษีมูลค่าเพิ่มของกรมสรรพากร หรือระบบขัดข้อง สามารถกรอกข้อมูลเองได้'
        );
      }
    } catch {
      setSearchingRD(false);
      setRdStatusType('warning');
      setRdStatusMessage(
        'ยังไม่สามารถเชื่อมต่อระบบ VAT ของกรมสรรพากรได้ สามารถกรอกข้อมูลด้วยตนเองได้'
      );
    }
  };

  const handleConfirmRDData = (selected: {
    name: string;
    taxId: string;
    isHeadOffice: boolean;
    branchNumber: string;
    branchName: string;
    address: string;
  }) => {
    setCustomerName(selected.name);
    setCustomerTaxId(selected.taxId);
    setIsHeadOffice(selected.isHeadOffice);
    setBranchNumber(selected.branchNumber);
    setBranchName(selected.branchName);
    setCustomerAddress(selected.address);
    setRdStatusType('success');
    setRdStatusMessage('ยืนยันและนำข้อมูลจากกรมสรรพากรลงในเอกสารเรียบร้อยแล้ว');
  };

  const handleSelectSavedCustomer = (c: Customer) => {
    setCustomerTaxId(c.taxId);
    setCustomerName(c.name);
    setCustomerAddress(c.address);
    setIsHeadOffice(c.isHeadOffice);
    setBranchNumber(c.branchNumber);
    setBranchName(c.branchName);
    if (c.phone) setCustomerPhone(c.phone);
    setShowCustomerDropdown(false);
    setRdStatusType('info');
    setRdStatusMessage(`เลือกข้อมูลลูกค้าเดิม: ${c.name}`);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!invoiceNumber.trim()) errors.push('กรุณาระบุเลขที่เอกสาร');
    if (!date) errors.push('กรุณาระบุวันที่ออกเอกสาร');
    if (!customerName.trim()) errors.push('กรุณากรอกชื่อผู้ซื้อ / นิติบุคคล');
    if (!customerTaxId.trim() || customerTaxId.replace(/[^0-9]/g, '').length !== 13) {
      errors.push('กรุณาระบุเลขประจำตัวผู้เสียภาษี 13 หลักของผู้ซื้อให้ถูกต้อง');
    }
    if (!customerAddress.trim()) errors.push('กรุณาระบุที่อยู่ของผู้ซื้อ');
    if (items.length === 0 || !items.some((i) => i.description.trim() && i.amount > 0)) {
      errors.push('กรุณาระบุรายการสินค้าหรือบริการอย่างน้อย 1 รายการพร้อมยอดเงิน');
    }
    if (totals.totalAmount <= 0) {
      errors.push('ยอดเงินรวมทั้งสิ้นต้องมากกว่า 0 บาท');
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSaveInvoice = async (targetStatus: 'draft' | 'issued') => {
    if (isSubmitting) return;

    if (targetStatus === 'issued') {
      const isValid = validateForm();
      if (!isValid) return;
    }

    setIsSubmitting(true);
    setFormErrors([]);

    const payload: Invoice = {
      id: initialDraftInvoice ? initialDraftInvoice.id : '',
      invoiceNumber,
      date,
      time: new Date().toTimeString().slice(0, 5),
      refBillNumber: refBillNumber.trim() || undefined,
      status: targetStatus,
      priceIncludesVat,
      vatRate,
      shopSnapshot: {
        restaurantName: shopSettings.restaurantName,
        taxId: shopSettings.taxId,
        address: shopSettings.address,
        phone: shopSettings.phone,
        isHeadOffice: shopSettings.isHeadOffice,
        branchNumber: shopSettings.branchNumber,
        branchName: shopSettings.branchName,
        logo: shopSettings.logo,
      },
      customerSnapshot: {
        taxId: customerTaxId.replace(/[^0-9]/g, ''),
        name: customerName.trim(),
        address: customerAddress.trim(),
        isHeadOffice,
        branchNumber: branchNumber || '00000',
        branchName: branchName || (isHeadOffice ? 'สำนักงานใหญ่' : 'สาขา'),
        phone: customerPhone.trim() || undefined,
      },
      items,
      subtotal: totals.subtotal,
      discountType,
      discountValue,
      discountAmount: totals.discountAmount,
      totalAfterDiscount: totals.totalAfterDiscount,
      amountBeforeVat: totals.amountBeforeVat,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      thaiBahtText: totals.thaiBahtText,
      notes: notes.trim() || undefined,
      issuerName: issuerName.trim() || shopSettings.defaultIssuerName,
      createdAt: initialDraftInvoice ? initialDraftInvoice.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: targetStatus === 'issued' ? new Date().toISOString() : undefined,
    };

    try {
      const url = initialDraftInvoice ? `/api/invoices/${initialDraftInvoice.id}` : '/api/invoices';
      const method = initialDraftInvoice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      setIsSubmitting(false);

      if (res.ok && resData.success) {
        const finalInv = resData.invoice;
        onInvoiceCreated(finalInv);

        if (targetStatus === 'issued') {
          setSavedInvoiceForPrint(finalInv);
          setShowPrintModal(true);
        } else {
          alert('บันทึกฉบับร่างเรียบร้อยแล้ว');
          fetchNextInvoiceNumber();
        }
      } else {
        setFormErrors([resData.message || 'บันทึกเอกสารไม่สำเร็จ']);
      }
    } catch {
      setIsSubmitting(false);
      setFormErrors(['เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว กรุณาลองใหม่อีกครั้ง']);
    }
  };

  const handleResetForm = () => {
    if (confirm('คุณต้องการล้างข้อมูลเพื่อเริ่มกรอกบิลใหม่หรือไม่?')) {
      fetchNextInvoiceNumber();
      setCustomerTaxId('');
      setCustomerName('');
      setCustomerAddress('');
      setIsHeadOffice(true);
      setBranchNumber('00000');
      setBranchName('สำนักงานใหญ่');
      setCustomerPhone('');
      setRefBillNumber('');
      setNotes('');
      setItems([
        {
          id: '1',
          description: 'ค่าอาหารและเครื่องดื่ม',
          quantity: 1,
          unit: 'รายการ',
          unitPrice: 1070,
          amount: 1070,
        },
      ]);
      setDiscountValue(0);
      setRdStatusMessage(null);
      setFormErrors([]);
      if (onCancelDraftEdit) onCancelDraftEdit();
    }
  };

  return (
    <div className="max-w-[1520px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
      {/* Draft Notice Banner */}
      {initialDraftInvoice && (
        <div className="mb-4 bg-amber-50/90 border border-amber-300/80 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <strong className="font-bold">
                กำลังแก้ไขฉบับร่าง: #{initialDraftInvoice.invoiceNumber}
              </strong>
              <span className="text-amber-800 ml-2 hidden sm:inline">
                สามารถปรับปรุงรายการแล้วกดยืนยันเพื่อออกเป็นใบกำกับภาษีฉบับสมบูรณ์
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelDraftEdit}
            className="text-xs font-semibold px-3 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors"
          >
            ยกเลิกแก้ไข
          </button>
        </div>
      )}

      {/* Mobile / Tablet Segmented View Switcher */}
      <div className="lg:hidden mb-4 flex rounded-xl bg-slate-200/80 p-1 border border-slate-300/60">
        <button
          type="button"
          onClick={() => setMobileView('form')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileView === 'form'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. แบบฟอร์มกรอกบิล
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileView === 'preview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. ตรวจตัวอย่างเอกสาร A4
        </button>
      </div>

      {/* Main Dual-Desk Layout: Left Form (50%), Right Live Document Desk (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT DESK: BILLING WORKSTATION FORM                      */}
        {/* ======================================================== */}
        <div
          className={`lg:col-span-6 space-y-4 ${
            mobileView === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Section 1: Document Metadata Toolbar */}
          <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  ข้อมูลหัวเอกสารใบกำกับภาษี
                </h2>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                สถานะ: <span className="font-bold text-amber-700">กำลังร่าง</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3">
              {/* Invoice Number */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  เลขที่เอกสาร:*
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    placeholder="INV-YYYYMMDD-001"
                  />
                  <button
                    type="button"
                    onClick={fetchNextInvoiceNumber}
                    title="รันเลขใหม่อัตโนมัติ"
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Date */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  วันที่ออกเอกสาร:*
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* Reference Bill No. */}
              <div className="sm:col-span-12">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  อ้างอิงเลขที่บิลเดิมของร้าน / เลขโต๊ะ / POS Ref (ไม่บังคับ):
                </label>
                <input
                  type="text"
                  value={refBillNumber}
                  onChange={(e) => setRefBillNumber(e.target.value)}
                  placeholder="เช่น #POS-1048 หรือ โต๊ะ 7 รอบเที่ยง"
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Customer / Buyer Workspace */}
          <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-800" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  ข้อมูลผู้ซื้อ / ผู้รับบริการ (ภ.พ.20)
                </h2>
              </div>

              {/* Saved Customers Autocomplete Dropdown */}
              {savedCustomers.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-50/80 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>เลือกลูกค้าเดิม ({savedCustomers.length})</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showCustomerDropdown && (
                    <div className="absolute right-0 mt-1.5 w-80 max-h-64 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-xl z-30 p-2 space-y-1">
                      <div className="p-1 border-b border-slate-100 mb-1">
                        <input
                          type="text"
                          placeholder="พิมพ์ค้นหาชื่อ หรือ เลขผู้เสียภาษี..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                          autoFocus
                        />
                      </div>
                      {savedCustomers
                        .filter(
                          (c) =>
                            c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            c.taxId.includes(customerSearchQuery)
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectSavedCustomer(c)}
                            className="p-2 text-xs rounded-lg hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer transition-colors border border-transparent hover:border-emerald-200"
                          >
                            <p className="font-bold truncate text-slate-900">{c.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {formatTaxId(c.taxId)} • {c.isHeadOffice ? 'สนง.ใหญ่' : `สาขา ${c.branchNumber}`}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tax ID & RD Search Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  เลขประจำตัวผู้เสียภาษี 13 หลัก:*
                </label>
                {customerTaxId && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {customerTaxId.replace(/[^0-9]/g, '').length}/13
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  id="customer-tax-id-input"
                  type="text"
                  maxLength={17}
                  value={customerTaxId}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setCustomerTaxId(raw);
                    setRdStatusMessage(null);
                  }}
                  placeholder="กรอกเลข 13 หลัก เช่น 0107544000108"
                  className="flex-1 text-sm font-mono font-bold tracking-wider px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />

                <button
                  id="search-rd-btn"
                  type="button"
                  onClick={handleSearchRD}
                  disabled={searchingRD || customerTaxId.replace(/[^0-9]/g, '').length !== 13}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                >
                  <Search className={`w-3.5 h-3.5 ${searchingRD ? 'animate-spin' : ''}`} />
                  <span>{searchingRD ? 'กำลังดึง...' : 'ค้นหาข้อมูลสรรพากร'}</span>
                </button>
              </div>

              {/* Tax ID format feedback */}
              {customerTaxId && (
                <div
                  className={`mt-1.5 text-[11px] flex items-center gap-1.5 ${
                    taxIdCheck.isValidChecksum
                      ? 'text-emerald-700 font-medium'
                      : taxIdCheck.isValidLength
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                >
                  {taxIdCheck.isValidChecksum ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{taxIdCheck.message}</span>
                </div>
              )}

              {/* RD Status Message */}
              {rdStatusMessage && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                    rdStatusType === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : rdStatusType === 'warning'
                      ? 'bg-amber-50 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {rdStatusType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 leading-relaxed">{rdStatusMessage}</div>
                </div>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                ชื่อผู้ซื้อ / นิติบุคคล / บุคคลธรรมดา:*
              </label>
              <input
                id="customer-name-input"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="เช่น บริษัท ไทยฟู๊ด เซ็นเตอร์ จำกัด"
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {/* Branch Selection */}
            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 block">
                สถานประกอบการตาม ภ.พ.20:*
              </label>
              <div className="flex items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="custBranchType"
                    checked={isHeadOffice}
                    onChange={() => {
                      setIsHeadOffice(true);
                      setBranchNumber('00000');
                      setBranchName('สำนักงานใหญ่');
                    }}
                    className="text-emerald-800 focus:ring-emerald-700"
                  />
                  <span className="font-semibold text-slate-800">สำนักงานใหญ่ (00000)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="custBranchType"
                    checked={!isHeadOffice}
                    onChange={() => {
                      setIsHeadOffice(false);
                      if (branchNumber === '00000') setBranchNumber('00001');
                    }}
                    className="text-emerald-800 focus:ring-emerald-700"
                  />
                  <span className="font-semibold text-slate-800">สาขา</span>
                </label>
              </div>

              {!isHeadOffice && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-0.5">
                      เลขที่สาขา 5 หลัก:*
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={branchNumber}
                      onChange={(e) => setBranchNumber(e.target.value)}
                      placeholder="00001"
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-0.5">
                      ชื่อสาขา (ถ้ามี):
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="เช่น สาขาเชียงใหม่"
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                ที่อยู่สถานประกอบการตาม ภ.พ.20:*
              </label>
              <textarea
                id="customer-address-input"
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="เลขที่ อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Section 3: Itemized Table & Line Items */}
          <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-800" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  รายการอาหาร / เครื่องดื่ม / บริการ
                </h2>
              </div>

              {/* VAT Inclusivity Toggle Switch */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setPriceIncludesVat(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    priceIncludesVat
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ราคา รวม VAT
                </button>
                <button
                  type="button"
                  onClick={() => setPriceIncludesVat(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    !priceIncludesVat
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ราคา ยังไม่รวม VAT
                </button>
              </div>
            </div>

            {/* Quick Food Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> ทางลัด:
              </span>
              <button
                type="button"
                onClick={() =>
                  handleQuickAdd({ desc: 'ค่าอาหารและเครื่องดื่ม', unit: 'รายการ', price: 1070 })
                }
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                อาหารและเครื่องดื่ม 1,070.-
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAdd({ desc: 'เซ็ตอาหารกลางวัน', unit: 'ชุด', price: 350 })
                }
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                เซ็ตอาหาร 350.-
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAdd({ desc: 'บริการจัดเลี้ยงโต๊ะอาหาร', unit: 'งาน', price: 5000 })
                }
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                จัดเลี้ยง 5,000.-
              </button>
            </div>

            {/* Rows List */}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg space-y-2 transition-all hover:border-slate-400"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length === 1 && !item.description}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="ลบแถวนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(item.id, 'description', e.target.value)
                        }
                        placeholder="รายละเอียดรายการสินค้า/อาหาร"
                        className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => handleQuantityAdjust(item.id, -1)}
                        className="w-6 h-7 bg-white border border-r-0 border-slate-300 rounded-l-md text-slate-600 hover:bg-slate-100 text-xs font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            'quantity',
                            Math.max(1, parseFloat(e.target.value) || 0)
                          )
                        }
                        className="w-full text-xs text-center font-mono font-bold h-7 bg-white border border-slate-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityAdjust(item.id, 1)}
                        className="w-6 h-7 bg-white border border-l-0 border-slate-300 rounded-r-md text-slate-600 hover:bg-slate-100 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        placeholder="หน่วย"
                        className="w-full text-xs text-center px-2 py-1.5 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            'unitPrice',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="ราคา/หน่วย"
                        className="w-full text-xs text-right font-mono font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
                    <span className="text-[11px] text-slate-500">รวมแถวนี้:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(item.amount)} ฿
                    </span>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 border border-dashed border-slate-300 hover:border-emerald-700 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-900 hover:bg-emerald-50/50 flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มแถวรายการ</span>
              </button>
            </div>

            {/* Discount Row */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600 text-[11px]">ส่วนลด:</span>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white font-medium"
                >
                  <option value="fixed">บาท (฿)</option>
                  <option value="percent">เปอร์เซ็นต์ (%)</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 px-2 py-1 text-xs text-right font-mono font-bold border border-slate-300 rounded-md bg-white"
                />
              </div>

              {totals.discountAmount > 0 && (
                <span className="text-xs text-rose-600 font-bold font-mono">
                  - {formatCurrency(totals.discountAmount)} บาท
                </span>
              )}
            </div>

            {/* Issuer & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                  ชื่อผู้ออกเอกสาร:
                </label>
                <input
                  type="text"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                  หมายเหตุท้ายเอกสาร:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น สแกน QR Code พร้อมเพย์"
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Validation Errors Notice */}
          {formErrors.length > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs text-rose-800 space-y-1">
              <strong className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                กรุณาตรวจสอบข้อมูลก่อนออกเอกสาร:
              </strong>
              <ul className="list-disc list-inside space-y-0.5 pl-2">
                {formErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="bg-white rounded-xl border border-[#e2e0d8] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างฟอร์ม</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="save-draft-btn"
                type="button"
                onClick={() => handleSaveInvoice('draft')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกร่าง</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileView('preview')}
                className="lg:hidden flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ตรวจ A4</span>
              </button>

              <button
                id="confirm-issue-print-btn"
                type="button"
                onClick={() => handleSaveInvoice('issued')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{isSubmitting ? 'กำลังออกเอกสาร...' : 'ยืนยันออกเอกสารและพิมพ์'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT DESK: REALISTIC A4 DOCUMENT INSPECTOR              */}
        {/* ======================================================== */}
        <div
          className={`lg:col-span-6 space-y-3 ${
            mobileView === 'form' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Document Inspector Header Strip */}
          <div className="sticky top-20 z-20 bg-[#1e293b] text-white rounded-xl px-4 py-3 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="font-bold text-xs leading-tight">
                  ตัวอย่างเอกสาร A4 เสมือนจริง (ภ.พ.20)
                </h3>
                <p className="text-[10px] text-slate-400">
                  อัปเดตตามการกรอกสด • พร้อมสั่งพิมพ์ทันที
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPreviewScale((prev) => (prev === 1 ? 0.85 : prev === 0.85 ? 1.1 : 1))
                }
                title="ปรับขนาดการแสดงผล"
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-md text-xs font-mono border border-slate-700"
              >
                {Math.round(previewScale * 100)}%
              </button>

              <button
                type="button"
                onClick={() => {
                  setSavedInvoiceForPrint(currentInvoiceData as Invoice);
                  setShowPrintModal(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์เอกสารนี้</span>
              </button>
            </div>
          </div>

          {/* Paper Canvas */}
          <div className="bg-[#e8e6df] p-3 sm:p-5 rounded-xl border border-[#d6d3c8] shadow-inner overflow-x-auto min-h-[700px] flex justify-center">
            <div
              className="transition-transform duration-200 origin-top shadow-xl"
              style={{ transform: `scale(${previewScale})` }}
            >
              <InvoicePreview
                invoice={currentInvoiceData}
                shopSettings={shopSettings}
                printCopyType="original"
                isCompact={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RD Branch Selection Modal */}
      {rdLookupResult && (
        <RDVerificationModal
          lookupResult={rdLookupResult}
          isOpen={showRDModal}
          onClose={() => setShowRDModal(false)}
          onConfirm={handleConfirmRDData}
        />
      )}

      {/* Print Modal */}
      {savedInvoiceForPrint && (
        <PrintModal
          invoice={savedInvoiceForPrint}
          shopSettings={shopSettings}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
