import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const NOT_AUTHORIZED_MESSAGE = 'Your Google account is not authorized to use this application.';

export async function getApprovedInvitation(user) {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;

  const token = await user.getIdTokenResult();
  if (token.signInProvider !== 'google.com') return null;

  const invitation = await getDoc(doc(db, 'invitedEmails', email));
  if (!invitation.exists() || invitation.data().active !== true) return null;

  return {
    email,
    role: invitation.data().role ?? null
  };
}
