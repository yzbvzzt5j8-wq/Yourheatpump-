/**
 * Circuit tree: circuits form a tree rooted at the heat pump. A parent's
 * load is the sum of its children; only leaves carry entered loads. Each
 * pipe is sized for everything downstream of it.
 *
 * The index circuit is the leaf with the highest total PATH RESISTANCE to
 * the heat pump — not the longest run, not the largest load. This must be
 * computed, because the smallest radiator at the end of the longest route
 * is often the one that determines pump duty, not the biggest load.
 */

export interface CircuitInput {
  id: string;
  parentId: string | null;
  /** Descriptive label, e.g. "Ground floor — Kitchen" */
  label: string;
  /** Floor / level this circuit serves. */
  level: string;
  /** Where this circuit tees off its parent. */
  branchPoint: string;
  /** Vertical rise (+) or drop (-) from the branch point, metres. */
  verticalM: number;
  /** Zone identifier, or 'always-open' / 'trvs-only'. */
  zone: string;
  /** Room served, where applicable. */
  roomId?: string;
  /** Entered load in Watts — required on leaves, ignored on parents. */
  loadW?: number;
  /** Pressure drop of THIS pipe segment alone, Pa/m x its own length, in Pa. */
  segmentPressureDropPa: number;
}

export interface CircuitNode extends CircuitInput {
  children: CircuitNode[];
  /** Rolled-up load: own load (leaf) or sum of children (parent). */
  totalLoadW: number;
  /** Cumulative pressure drop from the heat pump down to this circuit, Pa. */
  cumulativePressureDropPa: number;
  isLeaf: boolean;
}

export function buildCircuitTree(circuits: CircuitInput[]): CircuitNode[] {
  const byId = new Map<string, CircuitNode>();
  for (const c of circuits) {
    byId.set(c.id, { ...c, children: [], totalLoadW: 0, cumulativePressureDropPa: 0, isLeaf: true });
  }

  const roots: CircuitNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (!parent) throw new Error(`Circuit ${node.id} references unknown parent ${node.parentId}`);
      parent.children.push(node);
      parent.isLeaf = false;
    } else {
      roots.push(node);
    }
  }

  function computeLoad(node: CircuitNode): number {
    if (node.children.length === 0) {
      if (node.loadW == null) {
        throw new Error(`Leaf circuit ${node.id} has no entered load`);
      }
      node.totalLoadW = node.loadW;
    } else {
      node.totalLoadW = node.children.reduce((sum, child) => sum + computeLoad(child), 0);
    }
    return node.totalLoadW;
  }

  function computePressure(node: CircuitNode, parentCumulative: number) {
    node.cumulativePressureDropPa = parentCumulative + node.segmentPressureDropPa;
    for (const child of node.children) {
      computePressure(child, node.cumulativePressureDropPa);
    }
  }

  for (const root of roots) {
    computeLoad(root);
    computePressure(root, 0);
  }

  return roots;
}

export function flattenTree(roots: CircuitNode[]): CircuitNode[] {
  const out: CircuitNode[] = [];
  function walk(node: CircuitNode) {
    out.push(node);
    for (const child of node.children) walk(child);
  }
  for (const root of roots) walk(root);
  return out;
}

/**
 * The index circuit: the leaf with the greatest cumulative path resistance
 * (pressure drop) from the heat pump — this is what determines pump duty,
 * NOT the leaf with the greatest load or the physically longest run.
 */
export function findIndexCircuit(roots: CircuitNode[]): CircuitNode {
  const leaves = flattenTree(roots).filter((n) => n.children.length === 0);
  if (leaves.length === 0) throw new Error('No leaf circuits found');
  return leaves.reduce((worst, node) => (node.cumulativePressureDropPa > worst.cumulativePressureDropPa ? node : worst));
}
