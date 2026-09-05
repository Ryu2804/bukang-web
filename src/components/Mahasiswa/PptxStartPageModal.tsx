import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startPage: number) => void;
}

export default function PptxStartPageModal({ isOpen, onClose, onConfirm }: Props) {
  const [value, setValue] = useState("1");

  if (!isOpen) return null;

  const parsed = Number(value);
  const isValid = Number.isInteger(parsed) && parsed >= 1;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(parsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nomor Halaman Awal</h2>
            <p className="text-sm text-gray-500 mt-0.5">Mulai penomoran halaman dari nomor berapa?</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-2">
          <label htmlFor="pptx-start-page" className="text-sm font-medium text-gray-700">
            Nomor halaman awal
          </label>
          <input
            id="pptx-start-page"
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="w-full border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {!isValid && (
            <p className="text-xs text-red-600">Masukkan angka bulat positif (minimal 1).</p>
          )}
        </div>
        <div className="px-5 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="px-3.5 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
