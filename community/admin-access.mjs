// The verified Google email is signed into a fresh Migimo session at login.
// Existing sessions created before this feature must sign in again for admin access.
export function isAdmin(session, member) {
  const allowed = process.env.MIGIMO_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowed && member && !member.suspended && session?.memberId === member.id &&
    session?.verifiedEmail?.toLowerCase() === allowed);
}
