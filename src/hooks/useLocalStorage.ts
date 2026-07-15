"use client";

import { useEffect, useState } from "react";

export default function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key);

      if (storedValue === null) {
        return;
      }

      setValue(JSON.parse(storedValue) as T);
    } catch {
      setValue(initialValue);
    }
  }, [initialValue, key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore persistence failures and keep the in-memory state.
    }
  }, [key, value]);

  return [value, setValue];
}