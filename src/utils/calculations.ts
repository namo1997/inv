import { InvoiceItem } from '../types';
import { thaiBahtText } from './thaiBaht';

export interface CalculationResult {
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  amountBeforeVat: number;
  vatAmount: number;
  totalAmount: number;
  thaiBahtText: string;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  priceIncludesVat: boolean,
  vatRate: number = 7,
  discountType: 'fixed' | 'percent' = 'fixed',
  discountValue: number = 0
): CalculationResult {
  // 1. คำนวณยอดรวมก่อนส่วนลด
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = round2(Number(item.quantity || 0) * Number(item.unitPrice || 0));
    return sum + itemTotal;
  }, 0);

  // 2. คำนวณส่วนลด
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = round2(subtotal * (Math.max(0, Number(discountValue || 0)) / 100));
  } else {
    discountAmount = round2(Math.max(0, Number(discountValue || 0)));
  }
  // ส่วนลดต้องไม่เกินยอดรวม
  discountAmount = Math.min(discountAmount, subtotal);

  const totalAfterDiscount = round2(subtotal - discountAmount);

  let amountBeforeVat = 0;
  let vatAmount = 0;
  let totalAmount = 0;

  if (priceIncludesVat) {
    // กรณี "ราคาที่กรอก รวม VAT แล้ว"
    // ยอดรวมหลังหักส่วนลด คือ ยอดรวมสุทธิที่ต้องจ่าย
    totalAmount = totalAfterDiscount;
    // คำนวณถอยหลังหามูลค่าก่อนภาษี: ยอดก่อน VAT = ยอดรวม / (1 + vatRate / 100)
    // ตัวอย่าง 1,070 / 1.07 = 1,000.00 บาท
    amountBeforeVat = round2(totalAmount / (1 + vatRate / 100));
    // ภาษีมูลค่าเพิ่ม = ยอดรวม - มูลค่าก่อนภาษี = 1,070 - 1,000 = 70.00 บาท
    vatAmount = round2(totalAmount - amountBeforeVat);
  } else {
    // กรณี "ราคาที่กรอก ยังไม่รวม VAT"
    // มูลค่าก่อนภาษี คือ ยอดรวมหลังหักส่วนลด
    amountBeforeVat = totalAfterDiscount;
    // ภาษีมูลค่าเพิ่ม = ยอดก่อนภาษี * (vatRate / 100)
    vatAmount = round2(amountBeforeVat * (vatRate / 100));
    // ยอดรวมสุทธิ = มูลค่าก่อนภาษี + ภาษีมูลค่าเพิ่ม
    totalAmount = round2(amountBeforeVat + vatAmount);
  }

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    totalAfterDiscount: round2(totalAfterDiscount),
    amountBeforeVat: round2(amountBeforeVat),
    vatAmount: round2(vatAmount),
    totalAmount: round2(totalAmount),
    thaiBahtText: thaiBahtText(totalAmount),
  };
}
