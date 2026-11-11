"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="anim-press relative h-[23px] w-[44px] shrink-0 rounded-full"
    >
      <span
        className={`absolute inset-0 rounded-full transition-colors duration-[var(--motion-base)] ease-[var(--ease-motion)] motion-reduce:transition-none ${
          checked ? "bg-[#D01F25]" : "bg-[#3A3A3A]"
        }`}
      />
      <span
        className={`absolute top-[2px] left-[2px] size-[19px] rounded-full bg-white transition-transform duration-[var(--motion-base)] ease-[var(--ease-motion)] motion-reduce:transition-none ${
          checked ? "translate-x-[21px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
