/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '🏠 Introduction',
      items: [
        'game-event-system/intro/overview',
        'game-event-system/intro/project-structure',
        'game-event-system/intro/installation',
      ],
    },

    {
      type: 'category',
      label: '💎 Visual Workflow',
      items: [
        'game-event-system/visual-workflow/game-event-system',
        'game-event-system/visual-workflow/game-event-manager',
        'game-event-system/visual-workflow/game-event-editor',
        'game-event-system/visual-workflow/game-event-creator',
        'game-event-system/visual-workflow/game-event-behavior',
        'game-event-system/visual-workflow/game-event-raiser',
        'game-event-system/visual-workflow/game-event-finder',
        'game-event-system/visual-workflow/visual-condition-tree',
      ],
    },

    {
      type: 'category',
      label: '🕸️ Flow Orchestration',
      items: [
        'game-event-system/flow-graph/game-event-node-editor',
        'game-event-system/flow-graph/game-event-node-connector',
        'game-event-system/flow-graph/game-event-node-behavior',
        'game-event-system/flow-graph/advanced-logic-patterns',
      ],
    },

    {
      type: 'category',
      label: '💻 Runtime API',
      items: [
        'game-event-system/scripting/raising-and-scheduling',
        'game-event-system/scripting/listening-strategies',
        'game-event-system/scripting/programmatic-flow',
        'game-event-system/scripting/best-practices',
        'game-event-system/scripting/api-reference',
      ],
    },

    {
      type: 'category',
      label: '🛠 Tools & Support',
      items: [
        'game-event-system/tools/codegen-and-cleanup',
        'game-event-system/tools/runtime-monitor',
        'game-event-system/tools/community-and-support',
      ],
    },

    {
      type: 'category',
      label: '📚 Examples',
      items: [
        'game-event-system/examples/quick-start',
        'game-event-system/examples/void-event',
        'game-event-system/examples/basic-types-event',
        'game-event-system/examples/custom-type-event',
        'game-event-system/examples/custom-sender-event',
        'game-event-system/examples/priority-event',
        'game-event-system/examples/conditional-event',
        'game-event-system/examples/delayed-event',
        'game-event-system/examples/repeating-event',
        'game-event-system/examples/persistent-event',
        'game-event-system/examples/trigger-event',
        'game-event-system/examples/chain-event',
        'game-event-system/examples/multi-database',
        'game-event-system/examples/runtime-api',
        'game-event-system/examples/runtime-monitor',
      ],
    },
  ],
};

export default sidebars;