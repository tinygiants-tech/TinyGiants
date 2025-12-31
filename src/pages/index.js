import React, { useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './index.module.css';

function FilmGrain() {
    return (
      <svg className={styles.filmGrainOverlay}>
          <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    );
}

function TechInteractiveBackground() {
    const canvasRef = useRef(null);
    const { colorMode } = useColorMode();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        const mouse = { x: null, y: null, radius: 250, active: true };

        function createParticle(w, h) {
            const px = Math.random() * w;
            const py = Math.random() * h;
            const orbitRadiusA = Math.random() * 100 + 40;
            const orbitRadiusB = Math.random() * 60 + 20;
            const orbitSpeed = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1);
            const orbitAngle = Math.random() * Math.PI * 2;
            return {
                x: px, y: py, baseX: px, baseY: py,
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.03,
                size: Math.random() * 8 + 6,
                type: Math.floor(Math.random() * 3),
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() - 0.5) * 1.2,
                currOrbitAngle: orbitAngle,
                orbitRadiusA: orbitRadiusA, orbitRadiusB: orbitRadiusB, orbitSpeed: orbitSpeed,
                draw: function() {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.angle);
                    ctx.fillStyle = `${colorBase} ${alphaVal})`;
                    ctx.strokeStyle = `${colorBase} ${alphaVal})`;
                    ctx.lineWidth = 1.2;
                    if (this.type === 0) {
                        ctx.beginPath(); const s = this.size; ctx.moveTo(s*0.1, -s*0.5); ctx.lineTo(-s*0.3, 0); ctx.lineTo(s*0.1, 0); ctx.lineTo(-s*0.1, s*0.5); ctx.lineTo(s*0.3, 0); ctx.lineTo(-s*0.1, 0); ctx.closePath(); ctx.fill();
                    } else if (this.type === 1) {
                        const s = this.size * 0.7; ctx.strokeRect(-s/2, -s/2, s, s);
                        for(let i=-1; i<=1; i++) { const off = i*(s/3); ctx.moveTo(-s/2, off); ctx.lineTo(-s/2-2, off); ctx.moveTo(s/2, off); ctx.lineTo(s/2+2, off); ctx.moveTo(off, -s/2); ctx.lineTo(off, -s/2-2); ctx.moveTo(off, s/2); ctx.lineTo(off, s/2+2); }
                        ctx.stroke();
                    } else {
                        const s = this.size * 0.8; ctx.beginPath(); ctx.moveTo(0, -s/2); ctx.lineTo(s/2, 0); ctx.lineTo(0, s/2); ctx.lineTo(-s/2, 0); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI*2); ctx.fill();
                    }
                    ctx.restore();
                },
                update: function() {
                    let distToMouse = 9999;
                    if (mouse.x !== null) {
                        const dx = mouse.x - this.x; const dy = mouse.y - this.y;
                        distToMouse = Math.sqrt(dx * dx + dy * dy);
                    }
                    if (mouse.active && distToMouse < mouse.radius) {
                        this.currOrbitAngle += this.orbitSpeed;
                        this.x += (mouse.x + Math.cos(this.currOrbitAngle) * this.orbitRadiusA - this.x) * 0.05;
                        this.y += (mouse.y + Math.sin(this.currOrbitAngle) * this.orbitRadiusB - this.y) * 0.05;
                    } else {
                        this.x += (this.baseX - this.x) * 0.015 + this.vx;
                        this.y += (this.baseY - this.y) * 0.015 + this.vy;
                        if(Math.random() > 0.97) { this.vx = (Math.random()-0.5)*1.2; this.vy = (Math.random()-0.5)*1.2; }
                    }
                    this.angle += this.rotationSpeed;
                }
            };
        }

        const colorBase = colorMode === 'dark' ? 'rgba(226, 177, 60,' : 'rgba(113, 79, 61,';
        const alphaVal = colorMode === 'dark' ? '0.22' : '0.28';

        function init() {
            if (!canvas) return;
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            particles = Array.from({length: (canvas.width*canvas.height)/16000}, () => createParticle(canvas.width, canvas.height));
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            animationFrameId = requestAnimationFrame(animate);
        }

        const onMouseMove = (e) => {
            mouse.x = e.clientX; mouse.y = e.clientY;
            document.documentElement.style.setProperty('--x', `${e.clientX}px`);
            document.documentElement.style.setProperty('--y', `${e.clientY}px`);
        };

        window.addEventListener('resize', init);
        window.addEventListener('mousemove', onMouseMove);
        init(); animate();

        return () => {
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [colorMode]);

    return (
      <>
          <canvas id="interactive-bg-canvas" ref={canvasRef} />
          <div className={styles.mouseSpotlight} />
      </>
    );
}

function HomepageHeader() {
    return (
      <header className={styles.heroBanner}>
          {/*<img src="img/home-page/tinygiants-wide.png" alt="TinyGiants" className={styles.heroImage} />*/}

          <video
              className={styles.heroImage}
              autoPlay
              loop
              muted
              playsInline
              webkit-playsinline
              poster="img/home-page/tinygiants-wide.png"
          >
              <source src="video/tinygiants-wide.mp4" type="video/mp4" />
          </video>

          <div className={styles.heroMask} />
      </header>
    );
}

function CustomThemeToggle() {
    const { colorMode, setColorMode } = useColorMode();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    const toggleTheme = () => { setColorMode(colorMode === 'dark' ? 'light' : 'dark'); };
    return (
      <button className={styles.customThemeToggle} onClick={toggleTheme} aria-label="Toggle theme">
          {colorMode === 'light' ? (
            <svg viewBox="0 0 24 24" width="24" height="24" className={styles.toggleIcon}><path fill="currentColor" d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" className={styles.toggleIcon}><path fill="currentColor" d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z" /></svg>
          )}
      </button>
    );
}

export default function Home() {
    const sectionRefs = useRef([]);
    useEffect(() => {
        const hideNavbar = () => {
            ['.navbar__toggle', '.navbar__items--right'].forEach(cls => {
                const el = document.querySelector(cls); if(el) el.style.display = 'none';
            });
        };
        hideNavbar();
        const obs = new MutationObserver(hideNavbar);
        obs.observe(document.body, { childList: true, subtree: true });

        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(styles.sectionVisible);
                } else {
                    entry.target.classList.remove(styles.sectionVisible);
                }
            });
        }, { threshold: 0.1 });

        sectionRefs.current.forEach(ref => { if(ref) revealObs.observe(ref); });

        return () => {
            obs.disconnect(); revealObs.disconnect();
            ['.navbar__toggle', '.navbar__items--right'].forEach(cls => {
                const el = document.querySelector(cls); if(el) el.style.display = '';
            });
        };
    }, []);

    return (
      <Layout title="Home" description="TinyGiants Studio">
          <div className={styles.homepageWrapper}>
              <FilmGrain />
              <TechInteractiveBackground />
              <div className={styles.customNavbarRight}>
                  <a href="https://discord.tinygiants.tech" target="_blank" rel="noopener noreferrer" className={styles.navIcon} aria-label="Discord"><img src="img/home-page/discord.png" alt="Discord" /></a>
                  <a href="https://forum.unity.com/" target="_blank" rel="noopener noreferrer" className={styles.navIcon} aria-label="Unity Forum"><img src="img/home-page/unity-forum.png" alt="Unity Forum" /></a>
                  <a href="mailto:support@tinygiants.tech" className={styles.navIcon} aria-label="Email"><img src="img/home-page/mail.png" alt="Email" /></a>
                  <CustomThemeToggle />
              </div>
              <HomepageHeader />
              <main className="home-main-content">
                  <div className="container">
                      <section className={styles.featureSection} ref={el => sectionRefs.current[0] = el}>
                          <div className={styles.featureImageColumn}>
                              <img src="img/home-page/game-event-system-preview.png" className={styles.featureImg} alt="Game Event System" />
                          </div>
                          <div className={styles.featureTextColumn}>
                              <h2 className={styles.featureTitle}>Game Event System</h2>
                              <p className={styles.featureDescription}>A professional, visual, and type-safe event architecture for Unity. Streamline your development with our ScriptableObject-driven graph editor, designed for performance and maintainability.</p>
                              <div className={styles.buttonGroup}>
                                  <Link className={styles.featureButton} to="/docs/game-event-system/intro/overview"><span className={styles.btnIcon}>📖</span> View Documentation</Link>
                                  <Link className={styles.featureButtonSecondary} to="https://assetstore.unity.com/"><img src="img/home-page/asset-store.png" className={styles.btnIconImg} alt="" /> Asset Store</Link>
                              </div>
                          </div>
                      </section>
                      <section className={`${styles.featureSection} ${styles.featureReverse}`} ref={el => sectionRefs.current[1] = el}>
                          <div className={styles.featureImageColumn}>
                              <div className={styles.comingSoonWrapper}>
                                  <img src="img/home-page/default-preview.png" className={`${styles.featureImg} ${styles.blurred}`} alt="Coming Soon" />
                                  <div className={styles.comingSoonOverlay}>COMING SOON</div>
                              </div>
                          </div>
                          <div className={styles.featureTextColumn}>
                              <h2 className={styles.featureTitle}>The Next Giant Leap</h2>
                              <p className={styles.featureDescription}>We are building the next generation of core game systems. Innovative tools that balance visual clarity with raw coding power, helping you build giants from tiny ideas.</p>
                              <div className={styles.buttonGroup}>
                                  <div className={styles.featureButtonDisabled}><span className={styles.btnIcon}>🔒</span> In Development</div>
                              </div>
                          </div>
                      </section>
                  </div>
              </main>
          </div>
      </Layout>
    );
}