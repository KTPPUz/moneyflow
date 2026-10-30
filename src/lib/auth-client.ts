import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export async function signOutToLogin() {
  try {
    const { error } = await authClient.signOut();
    if (error) return false;
  } catch {
    return false;
  }
  // A full reload drops the signed-in user's cached finance data from memory.
  window.location.assign("/login");
  return true;
}
