import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { app, db, functions } from './firebase';

export const FIREBASE_APP_ID = app.options.appId;
export const APP_DISPLAY_NAME = 'Ascension Manager';

const checkMyAccess = httpsCallable(functions, 'checkMyAccess');
const requestAppAccess = httpsCallable(functions, 'requestAppAccess');

async function getExistingRole(user) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  try {
    const invitation = await getDoc(doc(db, 'invitedEmails', email));
    const role = invitation.exists() ? invitation.data().role : null;
    return typeof role === 'string' ? role : null;
  } catch (error) {
    console.warn('Could not load the existing Ascension Manager role.', error);
    return null;
  }
}

export async function checkCurrentUserAccess(user) {
  const result = await checkMyAccess({ appId: FIREBASE_APP_ID });
  const data = result.data && typeof result.data === 'object' ? result.data : {};
  const allowed = data.allowed === true;
  return {
    allowed,
    requestStatus: typeof data.requestStatus === 'string' ? data.requestStatus : null,
    uid: typeof data.uid === 'string' ? data.uid : user.uid,
    providerIds: Array.isArray(data.providerIds) ? data.providerIds : user.providerData.map((provider) => provider.providerId),
    role: allowed
      ? (typeof data.role === 'string' ? data.role : await getExistingRole(user))
      : null
  };
}

export async function requestCurrentUserAccess(requestType = 'access-request') {
  const result = await requestAppAccess({ appId: FIREBASE_APP_ID, requestType });
  return result.data && typeof result.data === 'object' ? result.data : {};
}
