import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
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

export default function Home() {
    return (
        <Layout
            title="Home"
            description="TinyGiants - Professional Unity Tools & Innovative Games">

            <HomepageHeader />

            <main className="home-main-content">
                <div className="container">

                    {/* 第一个插件展示：左图右文 */}
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
                            <Link className={styles.featureButton} to="/docs/game-event-system/intro/overview">
                                View Documentation
                            </Link>
                        </div>
                    </section>

                    {/* 第二个展示：右图左文 (Coming Soon) */}
                    <section className={`${styles.featureSection} ${styles.featureReverse}`}>
                        <div className={styles.featureImageColumn}>
                            <div className={styles.comingSoonWrapper}>
                                <img
                                    src="img/home-page/tinygiants-wide.png"
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
                            <div className={styles.comingSoonTag}>In Development</div>
                        </div>
                    </section>

                </div>
            </main>
        </Layout>
    );
}