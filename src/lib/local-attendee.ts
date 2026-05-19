const KEY = "eventquest:attendee_id";
const NAME_KEY = "eventquest:attendee_name";
const ADMIN_KEY = "eventquest:is_admin";
const SPONSOR_KEY = "eventquest:sponsor_handle";

export function getLocalAttendee(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(KEY);
  const name = localStorage.getItem(NAME_KEY);
  return id ? { id, name: name ?? "" } : null;
}

export function setLocalAttendee(id: string, name: string) {
  localStorage.setItem(KEY, id);
  localStorage.setItem(NAME_KEY, name);
}

export function clearLocalAttendee() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getLocalAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function setLocalAdmin(v: boolean) {
  if (v) localStorage.setItem(ADMIN_KEY, "true");
  else localStorage.removeItem(ADMIN_KEY);
}

export function getLocalSponsor(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SPONSOR_KEY);
}

export function setLocalSponsor(handle: string) {
  localStorage.setItem(SPONSOR_KEY, handle);
}

export function clearLocalSponsor() {
  localStorage.removeItem(SPONSOR_KEY);
}
