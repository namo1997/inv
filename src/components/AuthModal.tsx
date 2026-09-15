import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('กรุณากรอกรหัส PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('tax_auth_token', data.token);
        onSuccess(data.token);
      } else {
        setError(data.message || 'รหัส PIN ไม่ถูกต้อง');
        setPin('');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 6) {
        setTimeout(() => {
          autoSubmitPin(nextPin);
        }, 120);
      }
    }
  };

  const autoSubmitPin = async (candidatePin: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: candidatePin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('tax_auth_token', data.token);
        onSuccess(data.token);
      } else {
        setError(data.message || 'รหัส PIN ไม่ถูกต้อง');
        setPin('');
      }
    } catch {
      setError('เชื่อมต่อระบบล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
        {/* Workstation Header */}
        <div className="bg-[#161c24] p-6 text-white text-center border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-emerald-700/80 border border-emerald-500/40 mx-auto flex items-center justify-center mb-3 shadow-inner text-white">
            <Lock className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase mb-1">
            บริษัท โซลาว จำกัด • POS TERMINAL
          </p>
          <h2 className="text-lg font-bold tracking-tight text-white">เข้าสู่ระบบออกใบกำกับภาษี</h2>
          <p className="text-xs text-slate-400 mt-1">
            กรอกรหัส PIN ประจำร้าน 6 หลัก เพื่อเข้าสู่ระบบ
          </p>
        </div>

        {/* PIN Indicators & Keypad */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {/* 6 Digit Pins */}
              <div className="flex justify-center items-center gap-2.5 my-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      pin.length > index
                        ? 'bg-emerald-800 border-emerald-800 scale-110'
                        : 'border-slate-300 bg-slate-100'
                    }`}
                  />
                ))}
              </div>

              <div className="relative mt-3">
                <input
                  id="auth-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPin(val);
                    setError('');
                    if (val.length === 6) {
                      autoSubmitPin(val);
                    }
                  }}
                  placeholder="รหัส PIN: 197019"
                  className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white text-slate-800"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 justify-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Quick Touch Keypad for POS / Tablet */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="h-11 rounded-lg bg-[#faf9f5] hover:bg-slate-100 active:bg-slate-200 text-slate-900 text-lg font-bold transition-colors border border-slate-200 flex items-center justify-center shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleDelete}
                className="h-11 rounded-lg bg-[#faf9f5] hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center shadow-2xs"
              >
                ลบ
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 rounded-lg bg-[#faf9f5] hover:bg-slate-100 active:bg-slate-200 text-slate-900 text-lg font-bold transition-colors border border-slate-200 flex items-center justify-center shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => autoSubmitPin(pin)}
                disabled={loading || pin.length === 0}
                className="h-11 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold transition-colors flex items-center justify-center shadow-2xs disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Shop PIN Shortcut */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                รหัสร้าน: <strong className="text-slate-900 font-mono">197019</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPin('197019');
                  autoSubmitPin('197019');
                }}
                className="text-emerald-800 hover:underline font-bold"
              >
                แตะเพื่อใช้ 197019
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
