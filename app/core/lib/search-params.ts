type SearchParamValue = string | null | undefined;

type BuildSearchParamsOptions = {
  emptyValues?: string[];
  pageParam?: string;
  resetPageOnChange?: boolean;
};

export function buildSearchParams(
  current: URLSearchParams,
  updates: Record<string, SearchParamValue>,
  options: BuildSearchParamsOptions = {},
) {
  const {
    emptyValues = ["", "all", "ALL", "Alle", "today"],
    pageParam = "page",
    resetPageOnChange = true,
  } = options;

  const next = new URLSearchParams(current);

  for (const [key, value] of Object.entries(updates)) {
    if (!value || emptyValues.includes(value)) next.delete(key);
    else next.set(key, value);
  }

  if (resetPageOnChange && !(pageParam in updates)) next.set(pageParam, "1");

  return next;
}
