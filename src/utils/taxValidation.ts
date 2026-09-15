/**
 * ตรวจสอบความถูกต้องของโครงสร้างเลขประจำตัวผู้เสียภาษีอากร 13 หลัก (Check Digit Mod 11)
 * หมายเหตุ: การผ่านการตรวจโครงสร้างตัวเลขไม่ได้หมายความว่าเป็นผู้เสียภาษีที่จดทะเบียนจริง
 * ต้องยืนยันผ่านระบบ VAT Service ของกรมสรรพากร หรือเอกสาร ภ.พ.20
 */
export interface TaxIdValidationResult {
  isValidLength: boolean;
  isNumeric: boolean;
  isValidChecksum: boolean;
  status: 'empty' | 'invalid_length' | 'invalid_chars' | 'invalid_checksum' | 'valid_format';
  message: string;
}

export function validateThaiTaxId(taxId: string): TaxIdValidationResult {
  const cleaned = taxId.replace(/[^0-9]/g, '');

  if (!cleaned) {
    return {
      isValidLength: false,
      isNumeric: false,
      isValidChecksum: false,
      status: 'empty',
      message: 'กรุณากรอกเลขประจำตัวผู้เสียภาษี 13 หลัก',
    };
  }

  if (cleaned.length !== 13) {
    return {
      isValidLength: false,
      isNumeric: true,
      isValidChecksum: false,
      status: 'invalid_length',
      message: `กรอกแล้ว ${cleaned.length}/13 หลัก (ต้องครบ 13 หลัก)`,
    };
  }

  // คำนวณ Check digit mod 11
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(cleaned[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  const isValidChecksum = checkDigit === Number(cleaned[12]);

  if (!isValidChecksum) {
    return {
      isValidLength: true,
      isNumeric: true,
      isValidChecksum: false,
      status: 'invalid_checksum',
      message: 'รูปแบบเลข 13 หลักไม่ถูกต้อง (Check digit ไม่ตรงตามสูตรคำนวณ)',
    };
  }

  return {
    isValidLength: true,
    isNumeric: true,
    isValidChecksum: true,
    status: 'valid_format',
    message: 'รูปแบบเลข 13 หลักถูกต้อง (ยังไม่ยืนยันตัวตน ต้องค้นหาผ่านกรมสรรพากร)',
  };
}

export function formatTaxId(taxId: string): string {
  const cleaned = taxId.replace(/[^0-9]/g, '');
  if (cleaned.length <= 1) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 1)}-${cleaned.slice(1)}`;
  if (cleaned.length <= 10) return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10)}`;
  return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12, 13)}`;
}
