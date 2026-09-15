/**
 * แปลงจำนวนเงินตัวเลขเป็นข้อความภาษาไทย (บาทถ้วน / สตางค์)
 * ตามมาตรฐานการออกใบกำกับภาษีของกรมสรรพากร
 */
export function thaiBahtText(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return 'ศูนย์บาทถ้วน';
  const numericValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericValue)) return 'ศูนย์บาทถ้วน';

  const rounded = Math.round(numericValue * 100) / 100;
  if (rounded === 0) return 'ศูนย์บาทถ้วน';

  const numWords = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const unitWords = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

  function convertGroup(nStr: string): string {
    let res = '';
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = Number(nStr[i]);
      const pos = len - i - 1;
      if (digit === 0) continue;
      if (pos === 0) {
        // หลักหน่วย ถ้ามีค่ามากกว่า 0 ในหลักก่อนหน้า และลงท้ายด้วย 1 จะอ่านว่า "เอ็ด"
        if (digit === 1 && len > 1 && nStr.split('').slice(0, -1).some(c => c !== '0')) {
          res += 'เอ็ด';
        } else {
          res += numWords[digit];
        }
      } else if (pos === 1) {
        if (digit === 1) res += 'สิบ';
        else if (digit === 2) res += 'ยี่สิบ';
        else res += numWords[digit] + 'สิบ';
      } else {
        res += numWords[digit] + unitWords[pos];
      }
    }
    return res;
  }

  function convertInteger(str: string): string {
    if (!str || Number(str) === 0) return '';
    let res = '';
    const groups: string[] = [];
    let s = str;
    while (s.length > 0) {
      groups.unshift(s.slice(-6));
      s = s.slice(0, -6);
    }
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const gText = convertGroup(g);
      if (gText) {
        res += gText;
        const remainingMil = groups.length - 1 - i;
        if (remainingMil > 0) res += 'ล้าน'.repeat(remainingMil);
      }
    }
    return res;
  }

  const parts = Math.abs(rounded).toFixed(2).split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  let result = '';
  if (Number(intPart) > 0) {
    result += convertInteger(intPart) + 'บาท';
  }

  if (Number(decPart) === 0) {
    result += 'ถ้วน';
  } else {
    result += convertGroup(decPart) + 'สตางค์';
  }

  return (rounded < 0 ? 'ลบ' : '') + result;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
