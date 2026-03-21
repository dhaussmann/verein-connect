import { useState } from 'react';
import { TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { Search } from 'lucide-react';
import type { CSSProperties } from 'react';

type DebouncedSearchInputProps = {
  placeholder: string;
  initialValue: string;
  onSearchChange: (value: string) => void;
  style?: CSSProperties;
};

export function DebouncedSearchInput({ placeholder, initialValue, onSearchChange, style }: DebouncedSearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const debounced = useDebouncedCallback(onSearchChange, 250);

  return (
    <TextInput
      placeholder={placeholder}
      leftSection={<Search size={16} />}
      style={style}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        debounced(event.target.value);
      }}
    />
  );
}
