import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import './flow-style.css';

export const Node = ({ title, icon, type, sub, id }) => {
  const IconComponent = Icons[icon] || Icons.Circle;
  const nodeType = type || 'action';
  return (
    <div
      className={`flow-node ${nodeType === 'trigger' ? 'node-trigger-style' : 'node-action-style'}`}
      data-node-id={id}
    >
      <div style={{ color: nodeType === 'trigger' ? '#3578e5' : '#4caf50', display: 'flex' }}>
        <IconComponent size={18} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>{title}</div>
        {sub && <div style={{ fontSize: '11px', opacity: 0.6 }}>{sub}</div>}
      </div>
    </div>
  );
};

const FlowLines = ({ connections }) => {
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    const calculatePaths = () => {
      const newPaths = [];
      const radius = 12;

      const sourceGroups = {};
      const targetGroups = {};

      connections.forEach((conn) => {
        if (!sourceGroups[conn.from]) sourceGroups[conn.from] = [];
        sourceGroups[conn.from].push(conn.to);
        if (!targetGroups[conn.to]) targetGroups[conn.to] = [];
        targetGroups[conn.to].push(conn.from);
      });

      const convergencePoints = {};
      Object.keys(targetGroups).forEach((targetId) => {
        const sources = targetGroups[targetId];
        if (sources.length > 1) {
          const toEl = document.querySelector(`[data-node-id="${targetId}"]`);
          if (toEl) {
            const toRect = toEl.getBoundingClientRect();
            const container = toEl.closest('.flow-wrapper');
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const toX = toRect.left + toRect.width / 2 - containerRect.left;
              const toY = toRect.top - containerRect.top;

              let maxFromY = 0;
              sources.forEach((sourceId) => {
                const sourceEl = document.querySelector(`[data-node-id="${sourceId}"]`);
                if (sourceEl) {
                  const sourceRect = sourceEl.getBoundingClientRect();
                  const fromY = sourceRect.bottom - containerRect.top;
                  maxFromY = Math.max(maxFromY, fromY);
                }
              });

              const convergeY = Math.max(maxFromY + 20, toY - 40);
              convergencePoints[targetId] = { x: toX, y: convergeY };
            }
          }
        }
      });

      connections.forEach((conn) => {
        const fromEl = document.querySelector(`[data-node-id="${conn.from}"]`);
        const toEl = document.querySelector(`[data-node-id="${conn.to}"]`);
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const container = fromEl.closest('.flow-wrapper');
        if (!container) return;
        const containerRect = container.getBoundingClientRect();

        const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
        const fromY = fromRect.bottom - containerRect.top;
        const toX = toRect.left + toRect.width / 2 - containerRect.left;
        const toY = toRect.top - containerRect.top;

        const targets = sourceGroups[conn.from];
        const sources = targetGroups[conn.to];
        const isFanOut = targets && targets.length > 1;
        const isConverging = sources && sources.length > 1;

        let pathD;

        if (isFanOut) {
          const targetCount = targets.length;
          const targetIndex = targets.indexOf(conn.to);
          const middleIndex = Math.floor(targetCount / 2);

          if (targetCount % 2 === 1 && targetIndex === middleIndex) {
            pathD = `M ${fromX} ${fromY} L ${fromX} ${toY}`;
          } else {
            const midY = (fromY + toY) / 2;
            const direction = fromX < toX ? 1 : -1;
            pathD = `M ${fromX} ${fromY} L ${fromX} ${midY - radius} Q ${fromX} ${midY} ${fromX + radius * direction} ${midY} L ${toX - radius * direction} ${midY} Q ${toX} ${midY} ${toX} ${midY + radius} L ${toX} ${toY}`;
          }
        } else if (isConverging && convergencePoints[conn.to]) {
          const convergePoint = convergencePoints[conn.to];
          const convergeX = convergePoint.x;
          const convergeY = convergePoint.y;
          const horizontalOffset = Math.abs(fromX - convergeX);

          if (horizontalOffset < 5) {
            pathD = `M ${fromX} ${fromY} L ${convergeX} ${convergeY}`;
          } else {
            const direction = fromX < convergeX ? 1 : -1;
            // 关键：画一个倒U形的弧
            // 从fromX垂直下来 -> 转弯成水平 -> 水平到汇聚点附近 -> 转弯向下到汇聚点
            pathD = `M ${fromX} ${fromY} L ${fromX} ${convergeY - radius} Q ${fromX} ${convergeY} ${fromX + radius * direction} ${convergeY} L ${convergeX - radius * direction} ${convergeY} Q ${convergeX} ${convergeY} ${convergeX} ${convergeY + radius}`;
          }
        } else {
          const horizontalOffset = Math.abs(fromX - toX);
          if (horizontalOffset < 15) {
            pathD = `M ${fromX} ${fromY} L ${fromX} ${toY}`;
          } else {
            const midY = (fromY + toY) / 2;
            const direction = fromX < toX ? 1 : -1;
            pathD = `M ${fromX} ${fromY} L ${fromX} ${midY - radius} Q ${fromX} ${midY} ${fromX + radius * direction} ${midY} L ${toX - radius * direction} ${midY} Q ${toX} ${midY} ${toX} ${midY + radius} L ${toX} ${toY}`;
          }
        }

        newPaths.push(pathD);
      });

      Object.keys(convergencePoints).forEach((targetId) => {
        const convergePoint = convergencePoints[targetId];
        const toEl = document.querySelector(`[data-node-id="${targetId}"]`);
        if (toEl) {
          const toRect = toEl.getBoundingClientRect();
          const container = toEl.closest('.flow-wrapper');
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const toX = toRect.left + toRect.width / 2 - containerRect.left;
            const toY = toRect.top - containerRect.top;
            // 从汇聚点(已经向下偏移了radius)垂直下到目标
            newPaths.push(`M ${convergePoint.x} ${convergePoint.y + radius} L ${toX} ${toY}`);
          }
        }
      });

      setPaths(newPaths);
    };

    const timer = setTimeout(calculatePaths, 100);
    window.addEventListener('resize', calculatePaths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePaths);
    };
  }, [connections]);

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      {paths.map((pathD, index) => (
        <path key={index} d={pathD} stroke="var(--ifm-color-emphasis-300)" strokeWidth="2" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
};

export const FlowWrapper = ({ children, connections }) => (
  <div className="flow-wrapper" style={{ position: 'relative', minHeight: 'auto', paddingBottom: '2rem' }}>
    {connections && <FlowLines connections={connections} />}
    {children}
  </div>
);

export const FlowRow = ({ children, gap }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: `${gap || 80}px`, margin: '20px 0' }}>
    {children}
  </div>
);

export const FlowColumn = ({ children, gap }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${gap || 20}px` }}>
    {children}
  </div>
);

export const Delay = ({ text, id }) => <div className="delay-pill" data-node-id={id}>⏱️ {text}</div>;