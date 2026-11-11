export interface CountryOption {
  id: string;
  dial: string;
  label: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { id: "MY", dial: "60", label: "MY +60" },
  { id: "SG", dial: "65", label: "SG +65" },
  { id: "CN", dial: "86", label: "CN +86" },
  { id: "TH", dial: "66", label: "TH +66" },
  { id: "VN", dial: "84", label: "VN +84" },
];

export const DEFAULT_COUNTRY_ID = "MY";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidNationalNumber(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length >= 6 && digits.length <= 15;
}

/**
 * Compose a phone number for the customer APIs.
 * Malaysian numbers follow the existing AV rule (0… or 60… stay as-is;
 * otherwise prefix 60) so PhoneNumber::normalize can store `0xxxxxxxxx`.
 */
export function composePhone(countryId: string, national: string): string {
  const option = COUNTRY_OPTIONS.find((item) => item.id === countryId) ?? COUNTRY_OPTIONS[0];
  const digits = digitsOnly(national);
  if (!digits) {
    return "";
  }

  if (option.id === "MY") {
    if (digits.startsWith("0") || digits.startsWith("60")) {
      return digits;
    }
    return `${option.dial}${digits}`;
  }

  if (digits.startsWith(option.dial)) {
    return digits;
  }
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${option.dial}${local}`;
}
