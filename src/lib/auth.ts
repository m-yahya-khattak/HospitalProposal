import { visitorHomePath, type VisitorClaims } from "@/lib/access";

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

export function postLoginPath(
  user: { app_metadata?: Record<string, unknown> } | null,
  nextPath: string,
) {
  const home = visitorHomePath(user);
  if (home) return home;
  return safeNextPath(nextPath);
}

export function visitorControlAllowed(claims: VisitorClaims, pathname: string) {
  const home = `/control/${claims.projectSlug}`;
  return pathname === home || pathname.startsWith(`${home}/`);
}
