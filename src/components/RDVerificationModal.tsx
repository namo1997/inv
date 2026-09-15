import React, { useState } from 'react';
import { ShieldCheck, Building2, MapPin, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { RDLookupResult, RDBranchOption } from '../types';

interface RDVerificationModalProps {
  lookupResult: RDLookupResult;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: {
    name: string;
    taxId: string;
    isHeadOffice: boolean;
    branchNumber: string;
    branchName: string;
    address: string;
  }) => void;
}

export const RDVerificationModal: React.FC<RDVerificationModalProps> = ({
  lookupResult,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const branches = lookupResult.allBranches || [];
  const hasMultipleBranches = branches.length > 1;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    hasMultipleBranches ? null : 0
  );

  if (!isOpen) return null;

  const currentSelection: RDBranchOption | null =
    selectedIndex !== null && branches[selectedIndex] ? branches[selectedIndex] : null;

  const handleApply = () => {
    if (!currentSelection) return;
    onConfirm({
      name: lookupResult.name,
      taxId: lookupResult.taxId,
      isHeadOffice: currentSelection.isHeadOffice,
      branchNumber: currentSelection.branchNumber,
      branchName: currentSelection.branchName,
      address: currentSelection.address,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#161c24] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                ผลการค้นหาจากระบบสรรพากร (RD VAT Service)
              </h3>
              <p className="text-[11px] text-emerald-400">
                ข้อมูลทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20) จาก rdws.rd.go.th
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Company Name Banner */}
          <div className="bg-[#faf9f5] border border-[#e2e0d8] rounded-lg p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>ชื่อนิติบุคคล / ผู้ประกอบการที่จดทะเบียน:</span>
            </div>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {lookupResult.name}
            </p>
            <p className="text-[11px] text-slate-600 mt-1 font-mono">
              เลขประจำตัวผู้เสียภาษี: <span className="font-bold text-slate-900">{lookupResult.taxId}</span>
            </p>
          </div>

          {/* Multiple branches alert */}
          {hasMultipleBranches ? (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">พบข้อมูลทั้งหมด {branches.length} สาขา:</strong>
                <p className="mt-0.5 text-amber-800 text-[11px]">
                  ตามระเบียบกรมสรรพากร ห้ามเลือกสำนักงานใหญ่แทนโดยอัตโนมัติ กรุณาเลือกสาขาที่ลูกค้ามาใช้บริการจริง:
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>พบข้อมูล 1 สาขา ตรวจสอบความถูกต้องแล้วกดนำข้อมูลไปใช้:</span>
            </div>
          )}

          {/* Branch List */}
          <div className="space-y-2">
            {branches.map((b, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50/60 ring-1 ring-emerald-700'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="branchSelection"
                        checked={isSelected}
                        onChange={() => setSelectedIndex(idx)}
                        className="text-emerald-800 focus:ring-emerald-700"
                      />
                      <span>
                        {b.isHeadOffice ? 'สำนักงานใหญ่' : b.branchName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 rounded border border-slate-300 text-slate-700">
                      สาขา: {b.branchNumber}
                    </span>
                  </div>

                  <div className="text-slate-600 text-[11px] flex items-start gap-1.5 pl-5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-[#faf9f5] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={selectedIndex === null}
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-40 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>นำข้อมูลไปใช้ในใบกำกับภาษี</span>
          </button>
        </div>
      </div>
    </div>
  );
};
