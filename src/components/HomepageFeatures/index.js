import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Zero-Reflection Architecture',
    image: require('@site/static/img/home-page/zero-reflect.png').default,
    description: (
      <>
        Eliminate runtime overhead. The system automatically generates concrete bindings, delivering AOT-ready
        performance with native Inspector support.
      </>
    ),
  },
  {
    title: 'Visual Orchestration',
    image: require('@site/static/img/home-page/visual.png').default,
    description: (
      <>
        Abandon spaghetti code. Orchestrate complex game logic using a powerful
        <strong> Node Graph Editor</strong>. Manage Triggers (parallel) and Chains (sequential)
        with real-time connection validation.
      </>
    ),
  },
  {
    title: 'Powerful Ecosystem',
    image: require('@site/static/img/home-page/ecosystem.png').default,
    description: (
      <>
        Includes a full suite of tools: <strong>Dashboard</strong> for batch event management,
        <strong>Runtime Monitor</strong> for debugging, and <strong>Reference Finder</strong> to keep your project
        clean.
      </>
    ),
  },
];

function Feature({image, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        {}
        <img src={image} className={styles.featureSvg} alt={title}/>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}