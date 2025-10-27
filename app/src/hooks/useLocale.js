import { useCallback, useMemo, useState } from 'react';

export function useLocale(defaultMessages, initialOverrides = {}) {
  const [overrides, setOverrides] = useState(initialOverrides);

  const messages = useMemo(() => ({
    ...defaultMessages,
    ...overrides
  }), [defaultMessages, overrides]);

  const t = useCallback((key) => messages[key] ?? key, [messages]);

  return {
    t,
    messages,
    setOverrides
  };
}

export default useLocale;
