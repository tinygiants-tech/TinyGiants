import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './index.module.css';

function HomepageHeader() {
    return (
        <header className={styles.heroBanner}>
            <img
                src="img/home-page/tinygiants-wide.png"
                alt="TinyGiants World Map"
                className={styles.heroImage}
            />
            <div className={styles.heroMask} />
        </header>
    );
}

function CustomThemeToggle() {
    const { colorMode, setColorMode } = useColorMode();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const toggleTheme = () => {
        setColorMode(colorMode === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            className={styles.customThemeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
        >
            {colorMode === 'light' ? (
                <svg viewBox="0 0 24 24" width="24" height="24" className={styles.toggleIcon}>
                    <path
                        fill="currentColor"
                        d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"
                    />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" className={styles.toggleIcon}>
                    <path
                        fill="currentColor"
                        d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"
                    />
                </svg>
            )}
        </button>
    );
}

export default function Home() {
    useEffect(() => {
        const hideNavbarElements = () => {
            const toggle = document.querySelector('.navbar__toggle');
            if (toggle) {
                toggle.style.display = 'none';
            }

            const navbarItems = document.querySelector('.navbar__items--right');
            if (navbarItems) {
                navbarItems.style.display = 'none';
            }
        };

        hideNavbarElements();

        const observer = new MutationObserver(hideNavbarElements);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return () => {
            observer.disconnect();
            const toggle = document.querySelector('.navbar__toggle');
            if (toggle) {
                toggle.style.display = '';
            }
            const navbarItems = document.querySelector('.navbar__items--right');
            if (navbarItems) {
                navbarItems.style.display = '';
            }
        };
    }, []);

    return (
        <Layout
            title="Home"
            description="TinyGiants - Professional Unity Tools & Innovative Games">

            <div className={styles.customNavbarRight}>
                <a
                    href="https://discord.tinygiants.tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.navIcon}
                    aria-label="Discord"
                >
                    <img src="img/home-page/discord.png" alt="Discord" />
                </a>
                <a
                    href="https://forum.unity.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.navIcon}
                    aria-label="Unity Forum"
                >
                    <img src="img/home-page/unity-forum.png" alt="Unity Forum" />
                </a>
                <a
                    href="mailto:support@tinygiants.tech"
                    className={styles.navIcon}
                    aria-label="Email"
                >
                    <img src="img/home-page/mail.png" alt="Email" />
                </a>
                <CustomThemeToggle />
            </div>

            <HomepageHeader />

            <main className="home-main-content">
                <div className="container">

                    <section className={styles.featureSection}>
                        <div className={styles.featureImageColumn}>
                            <img
                                src="img/home-page/game-event-system-preview.png"
                                className={styles.featureImg}
                                alt="Game Event System"
                            />
                        </div>
                        <div className={styles.featureTextColumn}>
                            <h2 className={styles.featureTitle}>Game Event System</h2>
                            <p className={styles.featureDescription}>
                                A professional, visual, and type-safe event architecture for Unity.
                                Streamline your development with our ScriptableObject-driven graph editor,
                                designed for performance and maintainability.
                            </p>
                            <div className={styles.buttonGroup}>
                                <Link className={styles.featureButton} to="/docs/game-event-system/intro/overview">
                                    <span className={styles.btnIcon}>📖</span> View Documentation
                                </Link>
                                <Link className={styles.featureButtonSecondary} to="https://assetstore.unity.com/">
                                    <img src="img/home-page/asset-store.png" className={styles.btnIconImg} alt="" /> Asset Store
                                </Link>
                            </div>
                        </div>
                    </section>

                    <section className={`${styles.featureSection} ${styles.featureReverse}`}>
                        <div className={styles.featureImageColumn}>
                            <div className={styles.comingSoonWrapper}>
                                <img
                                    src="img/home-page/default-preview.png"
                                    className={`${styles.featureImg} ${styles.blurred}`}
                                    alt="Coming Soon"
                                />
                                <div className={styles.comingSoonOverlay}>COMING SOON</div>
                            </div>
                        </div>
                        <div className={styles.featureTextColumn}>
                            <h2 className={styles.featureTitle}>The Next Giant Leap</h2>
                            <p className={styles.featureDescription}>
                                We are building the next generation of core game systems.
                                Innovative tools that balance visual clarity with raw coding power,
                                helping you build giants from tiny ideas.
                            </p>
                            <div className={styles.buttonGroup}>
                                <div className={styles.featureButtonDisabled}>
                                    <span className={styles.btnIcon}>🔒</span> In Development
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </main>
        </Layout>
    );
}