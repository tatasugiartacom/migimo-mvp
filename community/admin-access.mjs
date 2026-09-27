// The verified Google email is signed into a fresh Migimo session at login.
// Existing sessions created before this feature must sign in again for admin access.
export function adminEmailAllowed(email) {
  const allowed = process.env.MIGIMO_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowed && email?.toLowerCase() === allowed);
}

export function isAdmin(session, member) {
  return Boolean(member && !member.suspended && session?.memberId === member.id &&
    adminEmailAllowed(session?.verifiedEmail));
}
