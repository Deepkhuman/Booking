import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

async function getCroppedBlob(image, crop, scale = 1, rotate = 0) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const rotateRads = (rotate * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
  });
}

export default function ImageCropModal({ src, aspect = 1, onDone, onClose, shape = 'circle' }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [applying, setApplying] = useState(false);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }, [aspect]);

  const handleApply = async () => {
    if (!completedCrop || !imgRef.current) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, scale, rotate);
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      onDone(file);
    } finally {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div
          className="crop-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="crop-modal-header">
            <div>
              <h2 className="dashboard-card-title">Crop Photo</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Drag to reposition · Scroll to zoom</p>
            </div>
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>

          {/* Crop area */}
          <div className="crop-area">
            <ReactCrop
              crop={crop}
              onChange={(_, pct) => setCrop(pct)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              circularCrop={shape === 'circle'}
              minWidth={60}
              minHeight={60}
            >
              <img
                ref={imgRef}
                src={src}
                alt="Crop"
                style={{ maxHeight: 380, maxWidth: '100%', transform: `scale(${scale}) rotate(${rotate}deg)` }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="crop-controls">
            <div className="crop-control-group">
              <button className="crop-ctrl-btn" onClick={() => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(1)))} title="Zoom out"><ZoomOut size={16} /></button>
              <div className="crop-slider-wrap">
                <input type="range" min="0.5" max="3" step="0.05" value={scale}
                  onChange={e => setScale(Number(e.target.value))} className="crop-slider" />
                <span className="crop-slider-label">{Math.round(scale * 100)}%</span>
              </div>
              <button className="crop-ctrl-btn" onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(1)))} title="Zoom in"><ZoomIn size={16} /></button>
            </div>
            <button className="crop-ctrl-btn" onClick={() => setRotate(r => (r + 90) % 360)} title="Rotate 90°">
              <RotateCw size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="crop-actions">
            <button className="btn-ghost" style={{ width: 'auto', padding: '0.6rem 1.25rem' }} onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={applying || !completedCrop}
              style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={handleApply}>
              <Check size={15} /> {applying ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
