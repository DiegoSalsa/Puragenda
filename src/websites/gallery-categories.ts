const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "categoria";
export const categoryId = (label: string, used: Iterable<string> = []) => {
  const existing = new Set(used); const base = `cat-${slug(label)}`; let next = base; let index = 2;
  while (existing.has(next)) next = `${base}-${index++}`;
  return next;
};
