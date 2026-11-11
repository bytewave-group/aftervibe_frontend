"use client";

import { SearchIcon } from "@/components/gifts/GiftIcons";

export function GiftSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative mt-3 block">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white/45">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="h-[40px] w-full rounded-full border border-white/10 bg-white/10 pr-4 pl-10 text-[14px] text-white outline-none placeholder:text-white/40"
      />
    </label>
  );
}
