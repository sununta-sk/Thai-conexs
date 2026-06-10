// src/components/PhotoCropper.jsx
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useTranslation } from '../hooks/useTranslation';

const ASPECT = 4 / 5; // portrait

const COPY = {
  en: {
    title: 'Adjust Your Photo',
    sub: 'Drag to position and pinch / scroll to zoom',
    zoom: 'Zoom',
    cancel: 'Cancel',
    save: 'Save Photo',
    processing: 'Processing...',
  },
  th: {
    title: 'จัดรูปภาพ',
    sub: 'ลากเพื่อจัดตำแหน่ง บีบ / scroll เพื่อซูม',
    zoom: 'ซูม',
    cancel: 'ยกเลิก',
    save: 'บันทึกรูป',
    processing: 'กำลังประมวลผล...',
  },
};

// Returns a Blob of the cropped image
async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas is empty')),
      'image/jpeg',
      0.9
    );
  });
}

export default function PhotoCropper({ imageSrc, onCancel, onSave }) {
  const { lang } = useTranslation(['common']);
  const t = COPY[lang === 'th' ? 'th' : 'en'];

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      await onSave(blob);
    } catch (err) {
      alert('Error cropping image: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        <div style={S.header}>
          <h2 style={S.title}>{t.title}</h2>
          <p style={S.sub}>{t.sub}</p>
        </div>

        <div style={S.cropArea}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid={true}
            style={{
              containerStyle: { background: '#000' },
            }}
          />
        </div>

        <div style={S.controls}>
          <label style={S.zoomLabel}>{t.zoom}</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={S.zoomSlider}
          />
        </div>

        <div style={S.footer}>
          <button
            style={S.cancelBtn}
            onClick={onCancel}
            disabled={saving}
          >
            {t.cancel}
          </button>
          <button
            style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t.processing : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

const PINK = '#e91e63';
const PINK_DARK = '#c2185b';
const BG = '#0f172a';
const BG_ELEV = '#1e293b';
const BORDER = '#334155';
const TEXT = '#f1f5f9';
const TEXT_SOFT = '#cbd5e1';
const TEXT_MUTED = '#94a3b8';

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 9500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: BG_ELEV,
    borderRadius: 20,
    maxWidth: 560,
    width: '100%',
    maxHeight: '95vh',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${BORDER}`,
    boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px 14px',
    textAlign: 'center',
    borderBottom: `1px solid ${BORDER}`,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: TEXT,
    margin: '0 0 4px',
  },
  sub: {
    fontSize: 13,
    color: TEXT_MUTED,
    margin: 0,
  },
  cropArea: {
    position: 'relative',
    width: '100%',
    height: 0,
    paddingBottom: '100%',
    background: '#000',
  },
  controls: {
    padding: '14px 24px',
    borderTop: `1px solid ${BORDER}`,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  zoomLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: TEXT_SOFT,
    minWidth: 40,
  },
  zoomSlider: {
    flex: 1,
    accentColor: PINK,
  },
  footer: {
    display: 'flex',
    gap: 10,
    padding: '14px 24px 18px',
    borderTop: `1px solid ${BORDER}`,
  },
  cancelBtn: {
    flex: 1,
    padding: '13px',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    color: TEXT_SOFT,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 2,
    padding: '13px',
    background: `linear-gradient(135deg, ${PINK}, ${PINK_DARK})`,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(233, 30, 99, 0.4)',
  },
};
