import { useLocation, useNavigation } from "react-router";

function toComparableUrl(pathname: string, search: string) {
  return new URL(`${pathname}${search}`, "https://verein-connect.local");
}

export function useRoutePending() {
  const location = useLocation();
  const navigation = useNavigation();

  const currentUrl = toComparableUrl(location.pathname, location.search);
  const nextUrl = navigation.location
    ? toComparableUrl(navigation.location.pathname, navigation.location.search)
    : null;

  const samePath = nextUrl?.pathname === currentUrl.pathname;
  const isPending = navigation.state === "loading" && samePath;
  const isSearchPending = isPending && nextUrl?.search !== currentUrl.search;

  return {
    isPending,
    isSearchPending,
    isSubmitting: navigation.state === "submitting",
  };
}
