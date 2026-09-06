export function safeNextPath(value: string | undefined | null) {
  if (!value) return "/control";
  if (!value.startsWith("/") || value.startsWith("//")) return "/control";
  if (value === "/login" || value.startsWith("/login?")) return "/control";
  return value;
}
