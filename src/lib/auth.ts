const OPERATOR_LOGINS: Record<string, string> = {
  ahmed: "ahmed@hospitalplan.com",
  yahya: "yahya@hospitalplan.com",
};

export function resolveOperatorLogin(value: string) {
  const trimmed = value.trim();
  return OPERATOR_LOGINS[trimmed.toLowerCase()] ?? trimmed;
}

export function safeNextPath(value: string | undefined | null) {
  if (!value) return "/control";
  if (!value.startsWith("/") || value.startsWith("//")) return "/control";
  if (value === "/login" || value.startsWith("/login?")) return "/control";
  return value;
}
