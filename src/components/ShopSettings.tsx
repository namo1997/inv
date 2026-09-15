import React, { useState } from 'react';
import {
  Store,
  Upload,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  FileUp,
  KeyRound,
  Wifi,
  Activity,
  Trash2,
  Building2,
  Percent,
  Database,
  RefreshCw,
  ShieldCheck,
  Building
} from 'lucide-react';
import { ShopSettings } from '../types';
import { validateThaiTaxId, formatTaxId } from '../utils/taxValidation';

interface ShopSettingsProps {
  settings: ShopSettings;
  onSettingsUpdated: (updated: ShopSettings) => void;
  rdStatus: {
    connected: boolean;
    status: 'online' | 'offline' | 'warning' | 'checking';
    latencyMs?: number;
    message?: string;
  };
  onRefreshRDStatus: () => void;
}

export const ShopSettingsView: React.FC<ShopSettingsProps> = ({
  settings,
  onSettingsUpdated,
  rdStatus,
  onRefreshRDStatus,
}) => {
  // Form fields
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName || '');
  const [taxId, setTaxId] = useState(settings.taxId || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [isHeadOffice, setIsHeadOffice] = useState(settings.isHeadOffice ?? true);
  const [branchNumber, setBranchNumber] = useState(settings.branchNumber || '00000');
  const [branchName, setBranchName] = useState(settings.branchName || 'สำนักงานใหญ่');
  const [logo, setLogo] = useState<string | null>(settings.logo || null);
  const [vatRate, setVatRate] = useState<number>(settings.vatRate || 7);
  const [defaultPriceIncludesVat, setDefaultPriceIncludesVat] = useState(
    settings.defaultPriceIncludesVat ?? true
  );
  const [defaultIssuerName, setDefaultIssuerName] = useState(
    settings.defaultIssuerName || 'เจ้าหน้าที่ออกใบกำกับภาษี'
  );

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // PIN Change modal/state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Backup & Restore
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const taxValidation = validateThaiTaxId(taxId);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
  };

  // Submit settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');

    const cleanedTIN = taxId.replace(/[^0-9]/g, '');
    if (cleanedTIN.length !== 13) {
      setErrorMessage('เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก');
      setSaving(false);
      return;
    }

    const payload = {
      restaurantName: restaurantName.trim(),
      taxId: cleanedTIN,
      address: address.trim(),
      phone: phone.trim(),
      isHeadOffice,
      branchNumber: isHeadOffice ? '00000' : branchNumber.trim() || '00001',
      branchName: isHeadOffice ? 'สำนักงานใหญ่' : branchName.trim(),
      logo,
      vatRate: Number(vatRate) || 7,
      defaultPriceIncludesVat,
      defaultIssuerName: defaultIssuerName.trim(),
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok && data.success) {
        onSettingsUpdated(data.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch {
      setSaving(false);
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลได้');
    }
  };

  // PIN Change submit
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMessage(null);

    if (newPin !== confirmPin) {
      setPinChangeMessage({ text: 'รหัส PIN ใหม่และยืนยันไม่ตรงกัน', type: 'error' });
      return;
    }

    if (newPin.length < 4) {
      setPinChangeMessage({ text: 'รหัส PIN ต้องมีอย่างน้อย 4 หลัก', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPinChangeMessage({ text: 'เปลี่ยนรหัส PIN สำเร็จเรียบร้อย', type: 'success' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinChangeMessage({ text: data.message || 'เปลี่ยน PIN ไม่สำเร็จ', type: 'error' });
      }
    } catch {
      setPinChangeMessage({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
    }
  };

  // Backup download
  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/export';
  };

  // Restore handler
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('คำเตือน: การกู้คืนข้อมูลจะเขียนทับข้อมูลปัจจุบันทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          setRestoreMessage({ text: resData.message, type: 'success' });
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setRestoreMessage({ text: resData.message || 'กู้คืนไม่สำเร็จ', type: 'error' });
        }
      } catch (err: any) {
        setRestoreMessage({ text: 'ไฟล์ JSON ไม่ถูกต้อง: ' + err.message, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Profile Card */}
        <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ข้อมูลสถานประกอบการร้านอาหาร (ตามแบบ ภ.พ.20)
              </h2>
              <p className="text-[11px] text-slate-500">
                ข้อมูลนี้จะถูกบันทึกถาวรและดึงมาเป็นผู้ขายในใบกำกับภาษีโดยอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Restaurant Name */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                ชื่อสถานประกอบการ / ชื่อกิจการตาม ภ.พ.20:*
              </label>
              <input
                id="shop-name-input"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="เช่น บริษัท โซลาว จำกัด"
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {/* Shop Tax ID */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                เลขประจำตัวผู้เสียภาษี 13 หลัก:*
              </label>
              <input
                id="shop-tax-id-input"
                type="text"
                required
                maxLength={13}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0505559001193"
                className="w-full text-sm font-mono font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
              {taxId && (
                <div
                  className={`mt-1 text-[11px] flex items-center gap-1 ${
                    taxValidation.isValidChecksum
                      ? 'text-emerald-700 font-medium'
                      : 'text-amber-700'
                  }`}
                >
                  {taxValidation.isValidChecksum ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{taxValidation.message}</span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                เบอร์โทรศัพท์ติดต่อ:*
              </label>
              <input
                id="shop-phone-input"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 053-811-288"
                className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {/* Branch Type & Number */}
            <div className="sm:col-span-2 p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-2.5">
              <label className="text-xs font-semibold text-slate-700 block">
                สำนักงานใหญ่ หรือ สาขา (ตาม ภ.พ.20):*
              </label>
              <div className="flex items-center gap-8 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="shopBranch"
                    checked={isHeadOffice}
                    onChange={() => {
                      setIsHeadOffice(true);
                      setBranchNumber('00000');
                      setBranchName('สำนักงานใหญ่');
                    }}
                    className="text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>สำนักงานใหญ่ (รหัส 00000)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="shopBranch"
                    checked={!isHeadOffice}
                    onChange={() => {
                      setIsHeadOffice(false);
                      if (branchNumber === '00000') setBranchNumber('00001');
                    }}
                    className="text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>สาขาตาม ภ.พ.20</span>
                </label>
              </div>

              {!isHeadOffice && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                      เลขที่สาขา 5 หลักตาม ภ.พ.20:*
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={branchNumber}
                      onChange={(e) => setBranchNumber(e.target.value)}
                      placeholder="เช่น 00001"
                      className="w-full text-xs font-mono font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                      ชื่อสาขา:*
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="เช่น สาขานิมมาน"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                ที่อยู่สถานประกอบการตามแบบ ภ.พ.20:*
              </label>
              <textarea
                id="shop-address-input"
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="เลขที่ อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Financial & VAT Configuration Card */}
        <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                การตั้งค่าภาษีมูลค่าเพิ่ม (VAT) และค่าเริ่มต้นเอกสาร
              </h2>
              <p className="text-[11px] text-slate-500">
                กำหนดอัตราภาษีมูลค่าเพิ่ม และค่าเริ่มต้นสำหรับร้านอาหาร
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* VAT Rate */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                อัตราภาษีมูลค่าเพิ่ม (% VAT):*
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="vat-rate-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                อัตรามาตรฐานปัจจุบันคือ 7%
              </span>
            </div>

            {/* Default Price VAT Mode */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                ค่าเริ่มต้นราคาอาหารและบริการ:
              </label>
              <div className="flex items-center gap-4 mt-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="defaultPriceIncludesVat"
                    checked={defaultPriceIncludesVat}
                    onChange={() => setDefaultPriceIncludesVat(true)}
                    className="text-emerald-800"
                  />
                  <span>ราคา รวม VAT แล้ว (แนะนำสำหรับร้านอาหาร)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="defaultPriceIncludesVat"
                    checked={!defaultPriceIncludesVat}
                    onChange={() => setDefaultPriceIncludesVat(false)}
                    className="text-emerald-800"
                  />
                  <span>ราคา ยังไม่รวม VAT</span>
                </label>
              </div>
            </div>

            {/* Default Issuer Name */}
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                ชื่อผู้มีอำนาจลงนาม / ผู้ออกเอกสารเริ่มต้น:
              </label>
              <input
                type="text"
                value={defaultIssuerName}
                onChange={(e) => setDefaultIssuerName(e.target.value)}
                placeholder="เช่น ผู้จัดการสาขา หรือ เจ้าหน้าที่การเงิน"
                className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Logo Card */}
        <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ตราสัญลักษณ์ร้านอาหาร (Logo)
              </h2>
              <p className="text-[11px] text-slate-500">
                โลโก้จะถูกนำไปพิมพ์บนหัวกระดาษ A4 มุมซ้ายบนของใบกำกับภาษี
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 border border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
              {logo ? (
                <img src={logo} alt="Logo preview" className="max-h-full max-w-full object-contain p-1" />
              ) : (
                <span className="text-[11px] text-slate-400 text-center px-2">ยังไม่มีโลโก้</span>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <label
                htmlFor="logo-file-input"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>เลือกไฟล์รูปโลโก้</span>
              </label>
              <input
                id="logo-file-input"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบโลโก้</span>
                </button>
              )}

              <p className="text-[11px] text-slate-500">
                คำแนะนำ: แนะนำใช้รูปภาพพื้นหลังโปร่งใส (Transparent PNG) เพื่อความสวยงามบนกระดาษพิมพ์ A4
              </p>
            </div>
          </div>
        </div>

        {/* Save feedback banner */}
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-bold">
              บันทึกข้อมูลร้านเรียบร้อยแล้ว ระบบจะจดจำข้อมูลนี้สำหรับการออกใบกำกับภาษีทุกครั้ง
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Save Button */}
        <div className="flex justify-end">
          <button
            id="save-settings-btn"
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการตั้งค่าร้าน'}</span>
          </button>
        </div>
      </form>

      {/* ==================================================== */}
      {/* SECONDARY SETTINGS: RD TEST, PIN CHANGE, BACKUP      */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
        {/* RD VAT Web Service Status & Diagnostic Card */}
        <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Activity className="w-4 h-4 text-emerald-800" />
            <h3 className="text-xs font-bold text-slate-900">
              สถานะ VAT Web Service ของกรมสรรพากร (rd.go.th)
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-600">สถานะการเชื่อมต่อ:</span>
              <span
                className={`font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] ${
                  rdStatus.status === 'online'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : rdStatus.status === 'checking'
                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    rdStatus.status === 'online'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                {rdStatus.status === 'online'
                  ? 'เชื่อมต่อสมบูรณ์ (Online)'
                  : rdStatus.status === 'checking'
                  ? 'กำลังทดสอบ...'
                  : 'ยังไม่เชื่อมต่อ / ขัดข้อง'}
              </span>
            </div>

            {rdStatus.latencyMs !== undefined && (
              <div className="flex items-center justify-between text-slate-500 px-1 text-[11px]">
                <span>ความเร็วการตอบสนอง (Latency):</span>
                <span className="font-mono font-semibold">{rdStatus.latencyMs} ms</span>
              </div>
            )}

            <p className="text-slate-500 text-[11px] leading-relaxed">
              {rdStatus.message || 'ระบบทำการตรวจสอบการเชื่อมต่อไปยัง https://rdws.rd.go.th'}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshRDStatus}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-300"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-800" />
            <span>ทดสอบการเชื่อมต่อระบบสรรพากรเดี๋ยวนี้</span>
          </button>
        </div>

        {/* Change Staff PIN Card */}
        <div className="bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <KeyRound className="w-4 h-4 text-emerald-800" />
            <h3 className="text-xs font-bold text-slate-900">
              เปลี่ยนรหัส PIN เข้าสู่ระบบ
            </h3>
          </div>

          <form onSubmit={handleChangePin} className="space-y-2 text-xs">
            <div>
              <label className="text-slate-600 block mb-0.5 text-[11px]">รหัส PIN ปัจจุบัน:</label>
              <input
                type="password"
                required
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="กรอกรหัส PIN ปัจจุบัน (เช่น 197019)"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 block mb-0.5 text-[11px]">PIN ใหม่ (4-6 หลัก):</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="PIN ใหม่"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-0.5 text-[11px]">ยืนยัน PIN ใหม่:</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="ยืนยัน PIN"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                />
              </div>
            </div>

            {pinChangeMessage && (
              <div
                className={`p-2 rounded-lg text-[11px] ${
                  pinChangeMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border border-rose-300'
                }`}
              >
                {pinChangeMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              เปลี่ยนรหัส PIN
            </button>
          </form>
        </div>

        {/* Backup & Restore Database Card */}
        <div className="sm:col-span-2 bg-white rounded-xl border border-[#e2e0d8] shadow-2xs p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Database className="w-4 h-4 text-emerald-800" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                สำรองและกู้คืนฐานข้อมูลเอกสาร (Data Backup & Restore)
              </h3>
              <p className="text-[11px] text-slate-500">
                ข้อมูลถูกจัดเก็บในฐานข้อมูลถาวรบนเซิร์ฟเวอร์ คุณสามารถส่งออกไฟล์สำรองเก็บไว้ได้
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-800" />
              <span>ดาวน์โหลดไฟล์สำรองข้อมูล (JSON Backup)</span>
            </button>

            <label
              htmlFor="restore-file-input"
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-700" />
              <span>นำเข้าไฟล์เพื่อกู้คืน (Restore JSON)</span>
            </label>
            <input
              id="restore-file-input"
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </div>

          {restoreMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs ${
                restoreMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              {restoreMessage.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
