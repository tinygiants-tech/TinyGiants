import React, { useState } from 'react';

export default function VideoGif({ src, width = '85%', maxWidth = '800px' }) {
  const [showControls, setShowControls] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: width,
        maxWidth: maxWidth,
        margin: '2rem auto',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        controls={showControls}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          borderRadius: '12px',
          display: 'block',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {!showControls && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '500',
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.3s ease'
        }}>
          🔈 Hover for sound
        </div>
      )}
    </div>
  );
}