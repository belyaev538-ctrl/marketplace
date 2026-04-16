export type MpTreeNodeDTO = {
  id: string;
  name: string;
  slug: string;
  children: MpTreeNodeDTO[];
};

/** Строит дерево рубрик витрины из плоского списка (parentId). Корни сортируются по имени. */
export function buildMarketplaceCategoryTree(
  rows: { id: string; name: string; slug: string; parentId: string | null }[],
): MpTreeNodeDTO[] {
  const byId = new Map<string, MpTreeNodeDTO>();
  for (const r of rows) {
    byId.set(r.id, { id: r.id, name: r.name, slug: r.slug, children: [] });
  }
  const roots: MpTreeNodeDTO[] = [];
  for (const r of rows) {
    const node = byId.get(r.id);
    if (!node) continue;
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortRec(nodes: MpTreeNodeDTO[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    for (const n of nodes) sortRec(n.children);
  }
  sortRec(roots);
  return roots;
}
