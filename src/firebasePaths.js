import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

export const APP_KEY = 'ascensionManager';

export const userRoot = (uid) => doc(db, 'apps', APP_KEY, 'users', uid);
export const userCollection = (uid, name) => collection(db, 'apps', APP_KEY, 'users', uid, name);
export const userPath = (uid, suffix = '') =>
  `apps/${APP_KEY}/users/${uid}${suffix ? `/${suffix}` : ''}`;

