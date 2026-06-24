import { useEffect, useState } from "react";

/** True after the client has mounted — use to avoid SSR/client UI mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
