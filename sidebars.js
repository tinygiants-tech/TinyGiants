/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '🏠 Introduction',
      items: [
        'ges/intro/overview',
        'ges/intro/project-structure',
        'ges/intro/installation',
      ],
    },

    {
      type: 'category',
      label: '💎 Visual Workflow',
      items: [
        'ges/visual-workflow/game-event-system',
        'ges/visual-workflow/game-event-manager',
        'ges/visual-workflow/game-event-editor',
        'ges/visual-workflow/game-event-creator',
        'ges/visual-workflow/game-event-behavior',
        'ges/visual-workflow/game-event-raiser',
        'ges/visual-workflow/game-event-finder',
        'ges/visual-workflow/visual-condition-tree',
      ],
    },

    {
      type: 'category',
      label: '🕸️ Flow Orchestration',
      items: [
        'ges/flow-graph/game-event-node-editor',
        'ges/flow-graph/game-event-node-connector',
        'ges/flow-graph/game-event-node-behavior',
        'ges/flow-graph/advanced-logic-patterns',
      ],
    },

    {
      type: 'category',
      label: '💻 Runtime API',
      items: [
        'ges/scripting/raising-and-scheduling',
        'ges/scripting/listening-strategies',
        'ges/scripting/programmatic-flow',
        'ges/scripting/best-practices',
        'ges/scripting/api-reference',
      ],
    },

    {
      type: 'category',
      label: '🛠 Tools & Support',
      items: [
        'ges/tools/codegen-and-cleanup',
        'ges/tools/runtime-monitor',
        'ges/tools/community-and-support',
      ],
    },

    {
      type: 'category',
      label: '📚 Examples',
      items: [
        'ges/examples/quick-start',
        'ges/examples/void-event',
        'ges/examples/basic-types-event',
        'ges/examples/custom-type-event',
        'ges/examples/custom-sender-event',
        'ges/examples/priority-event',
        'ges/examples/conditional-event',
        'ges/examples/delayed-event',
        'ges/examples/repeating-event',
        'ges/examples/persistent-event',
        'ges/examples/trigger-event',
        'ges/examples/chain-event',
        'ges/examples/multi-database',
        'ges/examples/runtime-api',
        'ges/examples/runtime-monitor',
      ],
    },
  ],
};

export default sidebars;