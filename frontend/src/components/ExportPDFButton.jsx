import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const SPIN_KEYFRAMES = '@keyframes pdf-spin { to { transform: rotate(360deg); } }';

const OVERLAY_STYLE = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 2147483647,
  background: 'rgba(0,0,0,0.52)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const CARD_STYLE = {
  background: 'white',
  borderRadius: 20,
  padding: '40px 56px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
  boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
  minWidth: 280,
};

export default function ExportPDFButton({ targetId, fileName = 'bao-cao', label = 'Xuất PDF' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 120));
    const hideEls = element.querySelectorAll('.pdf-hide');
    hideEls.forEach(el => { el.dataset.ph = el.style.display; el.style.display = 'none'; });
    try {
      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: fileName + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, windowWidth: element.scrollWidth },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] },
      };
      await html2pdf().set(opt).from(element).save();
    } finally {
      hideEls.forEach(el => { el.style.display = el.dataset.ph || ''; delete el.dataset.ph; });
      setLoading(false);
    }
  };

  return (
    <>
      {loading && createPortal(
        <div style={OVERLAY_STYLE}>
          <style>{SPIN_KEYFRAMES}</style>
          <div style={CARD_STYLE}>
            <svg width="52" height="52" viewBox="0 0 48 48" style={{ animation: 'pdf-spin 0.8s linear infinite' }}>
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <path d="M44 24a20 20 0 0 0-20-20" fill="none" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Đang tạo báo cáo PDF...</p>
              <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        </div>,
        document.body
      )}
      <button
        onClick={handleExport}
        disabled={loading}
        className="pdf-hide flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        {label}
      </button>
    </>
  );
}
