import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cloud,
  Download,
  FileImage,
  FileText,
  GraduationCap,
  Grid2X2,
  HardDrive,
  Layers,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  School,
  Search,
  Settings,
  Trash2,
  Upload,
  Users,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { app, auth, googleProvider } from './firebase';
import { APP_DISPLAY_NAME, checkCurrentUserAccess, requestCurrentUserAccess } from './authorization';
import { loadCloudData, loadLocalData, saveCloudData, saveLocalData } from './dataStore';
import './styles.css';

const APP_NAME = 'School Programmes Ascention Manager';
const APP_VERSION = 'v1.2';
const DEFAULT_LEVELS = ['School Level', 'Sub District', 'District', 'State', 'National'];
const DEFAULT_CATEGORIES = ['Arts', 'Sports'];
const STORAGE_KEY = 'ascman-school-participation-db-v1';

const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const needsPasswordVerification = (access, user) =>
  access?.requireEmailVerification === true &&
  access?.signInProvider === 'password' &&
  !user?.emailVerified;

function friendlyAuthError(error, fallback) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/account-exists-with-different-credential': 'This email already uses another sign-in method. Sign in with that method, then link providers from the same account.'
  };
  return messages[error?.code] || fallback;
}

const blankPhoto =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#eef2f7"/><circle cx="80" cy="62" r="28" fill="#9aa7b5"/><path d="M32 142c7-30 25-46 48-46s41 16 48 46" fill="#9aa7b5"/></svg>`
  );

const demoPhoto = (name, bg, fg = '#ffffff') =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="24" fill="${bg}"/><circle cx="80" cy="58" r="30" fill="${fg}" opacity=".82"/><path d="M31 143c8-32 26-49 49-49s41 17 49 49" fill="${fg}" opacity=".82"/><text x="80" y="153" text-anchor="middle" font-family="Arial" font-size="18" fill="${fg}">${name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</text></svg>`
  );

function seedData() {
  const categories = ['Arts', 'Sports', 'Science'];
  const students = [
    {
      id: uid(),
      name: 'Amina Rahman',
      admissionNo: '2045',
      className: '8',
      division: 'A',
      gender: 'Female',
      schoolName: 'St. Gemmas GHSS Malappuram',
      contact: '9847001101',
      photo: demoPhoto('Amina Rahman', '#2563eb')
    },
    {
      id: uid(),
      name: 'Nikhil P',
      admissionNo: '2045',
      className: '9',
      division: 'B',
      gender: 'Male',
      schoolName: 'St. Gemmas GHSS Malappuram',
      contact: '9847001102',
      photo: demoPhoto('Nikhil P', '#0f766e')
    },
    {
      id: uid(),
      name: 'Meera Krishnan',
      admissionNo: '3112',
      className: '10',
      division: 'C',
      gender: 'Female',
      schoolName: 'St. Gemmas GHSS Malappuram',
      contact: '9847001103',
      photo: demoPhoto('Meera Krishnan', '#b45309')
    },
    {
      id: uid(),
      name: 'Alan Joseph',
      admissionNo: '1881',
      className: '7',
      division: 'A',
      gender: 'Male',
      schoolName: 'St. Gemmas GHSS Malappuram',
      contact: '9847001104',
      photo: demoPhoto('Alan Joseph', '#7c3aed')
    }
  ];
  const items = [
    { id: uid(), name: '100m Sprint', category: 'Sports', type: 'Individual', level: 'Sub District' },
    { id: uid(), name: 'Group Dance', category: 'Arts', type: 'Group', level: 'District' },
    { id: uid(), name: 'Science Quiz', category: 'Science', type: 'Group', level: 'State' },
    { id: uid(), name: 'Pencil Drawing', category: 'Arts', type: 'Individual', level: 'Sub District' }
  ];
  const participations = [
    {
      id: uid(),
      studentId: students[0].id,
      itemId: items[0].id,
      currentLevel: 'District',
      ended: false,
      results: {
        'Sub District': { position: '1', grade: 'A', graceMarks: 5, remarks: 'Qualified', date: today() },
        District: { position: '2', grade: 'A', graceMarks: 4, remarks: 'Strong finish', date: today() }
      }
    },
    {
      id: uid(),
      studentId: students[0].id,
      itemId: items[1].id,
      currentLevel: 'State',
      ended: false,
      results: {
        District: { position: '1', grade: 'A', graceMarks: 5, remarks: 'Team qualified', date: today() },
        State: { position: '', grade: 'B', graceMarks: 3, remarks: '', date: today() }
      }
    },
    {
      id: uid(),
      studentId: students[1].id,
      itemId: items[1].id,
      currentLevel: 'District',
      ended: true,
      results: {
        District: { position: '3', grade: 'B', graceMarks: 2, remarks: 'Ended here', date: today() }
      }
    },
    {
      id: uid(),
      studentId: students[2].id,
      itemId: items[2].id,
      currentLevel: 'National',
      ended: false,
      results: {
        State: { position: '1', grade: 'A', graceMarks: 5, remarks: 'Excellent', date: today() },
        National: { position: '', grade: '', graceMarks: 0, remarks: '', date: today() }
      }
    }
  ];
  const groupMembers = [
    { id: uid(), itemId: items[1].id, studentId: students[0].id },
    { id: uid(), itemId: items[1].id, studentId: students[1].id },
    { id: uid(), itemId: items[2].id, studentId: students[2].id },
    { id: uid(), itemId: items[2].id, studentId: students[3].id }
  ];
  return { categories, levels: DEFAULT_LEVELS, students, items, participations, groupMembers, uploadedPhotos: [] };
}

function normalizeDb(value) {
  const normalizeStoredLevel = (level) => normalizeLevel(level).replace(/^Sub-District$/i, 'Sub District');
  const levels = uniqueLevels(value?.levels?.length ? value.levels : DEFAULT_LEVELS).map(normalizeStoredLevel).filter(Boolean);
  const items = Array.isArray(value?.items)
    ? value.items.map((item) => ({ ...item, level: normalizeStoredLevel(item.level) }))
    : [];
  const participations = Array.isArray(value?.participations)
    ? value.participations.map((p) => {
        const results = {};
        Object.entries(p.results || {}).forEach(([level, result]) => {
          results[normalizeStoredLevel(level)] = result;
        });
        return { ...p, currentLevel: normalizeStoredLevel(p.currentLevel), nextCompetitionDate: p.nextCompetitionDate || '', results };
      })
    : [];
  return {
    categories: value?.categories?.length ? value.categories : DEFAULT_CATEGORIES,
    levels: levels.length ? levels : DEFAULT_LEVELS,
    students: Array.isArray(value?.students) ? value.students : [],
    items,
    participations,
    groupMembers: Array.isArray(value?.groupMembers) ? value.groupMembers : [],
    uploadedPhotos: Array.isArray(value?.uploadedPhotos) ? value.uploadedPhotos : []
  };
}

function App() {
  const [db, setDb] = useState(() => normalizeDb(null));
  const dbRef = useRef(db);
  const saveQueueRef = useRef(Promise.resolve());
  const newAccountRef = useRef(false);
  const pendingGoogleCredentialRef = useRef(null);
  const accessPolicyRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [onlineAccess, setOnlineAccess] = useState('signed-out');
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestState, setRequestState] = useState('idle');
  const [requestMessage, setRequestMessage] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFormMode, setAuthFormMode] = useState('sign-in');
  const [syncState, setSyncState] = useState('');
  const [page, setPage] = useState('Dashboard');
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ level: 'All', category: 'All', type: 'All', className: 'All', status: 'All' });
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState('');
  const [collageFilter, setCollageFilter] = useState({
    level: 'Entire list',
    category: 'All',
    className: 'All',
    division: 'All',
    columns: 3,
    details: {
      photo: true,
      name: true,
      classDivision: true,
      admissionNo: false,
      gender: false,
      schoolName: false,
      item: true,
      category: false,
      type: false,
      currentLevel: true,
      result: true
    }
  });

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setAuthChecked(false);

      if (!user) {
        setCurrentUser(null);
        setCurrentRole(null);
        setOnlineAccess('signed-out');
        accessPolicyRef.current = null;
        newAccountRef.current = false;
        setRequestState('idle');
        setRequestMessage('');
        setMode((currentMode) => currentMode === 'cloud' ? null : currentMode);
        setAuthChecked(true);
        return;
      }

      setCurrentUser(user);
      setCurrentRole(null);
      setOnlineAccess('checking');
      setAccessError('');
      setRequestState('idle');
      setRequestMessage('');

      try {
        const access = await checkCurrentUserAccess(user);
        accessPolicyRef.current = access;
        if (!active) return;

        if (!access.allowed) {
          if (access.requestStatus === 'pending') {
            setOnlineAccess('unauthorized');
            setRequestState('pending');
            setRequestMessage('Your access request is awaiting administrator approval.');
          } else if (access.requestStatus === 'rejected') {
            setOnlineAccess('unauthorized');
            setRequestState('rejected');
            setRequestMessage('Your access request was not approved. Please contact an administrator.');
          } else if (needsPasswordVerification(access, user)) {
            setOnlineAccess('verification-required');
            setRequestMessage(newAccountRef.current
              ? 'Your account has been created. Please verify your email before requesting access.'
              : 'Please verify your email before requesting access.');
          } else {
            setOnlineAccess('unauthorized');
          }
          setMode((currentMode) => currentMode === 'cloud' ? null : currentMode);
          return;
        }

        setOnlineAccess('authorized');
        setCurrentRole(access.role);
      } catch (error) {
        console.error('Could not verify Google account authorization.', error);
        if (!active) return;
        setCurrentRole(null);
        setOnlineAccess('error');
        setMode((currentMode) => currentMode === 'cloud' ? null : currentMode);
        setAccessError('Your Google account authorization could not be verified. Please try again.');
      } finally {
        if (active) setAuthChecked(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const enterOfflineMode = async () => {
    setAccessBusy(true);
    setAccessError('');
    try {
      const loaded = await loadLocalData({ legacyStorageKey: STORAGE_KEY, createDefault: seedData, normalize: normalizeDb });
      dbRef.current = loaded;
      setDb(loaded);
      setMode('local');
      setSyncState('Saved on this device');
    } catch (error) {
      setAccessError(`Local storage could not be opened. ${error.message || ''}`.trim());
    } finally {
      setAccessBusy(false);
    }
  };

  const enterCloudMode = async (authenticatedUser = null) => {
    setAccessBusy(true);
    setAccessError('');
    let user = authenticatedUser?.uid ? authenticatedUser : currentUser;
    try {
      user = user || (await signInWithPopup(auth, googleProvider)).user;
      setCurrentUser(user);
      setOnlineAccess('checking');
      const access = await checkCurrentUserAccess(user);
      accessPolicyRef.current = access;

      if (!access.allowed) {
        setCurrentRole(null);
        if (access.requestStatus === 'pending') {
          setOnlineAccess('unauthorized');
          setRequestState('pending');
          setRequestMessage('Your access request is awaiting administrator approval.');
        } else if (access.requestStatus === 'rejected') {
          setOnlineAccess('unauthorized');
          setRequestState('rejected');
          setRequestMessage('Your access request was not approved. Please contact an administrator.');
        } else if (needsPasswordVerification(access, user)) {
          setOnlineAccess('verification-required');
          setRequestState('idle');
          setRequestMessage(newAccountRef.current
            ? 'Your account has been created. Please verify your email before requesting access.'
            : 'Please verify your email before requesting access.');
        } else {
          setOnlineAccess('unauthorized');
          setRequestState('idle');
          setRequestMessage('');
        }
        setMode(null);
        return;
      }

      if (access.uid !== user.uid || auth.currentUser?.uid !== user.uid) {
        throw new Error('The authenticated Firebase UID changed while application access was being checked.');
      }

      console.info('[Ascension Auth] Opening protected workspace', {
        uid: access.uid,
        email: user.email?.trim().toLowerCase() || null,
        projectId: app.options.projectId,
        appId: app.options.appId,
        path: `ascensionManagerUsers/${access.uid}`,
        resolvedPermission: access.resolvedPermission
      });
      const loaded = await loadCloudData(access.uid, seedData, normalizeDb);
      dbRef.current = loaded;
      setDb(loaded);
      setCurrentUser(user);
      setCurrentRole(access.role);
      setOnlineAccess('authorized');
      setMode('cloud');
      setSyncState('Synced with Firestore');
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        pendingGoogleCredentialRef.current = GoogleAuthProvider.credentialFromError(error);
        if (error.customData?.email) setAuthEmail(error.customData.email);
        setAuthFormMode('sign-in');
        setRequestMessage('Sign in with your existing password to securely link Google to the same Firebase account.');
      }
      const message = error.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in was cancelled.'
        : error.code === 'auth/operation-not-allowed'
          ? 'Google sign-in is not enabled for this Firebase project.'
          : friendlyAuthError(error, 'Your account authorization could not be verified. Please try again.');
      console.error('Could not open the online workspace.', error);
      setOnlineAccess(user ? 'error' : 'signed-out');
      setAccessError(message);
    } finally {
      setAccessBusy(false);
    }
  };

  const signInWithPassword = async (event) => {
    event.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      setAccessError('Enter your email and password.');
      return;
    }

    setAccessBusy(true);
    setAccessError('');
    newAccountRef.current = false;
    try {
      const credential = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      if (pendingGoogleCredentialRef.current) {
        await linkWithCredential(credential.user, pendingGoogleCredentialRef.current);
        pendingGoogleCredentialRef.current = null;
      }
      setAuthPassword('');
      await enterCloudMode(credential.user);
    } catch (error) {
      console.error('Email/password sign-in failed.', error);
      setAccessError(friendlyAuthError(error, 'Could not sign in. Please try again.'));
    } finally {
      setAccessBusy(false);
    }
  };

  const signUpWithPassword = async (event) => {
    event.preventDefault();
    if (!authEmail.trim() || authPassword.length < 6) {
      setAccessError('Enter a valid email and a password with at least 6 characters.');
      return;
    }

    setAccessBusy(true);
    setAccessError('');
    newAccountRef.current = true;
    let createdUser = null;
    let verificationWasRequired = false;
    try {
      const credential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      createdUser = credential.user;
      const access = await checkCurrentUserAccess(credential.user);
      accessPolicyRef.current = access;
      setCurrentUser(credential.user);
      setCurrentRole(null);
      setRequestState('idle');
      setAuthPassword('');

      if (access.allowed) {
        await enterCloudMode(credential.user);
      } else if (needsPasswordVerification(access, credential.user)) {
        verificationWasRequired = true;
        await sendEmailVerification(credential.user);
        setOnlineAccess('verification-required');
        setRequestMessage('Your account has been created. Please verify your email before requesting access.');
      } else if (access.requestStatus === 'pending') {
        setOnlineAccess('unauthorized');
        setRequestState('pending');
        setRequestMessage('Your access request is awaiting administrator approval.');
      } else if (access.requestStatus === 'rejected') {
        setOnlineAccess('unauthorized');
        setRequestState('rejected');
        setRequestMessage('Your access request was not approved. Please contact an administrator.');
      } else {
        setOnlineAccess('unauthorized');
        setRequestMessage('Your account has been created. Request access to continue.');
      }
    } catch (error) {
      console.error('Email/password account creation failed.', error);
      if (createdUser && verificationWasRequired) {
        setCurrentUser(createdUser);
        setOnlineAccess('verification-required');
        setRequestMessage('Your account has been created, but the verification email could not be sent. Please try resending it.');
        setAccessError('Could not send the verification email. Please try again.');
      } else if (createdUser) {
        setCurrentUser(createdUser);
        setOnlineAccess('error');
        setAccessError('Your account was created, but the application access policy could not be checked. Please try again.');
      } else {
        newAccountRef.current = false;
        setAccessError(friendlyAuthError(error, 'Could not create the account. Please try again.'));
      }
    } finally {
      setAccessBusy(false);
    }
  };

  const resetPassword = async () => {
    const email = authEmail.trim() || currentUser?.email || '';
    if (!email) {
      setAccessError('Enter your email address first.');
      return;
    }

    setAccessBusy(true);
    setAccessError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setRequestMessage('If an account exists for this email, a password reset link has been sent.');
    } catch (error) {
      console.error('Password reset failed.', error);
      setAccessError(friendlyAuthError(error, 'Could not send the password reset email. Please try again.'));
    } finally {
      setAccessBusy(false);
    }
  };

  const resendVerification = async () => {
    if (!currentUser) return;
    setAccessBusy(true);
    setAccessError('');
    try {
      await sendEmailVerification(currentUser);
      setRequestMessage('Verification email sent. Open the link, then click Check Again.');
    } catch (error) {
      console.error('Email verification could not be resent.', error);
      setAccessError('Could not send the verification email. Please try again.');
    } finally {
      setAccessBusy(false);
    }
  };

  const checkVerificationAndAccess = async () => {
    if (!currentUser) return;
    setAccessBusy(true);
    setAccessError('');
    try {
      await currentUser.reload();
      const refreshedUser = auth.currentUser;
      if (!refreshedUser?.emailVerified) {
        setRequestMessage('Your email is not verified yet. Open the verification link, then try again.');
        return;
      }
      await refreshedUser.getIdToken(true);
      setCurrentUser(refreshedUser);
      setOnlineAccess('checking');
      await enterCloudMode(refreshedUser);
    } catch (error) {
      console.error('Could not refresh email verification.', error);
      setAccessError('Could not check email verification. Please try again.');
    } finally {
      setAccessBusy(false);
    }
  };

  const submitAccessRequest = async () => {
    if (!currentUser || requestBusy) return;
    setRequestBusy(true);
    setAccessError('');
    setRequestMessage('');

    try {
      const result = await requestCurrentUserAccess(newAccountRef.current ? 'new-account' : 'access-request');
      if (result.status === 'created') {
        setRequestState('created');
        setRequestMessage(`Access request sent. Your access request is awaiting administrator approval for ${APP_DISPLAY_NAME}.`);
      } else if (result.status === 'pending') {
        setRequestState('pending');
        setRequestMessage('Your access request is awaiting administrator approval.');
      } else if (result.status === 'already-approved' || result.status === 'approved') {
        setRequestState('idle');
        await enterCloudMode();
      } else if (result.status === 'rejected') {
        setRequestState('rejected');
        setAccessError('Your access request was not approved. Please contact an administrator.');
      } else {
        throw new Error('Unexpected access request response.');
      }
    } catch (error) {
      console.error('Could not submit the access request.', error);
      const deniedCodes = new Set(['functions/permission-denied', 'functions/unauthenticated', 'functions/failed-precondition', 'functions/not-found']);
      setRequestState('error');
      if (error.code === 'functions/failed-precondition' && needsPasswordVerification(accessPolicyRef.current, currentUser)) {
        setOnlineAccess('verification-required');
        setAccessError('Please verify your email before requesting access.');
      } else {
        setAccessError(deniedCodes.has(error.code)
          ? 'This account cannot request access to Ascension Manager. Please contact an administrator.'
          : 'Could not send the access request. Please try again.');
      }
    } finally {
      setRequestBusy(false);
    }
  };

  const useAnotherGoogleAccount = async () => {
    setAccessBusy(true);
    try {
      await signOut(auth);
      setMode(null);
      setCurrentUser(null);
      setCurrentRole(null);
      setOnlineAccess('signed-out');
      newAccountRef.current = false;
      pendingGoogleCredentialRef.current = null;
      setAccessError('');
      setRequestState('idle');
      setRequestMessage('');
    } catch (error) {
      console.error('Could not sign out.', error);
      setAccessError('Could not sign out. Please try again.');
    } finally {
      setAccessBusy(false);
    }
  };

  const leaveSession = async () => {
    if (mode === 'cloud') await signOut(auth);
    setMode(null);
    setCurrentRole(null);
    setPage('Dashboard');
    setModal(null);
    setAccessError('');
    setSyncState('');
    const empty = normalizeDb(null);
    dbRef.current = empty;
    setDb(empty);
  };

  const save = useCallback((next) => {
    const normalized = normalizeDb(next);
    const previous = dbRef.current;
    dbRef.current = normalized;
    setDb(normalized);
    setSyncState('Saving…');

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => {
        if (mode === 'local') return saveLocalData(normalized);
        if (mode === 'cloud' && currentUser) return saveCloudData(currentUser.uid, normalized, previous);
        throw new Error('Choose a storage mode before saving.');
      })
      .then(() => setSyncState(mode === 'cloud' ? 'Synced with Firestore' : 'Saved on this device'))
      .catch((error) => {
        console.error(error);
        setSyncState('Save failed — try again');
      });
  }, [mode, currentUser]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const studentsById = useMemo(() => Object.fromEntries(db.students.map((s) => [s.id, s])), [db.students]);
  const itemsById = useMemo(() => Object.fromEntries(db.items.map((i) => [i.id, i])), [db.items]);
  const configuredLevels = db.levels?.length ? db.levels : DEFAULT_LEVELS;
  const selectableLevels = ['', ...configuredLevels];

  const graceNotifications = useMemo(() => {
    const map = {};
    db.participations.forEach((p) => {
      const student = studentsById[p.studentId];
      const item = itemsById[p.itemId];
      if (!student || !item) return;
      Object.entries(p.results || {}).forEach(([level, result]) => {
        const marks = Number(result.graceMarks || 0);
        if (marks > 0) {
          map[p.studentId] ||= { student, entries: [] };
          map[p.studentId].entries.push({ item: item.name, level, marks, type: item.type });
        }
      });
    });
    return Object.values(map)
      .map((n) => ({ ...n, total: n.entries.reduce((sum, e) => sum + e.marks, 0) }))
      .filter((n) => n.entries.length > 1)
      .sort((a, b) => b.total - a.total);
  }, [db.participations, studentsById, itemsById]);

  const filteredParticipations = useMemo(() => {
    const text = query.trim().toLowerCase();
    return db.participations.filter((p) => {
      const student = studentsById[p.studentId];
      const item = itemsById[p.itemId];
      if (!student || !item) return false;
      const hay = `${student.name} ${student.admissionNo} ${student.className}${student.division} ${item.name} ${item.category}`.toLowerCase();
      return (
        (!text || hay.includes(text)) &&
        (filters.level === 'All' || normalizeLevel(p.currentLevel) === filters.level) &&
        (filters.category === 'All' || item.category === filters.category) &&
        (filters.type === 'All' || item.type === filters.type) &&
        (filters.className === 'All' || student.className === filters.className) &&
        (filters.status === 'All' || (filters.status === 'Ended' ? p.ended : !p.ended))
      );
    });
  }, [db.participations, query, filters, studentsById, itemsById]);

  const summary = useMemo(() => ({
    totalStudents: db.students.length,
    individualItems: db.items.filter((i) => i.type === 'Individual').length,
    groupItems: db.items.filter((i) => i.type === 'Group').length,
    district: db.participations.filter((p) => levelRank(p.currentLevel, configuredLevels) >= levelRank('District', configuredLevels)).length,
    state: db.participations.filter((p) => levelRank(p.currentLevel, configuredLevels) >= levelRank('State', configuredLevels)).length,
    national: db.participations.filter((p) => normalizeLevel(p.currentLevel) === 'National').length,
    multipleGrace: graceNotifications.length
  }), [db, graceNotifications]);

  const addCategory = (name) => {
    const clean = name.trim();
    if (!clean) return false;
    if (db.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      notify('Category already exists.');
      return false;
    }
    save({ ...db, categories: [...db.categories, clean].sort() });
    notify('Category added.');
    return true;
  };

  const deleteCategory = (category) => {
    if (DEFAULT_CATEGORIES.includes(category)) {
      notify('Default categories cannot be deleted.');
      return;
    }
    if (db.items.some((i) => i.category === category)) {
      notify('Cannot delete a category used by items.');
      return;
    }
    save({ ...db, categories: db.categories.filter((c) => c !== category) });
  };

  const deleteStudent = (id) => {
    save({
      ...db,
      students: db.students.filter((s) => s.id !== id),
      participations: db.participations.filter((p) => p.studentId !== id),
      groupMembers: db.groupMembers.filter((m) => m.studentId !== id)
    });
  };

  const deleteItem = (id) => {
    save({
      ...db,
      items: db.items.filter((i) => i.id !== id),
      participations: db.participations.filter((p) => p.itemId !== id),
      groupMembers: db.groupMembers.filter((m) => m.itemId !== id)
    });
  };

  const moveLevel = (participation, direction) => {
    if (participation.ended) return;
    const index = levelRank(participation.currentLevel, configuredLevels);
    const nextIndex = Math.max(0, Math.min(selectableLevels.length - 1, index + direction));
    save({
      ...db,
      participations: db.participations.map((p) =>
        p.id === participation.id ? { ...p, currentLevel: selectableLevels[nextIndex] } : p
      )
    });
  };

  const endHere = (participation) => {
    save({
      ...db,
      participations: db.participations.map((p) => (p.id === participation.id ? { ...p, ended: !p.ended } : p))
    });
  };

  const resetAll = () => {
    save({ categories: DEFAULT_CATEGORIES, levels: DEFAULT_LEVELS, students: [], items: [], participations: [], groupMembers: [], uploadedPhotos: [] });
    notify('All data reset. Arts and Sports categories are ready.');
  };

  const addLevel = (name) => {
    const clean = normalizeLevel(name);
    if (!clean) return false;
    if (clean.toLowerCase() === 'blank current level') {
      notify('Blank Current Level is built in and cannot be added as a named level.');
      return false;
    }
    if (configuredLevels.some((level) => level.toLowerCase() === clean.toLowerCase())) {
      notify('Level already exists.');
      return false;
    }
    save({ ...db, levels: [...configuredLevels, clean] });
    notify('Level added.');
    return true;
  };

  const renameLevel = (oldName, nextName) => {
    const clean = normalizeLevel(nextName);
    if (!clean) return notify('Level name is required.');
    if (configuredLevels.some((level) => level !== oldName && level.toLowerCase() === clean.toLowerCase())) {
      notify('Level already exists.');
      return;
    }
    save(rewriteLevel(db, oldName, clean, configuredLevels.map((level) => (level === oldName ? clean : level))));
    notify('Level renamed.');
  };

  const deleteLevel = (level) => {
    save(rewriteLevel(db, level, '', configuredLevels.filter((entry) => entry !== level), true));
    notify('Level deleted. Existing records using it were moved to Blank Current Level.');
  };

  const moveConfiguredLevel = (level, direction) => {
    const index = configuredLevels.indexOf(level);
    const nextIndex = Math.max(0, Math.min(configuredLevels.length - 1, index + direction));
    if (index === nextIndex) return;
    const levels = [...configuredLevels];
    [levels[index], levels[nextIndex]] = [levels[nextIndex], levels[index]];
    save({ ...db, levels });
  };

  const resetLevels = () => {
    save({ ...db, levels: DEFAULT_LEVELS });
    notify('Levels reset to defaults.');
  };

  const exportCsv = () => {
    const rows = [
      ['Student Name', 'Admission No', 'Class', 'Division', 'Gender', 'School Name', 'Item', 'Category', 'Type', 'Current Level', 'Position', 'Grade', 'Grace Marks']
    ];
    db.participations.forEach((p) => {
      const s = studentsById[p.studentId];
      const i = itemsById[p.itemId];
      const r = p.results?.[p.currentLevel] || {};
      if (s && i) rows.push([s.name, s.admissionNo, s.className, s.division, s.gender || '', s.schoolName || '', i.name, i.category, i.type, p.currentLevel, r.position || '', r.grade || '', r.graceMarks || '']);
    });
    downloadText('student-participation-export.csv', toCsv(rows), 'text/csv;charset=utf-8');
  };

  const exportBackup = () => {
    const backup = {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: db
    };
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`ascman-universal-backup-${date}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
    notify('Universal backup downloaded with all data and photos.');
  };

  const restoreBackup = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const restored = normalizeDb(parsed.data || parsed);
      save(restored);
      notify('Universal backup restored.');
    } catch {
      notify('Could not restore backup. Please choose a valid AscMan backup JSON file.');
    }
  };

  const importCsv = async (file) => {
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      notify('CSV has no rows to import.');
      return;
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name) => headers.indexOf(name.toLowerCase());
    const required = ['student name', 'item'];
    if (required.some((h) => idx(h) === -1)) {
      notify('Import needs at least Student Name and Item columns.');
      return;
    }
    const next = structuredClone(db);
    const errors = [];
    rows.slice(1).forEach((row, rowIndex) => {
      const studentName = row[idx('student name')]?.trim();
      const itemName = row[idx('item')]?.trim();
      if (!studentName || !itemName) {
        errors.push(`Row ${rowIndex + 2}: missing student or item.`);
        return;
      }
      const admissionNo = idx('admission no') >= 0 ? row[idx('admission no')].trim() : '';
      const gender = idx('gender') >= 0 ? row[idx('gender')].trim() : '';
      const schoolName = idx('school name') >= 0 ? row[idx('school name')].trim() : '';
      let student = next.students.find((s) => s.name.toLowerCase() === studentName.toLowerCase() && s.admissionNo === admissionNo);
      if (!student) {
        student = {
          id: uid(),
          name: studentName,
          admissionNo,
          className: idx('class') >= 0 ? row[idx('class')].trim() : '',
          division: idx('division') >= 0 ? row[idx('division')].trim() : '',
          gender,
          schoolName: schoolName || 'St. Gemmas GHSS Malappuram',
          contact: '',
          photo: blankPhoto
        };
        next.students.push(student);
      } else {
        if (gender && !student.gender) student.gender = gender;
        if (schoolName && !student.schoolName) student.schoolName = schoolName;
      }
      const category = idx('category') >= 0 && row[idx('category')].trim() ? row[idx('category')].trim() : 'Arts';
      if (!next.categories.includes(category)) next.categories.push(category);
      const rowLevel = idx('current level') >= 0 ? normalizeLevel(row[idx('current level')]) : 'School Level';
      let item = next.items.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
      if (!item) {
        item = {
          id: uid(),
          name: itemName,
          category,
          type: idx('type') >= 0 && row[idx('type')].trim() === 'Group' ? 'Group' : 'Individual',
          level: rowLevel
        };
        next.items.push(item);
      }
      const exists = next.participations.some((p) => p.studentId === student.id && p.itemId === item.id);
      if (exists) {
        errors.push(`Row ${rowIndex + 2}: duplicate participation skipped.`);
        return;
      }
      next.participations.push({ id: uid(), studentId: student.id, itemId: item.id, currentLevel: rowLevel, ended: false, results: {} });
      if (item.type === 'Group' && !next.groupMembers.some((m) => m.studentId === student.id && m.itemId === item.id)) {
        next.groupMembers.push({ id: uid(), studentId: student.id, itemId: item.id });
      }
    });
    next.categories = [...new Set(next.categories)].sort();
    save(next);
    notify(errors.length ? `Imported with ${errors.length} warnings.` : 'Import completed.');
  };

  const collageEntries = useMemo(() => {
    const levelFilter = collageFilter.level;
    const rows = [];
    const includedStudents = new Set();
    db.participations.forEach((p) => {
      const student = studentsById[p.studentId];
      const item = itemsById[p.itemId];
      if (!student || !item) return;
      if (collageFilter.category !== 'All' && item.category !== collageFilter.category) return;
      if (collageFilter.className !== 'All' && student.className !== collageFilter.className) return;
      if (collageFilter.division !== 'All' && student.division !== collageFilter.division) return;
      const levels = levelFilter === 'Entire list' ? Object.keys(p.results || {}).concat(normalizeLevel(p.currentLevel)) : [levelFilter];
      [...new Set(levels)].forEach((level) => {
        const result = p.results?.[level] || {};
        if (levelFilter !== 'Entire list' && levelRank(p.currentLevel, configuredLevels) < levelRank(level, configuredLevels)) return;
        includedStudents.add(student.id);
        rows.push({ student, item, level, result });
      });
    });
    db.students.forEach((student) => {
      if (includedStudents.has(student.id)) return;
      if (collageFilter.category !== 'All') return;
      if (collageFilter.className !== 'All' && student.className !== collageFilter.className) return;
      if (collageFilter.division !== 'All' && student.division !== collageFilter.division) return;
      if (levelFilter !== 'Entire list' && levelFilter !== '') return;
      rows.push({ student, item: null, level: '', result: {} });
    });
    return rows.sort((a, b) => compareResult(a.result, b.result) || a.student.name.localeCompare(b.student.name));
  }, [db, studentsById, itemsById, collageFilter]);

  const downloadCollageImage = async () => {
    const node = document.querySelector('.collage-sheet');
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.download = 'student-collage.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadCollagePdf = async () => {
    const node = document.querySelector('.collage-sheet');
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = 210;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, Math.min(height, 297));
    pdf.save('student-collage.pdf');
  };

  const nav = [
    ['Dashboard', Grid2X2],
    ['Students', GraduationCap],
    ['Items', Layers],
    ['Participation', ClipboardList],
    ['Grace Marks', Bell],
    ['Collage Generator', FileImage],
    ['Settings', Settings]
  ];

  if (!mode || (mode === 'cloud' && (!authChecked || onlineAccess !== 'authorized' || !currentUser))) {
    return (
      <AccessGate
        authChecked={authChecked}
        busy={accessBusy}
        error={accessError}
        user={currentUser}
        onlineAccess={onlineAccess}
        requestBusy={requestBusy}
        requestState={requestState}
        requestMessage={requestMessage}
        authEmail={authEmail}
        authPassword={authPassword}
        authFormMode={authFormMode}
        setAuthEmail={setAuthEmail}
        setAuthPassword={setAuthPassword}
        setAuthFormMode={setAuthFormMode}
        signInWithPassword={signInWithPassword}
        signUpWithPassword={signUpWithPassword}
        resetPassword={resetPassword}
        resendVerification={resendVerification}
        checkVerificationAndAccess={checkVerificationAndAccess}
        enterCloudMode={enterCloudMode}
        submitAccessRequest={submitAccessRequest}
        checkAgain={enterCloudMode}
        useAnotherGoogleAccount={useAnotherGoogleAccount}
        enterOfflineMode={enterOfflineMode}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <School size={28} />
          <div>
            <strong>School Programmes Ascention Manager</strong>
            <span>Participation and level tracking</span>
          </div>
        </div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button key={name} className={page === name ? 'active' : ''} onClick={() => setPage(name)}>
              <Icon size={18} /> {name}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{page === 'Collage Generator' ? 'Create Collage' : page}</h1>
            <p>Manage students, competition items, level results, and grace mark cases.</p>
          </div>
          <div className="account-status">
            <div>
              <strong>{mode === 'cloud' ? currentUser?.displayName || currentUser?.email : 'Offline workspace'}</strong>
              <span><i className={syncState.includes('failed') ? 'status-error' : ''} />{syncState}</span>
            </div>
            <button onClick={leaveSession} title={mode === 'cloud' ? 'Sign out' : 'Change storage mode'}>
              <LogOut size={17} /> {mode === 'cloud' ? 'Sign out' : 'Exit offline'}
            </button>
          </div>
        </header>

        {page === 'Dashboard' && (
          <Dashboard summary={summary} filters={filters} setFilters={setFilters} db={db} query={query} setQuery={setQuery} levels={selectableLevels} />
        )}

        {page === 'Students' && (
          <StudentsPage
            db={db}
            query={query}
            setQuery={setQuery}
            setModal={setModal}
            deleteStudent={deleteStudent}
            students={filterStudents(db.students, query)}
          />
        )}

        {page === 'Items' && (
          <ItemsPage
            db={db}
            studentsById={studentsById}
            expanded={expanded}
            setExpanded={setExpanded}
            setModal={setModal}
            deleteItem={deleteItem}
            deleteCategory={deleteCategory}
            save={save}
          />
        )}

        {page === 'Participation' && (
          <ParticipationPage
            rows={filteredParticipations}
            db={db}
            studentsById={studentsById}
            itemsById={itemsById}
            query={query}
            setQuery={setQuery}
            filters={filters}
            setFilters={setFilters}
            setModal={setModal}
            moveLevel={moveLevel}
            endHere={endHere}
            save={save}
            levels={selectableLevels}
          />
        )}

        {page === 'Grace Marks' && <GracePage notifications={graceNotifications} />}

        {page === 'Collage Generator' && (
          <CollagePage
            db={db}
            levels={selectableLevels}
            collageFilter={collageFilter}
            setCollageFilter={setCollageFilter}
            entries={collageEntries}
            downloadCollageImage={downloadCollageImage}
            downloadCollagePdf={downloadCollagePdf}
          />
        )}

        {page === 'Settings' && (
          <SettingsPage
            db={db}
            addCategory={addCategory}
            deleteCategory={deleteCategory}
            addLevel={addLevel}
            renameLevel={renameLevel}
            deleteLevel={deleteLevel}
            moveConfiguredLevel={moveConfiguredLevel}
            resetLevels={resetLevels}
            resetAll={resetAll}
            exportCsv={exportCsv}
            exportBackup={exportBackup}
            restoreBackup={restoreBackup}
            importCsv={importCsv}
            notify={notify}
            requestReset={() => setModal({ type: 'resetConfirm' })}
          />
        )}
      </main>

      {modal?.type === 'student' && (
        <StudentModal
          data={modal.student}
          db={db}
          save={save}
          close={() => setModal(null)}
          notify={notify}
          addCategory={addCategory}
          levels={selectableLevels}
        />
      )}
      {modal?.type === 'item' && (
        <ItemModal data={modal.item} db={db} save={save} close={() => setModal(null)} addCategory={addCategory} levels={selectableLevels} />
      )}
      {modal?.type === 'participation' && (
        <ParticipationModal data={modal.participation} db={db} save={save} close={() => setModal(null)} levels={selectableLevels} />
      )}
      {modal?.type === 'result' && (
        <ResultModal participation={modal.participation} level={modal.level} db={db} save={save} close={() => setModal(null)} />
      )}
      {modal?.type === 'groupResult' && (
        <GroupResultModal participations={modal.participations} item={modal.item} db={db} save={save} close={() => setModal(null)} levels={selectableLevels} />
      )}
      {modal?.type === 'resetConfirm' && (
        <ResetConfirmModal resetAll={resetAll} close={() => setModal(null)} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function AccessGate({
  authChecked,
  busy,
  error,
  user,
  onlineAccess,
  requestBusy,
  requestState,
  requestMessage,
  authEmail,
  authPassword,
  authFormMode,
  setAuthEmail,
  setAuthPassword,
  setAuthFormMode,
  signInWithPassword,
  signUpWithPassword,
  resetPassword,
  resendVerification,
  checkVerificationAndAccess,
  enterCloudMode,
  submitAccessRequest,
  checkAgain,
  useAnotherGoogleAccount,
  enterOfflineMode
}) {
  const unauthorized = authChecked && user && onlineAccess === 'unauthorized';
  const verificationRequired = authChecked && user && onlineAccess === 'verification-required';
  const requestPending = requestState === 'created' || requestState === 'pending';
  const requestRejected = requestState === 'rejected';

  return (
    <main className="access-page">
      <section className="access-card">
        <div className="access-brand">
          <span><School size={34} /></span>
          <div>
            <p>Ascension Manager</p>
            <h1>Choose where to keep your school data</h1>
          </div>
        </div>
        <p className="access-intro">
          Sign in to keep your workspace securely in Firestore across devices, or continue offline with data stored only in this browser.
        </p>
        <div className="access-options">
          {verificationRequired ? (
            <section className="access-request-panel" aria-live="polite">
              <strong>Please verify your email before requesting access.</strong>
              <p>{requestMessage || 'Open the verification link sent to your email address, then check again.'}</p>
              <div className="access-request-actions">
                <button className="primary" onClick={checkVerificationAndAccess} disabled={busy}>Check Again</button>
                <button onClick={resendVerification} disabled={busy}>Resend verification email</button>
                <button onClick={useAnotherGoogleAccount} disabled={busy}>Sign Out</button>
              </div>
            </section>
          ) : unauthorized ? (
            <section className="access-request-panel" aria-live="polite">
              <strong>Your account does not currently have access to this application.</strong>
              <p>An administrator must approve your account before you can use the online workspace.</p>
              <button className="primary access-request-button" onClick={submitAccessRequest} disabled={requestBusy || requestPending || requestRejected}>
                {requestBusy ? 'Sending request…' : requestPending ? 'Awaiting approval' : requestRejected ? 'Request rejected' : 'Request Access'}
              </button>
              {requestMessage && <p className="access-request-message">{requestMessage}</p>}
              <div className="access-request-actions">
                <button onClick={checkAgain} disabled={busy || requestBusy}>Check Again</button>
                <button onClick={useAnotherGoogleAccount} disabled={busy || requestBusy}>Sign Out</button>
              </div>
            </section>
          ) : (
            <>
              <button className="access-option cloud-option" onClick={() => enterCloudMode()} disabled={busy || !authChecked}>
                <span className="option-icon google-mark">G</span>
                <span>
                  <strong>{user ? `Continue as ${user.displayName || user.email}` : 'Continue with Google'}</strong>
                  <small>Online workspace · synced with Firestore</small>
                </span>
                <Cloud size={22} />
              </button>
              {!user && (
                <>
                  <div className="access-divider"><span>or</span></div>
                  <form className="email-auth-form" onSubmit={authFormMode === 'sign-in' ? signInWithPassword : signUpWithPassword}>
                    <div className="auth-form-tabs">
                      <button type="button" className={authFormMode === 'sign-in' ? 'active' : ''} onClick={() => setAuthFormMode('sign-in')}>Sign In</button>
                      <button type="button" className={authFormMode === 'sign-up' ? 'active' : ''} onClick={() => setAuthFormMode('sign-up')}>Create Account</button>
                    </div>
                    {authFormMode === 'sign-up' && <p>Create your account. Administrator approval is required before you can use this application.</p>}
                    <label>Email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" required /></label>
                    <label>Password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete={authFormMode === 'sign-in' ? 'current-password' : 'new-password'} minLength="6" required /></label>
                    <button className="primary" type="submit" disabled={busy}>{authFormMode === 'sign-in' ? 'Sign In' : 'Create Account'}</button>
                    {authFormMode === 'sign-in' && <button className="link-button forgot-password" type="button" onClick={resetPassword} disabled={busy}>Forgot Password?</button>}
                  </form>
                </>
              )}
            </>
          )}
          <button className="access-option" onClick={enterOfflineMode} disabled={busy || requestBusy}>
            <span className="option-icon"><HardDrive size={23} /></span>
            <span>
              <strong>Work locally offline</strong>
              <small>Private to this device · stored in IndexedDB</small>
            </span>
            <HardDrive size={22} />
          </button>
        </div>
        {!authChecked && <p className="access-message">Checking your Google sign-in…</p>}
        {busy && authChecked && <p className="access-message">Opening your workspace…</p>}
        {requestMessage && !unauthorized && !verificationRequired && <p className="access-message" role="status">{requestMessage}</p>}
        {error && <p className="access-error" role="alert">{error}</p>}
        {authChecked && user && onlineAccess === 'error' && (
          <div className="access-request-actions">
            <button onClick={checkAgain} disabled={busy}>Check Again</button>
            <button onClick={useAnotherGoogleAccount} disabled={busy}>Sign Out</button>
          </div>
        )}
        <p className="access-footnote">You can export a universal backup from Settings in either mode.</p>
      </section>
    </main>
  );
}

function Dashboard({ summary, filters, setFilters, db, query, setQuery, levels }) {
  const cards = [
    ['Total students', summary.totalStudents, GraduationCap],
    ['Individual items', summary.individualItems, Award],
    ['Group items', summary.groupItems, Users],
    ['Qualified District', summary.district, ArrowUp],
    ['Qualified State', summary.state, ArrowUp],
    ['Qualified National', summary.national, ArrowUp],
    ['Multiple grace marks', summary.multipleGrace, Bell]
  ];
  return (
    <>
      <section className="summary-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="metric" key={label}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <FilterBar db={db} filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} levels={levels} />
    </>
  );
}

function StudentsPage({ db, query, setQuery, setModal, deleteStudent, students }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <SearchBox query={query} setQuery={setQuery} placeholder="Search students, admission no, class..." />
        <button className="primary" onClick={() => setModal({ type: 'student' })}><Plus size={18} /> Add Student</button>
      </div>
      <PagedTable
        rows={students}
        columns={['Student', 'Admission No', 'Class', 'Gender', 'School', 'Contact', 'Actions']}
        sortValue={(student, column) => [student.name, student.admissionNo, classDivision(student), student.gender, student.schoolName, student.contact, student.id][column]}
        render={(s) => (
        <tr key={s.id}>
          <td><Person student={s} /></td>
          <td>{s.admissionNo}</td>
          <td>{classDivision(s)}</td>
          <td>{s.gender}</td>
          <td>{s.schoolName}</td>
          <td>{s.contact}</td>
          <td className="actions">
            <button className="icon" title="Edit student" onClick={() => setModal({ type: 'student', student: s })}><Pencil size={16} /></button>
            <button className="icon danger" title="Delete student" onClick={() => deleteStudent(s.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
        )}
      />
    </section>
  );
}

function ItemsPage({ db, studentsById, expanded, setExpanded, setModal, deleteItem, deleteCategory, save }) {
  const [sortIndex, setSortIndex] = useState(0);
  const [sortDirection, setSortDirection] = useState(1);
  const itemColumns = ['Item', 'Category', 'Type', 'Level', 'Actions'];
  const sorted = sortRows(db.items, sortIndex, sortDirection, (item, column) =>
    [item.name, item.category, item.type, item.level, item.id][column]
  );
  const sortItems = (column) => {
    if (sortIndex === column) setSortDirection((direction) => direction * -1);
    else {
      setSortIndex(column);
      setSortDirection(1);
    }
  };
  const removeMember = (memberId) => {
    const member = db.groupMembers.find((m) => m.id === memberId);
    save({
      ...db,
      groupMembers: db.groupMembers.filter((m) => m.id !== memberId),
      participations: member ? db.participations.filter((p) => !(p.itemId === member.itemId && p.studentId === member.studentId)) : db.participations
    });
  };
  const addGroupMember = (item, studentId) => {
    if (!studentId || db.groupMembers.some((m) => m.itemId === item.id && m.studentId === studentId)) return;
    const nextMembers = [...db.groupMembers, { id: uid(), itemId: item.id, studentId }];
    const nextParticipations = db.participations.some((p) => p.itemId === item.id && p.studentId === studentId)
      ? db.participations
      : [...db.participations, { id: uid(), studentId, itemId: item.id, currentLevel: normalizeLevel(item.level || 'School Level'), nextCompetitionDate: '', ended: false, results: {} }];
    save({ ...db, groupMembers: nextMembers, participations: nextParticipations });
  };
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="category-chips">
          {db.categories.map((c) => <span key={c}>{c}<button title="Delete category" onClick={() => deleteCategory(c)}><X size={13} /></button></span>)}
        </div>
        <button className="primary" onClick={() => setModal({ type: 'item' })}><Plus size={18} /> Add Item</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{itemColumns.map((column, index) => (
            <SortableHeader
              key={column}
              label={column}
              active={sortIndex === index}
              direction={sortDirection}
              onClick={() => sortItems(index)}
            />
          ))}</tr></thead>
          <tbody>
            {sorted.map((item) => {
              const members = db.groupMembers.filter((m) => m.itemId === item.id);
              return (
                <React.Fragment key={item.id}>
                  <tr className={item.type === 'Group' ? 'group-row' : ''}>
                    <td>
                      {item.type === 'Group' && <button className="chevron" onClick={() => setExpanded({ ...expanded, [item.id]: !expanded[item.id] })}>{expanded[item.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.type}</td>
                    <td>{formatLevel(item.level)}</td>
                    <td className="actions">
                      <button className="icon" title="Edit item" onClick={() => setModal({ type: 'item', item })}><Pencil size={16} /></button>
                      <button className="icon danger" title="Delete item" onClick={() => deleteItem(item.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                  {item.type === 'Group' && expanded[item.id] && (
                    <tr className="member-row">
                      <td colSpan="5">
                        <div className="member-grid">
                          {members.map((m) => studentsById[m.studentId] && (
                            <span key={m.id}><Person student={studentsById[m.studentId]} small /> <button title="Remove member" onClick={() => removeMember(m.id)}><Trash2 size={14} /></button></span>
                          ))}
                          <select className="member-select" value="" onChange={(e) => { addGroupMember(item, e.target.value); e.target.value = ''; }}>
                            <option value="">Add student</option>
                            {db.students
                              .filter((s) => !members.some((m) => m.studentId === s.id))
                              .map((s) => <option key={s.id} value={s.id}>{s.name} ({classDivision(s)})</option>)}
                          </select>
                          {!members.length && <em>No members added yet.</em>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ParticipationPage({ rows, db, studentsById, itemsById, query, setQuery, filters, setFilters, setModal, moveLevel, endHere, save, levels }) {
  const [openGroups, setOpenGroups] = useState({});
  const deleteParticipation = (id) => save({ ...db, participations: db.participations.filter((p) => p.id !== id) });
  useEffect(() => {
    const missing = db.groupMembers
      .filter((m) => itemsById[m.itemId]?.type === 'Group')
      .filter((m) => !db.participations.some((p) => p.itemId === m.itemId && p.studentId === m.studentId))
      .map((m) => ({
        id: uid(),
        studentId: m.studentId,
        itemId: m.itemId,
        currentLevel: normalizeLevel(itemsById[m.itemId]?.level || 'School Level'),
        nextCompetitionDate: '',
        ended: false,
        results: {}
      }));
    if (missing.length) save({ ...db, participations: [...db.participations, ...missing] });
  }, [db, itemsById, save]);
  const moveGroupLevel = (participations, direction) => {
    const ids = new Set(participations.map((p) => p.id));
    save({
      ...db,
      participations: db.participations.map((p) => {
        if (!ids.has(p.id) || p.ended) return p;
        const namedLevels = levels.filter(Boolean);
        const index = levelRank(p.currentLevel, namedLevels);
        const nextIndex = Math.max(0, Math.min(levels.length - 1, index + direction));
        return { ...p, currentLevel: levels[nextIndex] };
      })
    });
  };
  const toggleGroupEnd = (participations) => {
    const ids = new Set(participations.map((p) => p.id));
    const shouldEnd = participations.some((p) => !p.ended);
    save({
      ...db,
      participations: db.participations.map((p) => (ids.has(p.id) ? { ...p, ended: shouldEnd } : p))
    });
  };
  const groupLevel = (participations) => {
    const unique = [...new Set(participations.map((p) => normalizeLevel(p.currentLevel)))];
    return unique.length === 1 ? formatLevel(unique[0]) : 'Mixed levels';
  };
  const groupDate = (participations) => {
    const dates = [...new Set(participations.map((p) => p.nextCompetitionDate || ''))];
    return dates.length === 1 ? formatCompetitionDate(dates[0]) : 'Multiple dates';
  };
  const groupedRows = useMemo(() => {
    const groups = {};
    const singles = [];
    rows.forEach((p) => {
      const item = itemsById[p.itemId];
      if (item?.type === 'Group') {
        groups[p.itemId] ||= { kind: 'group', item, participations: [] };
        groups[p.itemId].participations.push(p);
      } else {
        singles.push({ kind: 'single', participation: p });
      }
    });
    return [...Object.values(groups).sort((a, b) => a.item.name.localeCompare(b.item.name)), ...singles];
  }, [rows, itemsById]);

  const renderParticipationRow = (p, memberClass = '', showLevelControls = true) => {
    const s = studentsById[p.studentId];
    const i = itemsById[p.itemId];
    const result = p.results?.[p.currentLevel] || {};
    return (
      <tr key={p.id} className={memberClass}>
        <td><Person student={s} /></td>
        <td>{i?.name}</td>
        <td>{i?.category}</td>
        <td>
          {showLevelControls ? (
            <div className={`level-arrows ${p.ended ? 'ended' : ''}`}>
              <button title="Move up" onClick={() => moveLevel(p, 1)}><ArrowUp size={16} /></button>
              <button title="Move down" onClick={() => moveLevel(p, -1)}><ArrowDown size={16} /></button>
            </div>
          ) : <span className="muted">Group controlled</span>}
        </td>
        <td><button className={`level-pill ${p.ended ? 'stopped' : ''}`} onClick={() => setModal({ type: 'result', participation: p, level: normalizeLevel(p.currentLevel) })}>{formatLevel(p.currentLevel)}</button></td>
        <td><button className="date-button" onClick={() => setModal({ type: 'participation', participation: p })}>{formatCompetitionDate(p.nextCompetitionDate)}</button></td>
        <td><button className={p.ended ? 'ghost success-text' : 'ghost danger-text'} onClick={() => endHere(p)}>End here</button></td>
        <td>{formatResult(result)}</td>
        <td className="actions">
          <button className="icon" title="Edit participation" onClick={() => setModal({ type: 'participation', participation: p })}><Pencil size={16} /></button>
          <button className="icon danger" title="Delete participation" onClick={() => deleteParticipation(p.id)}><Trash2 size={16} /></button>
        </td>
      </tr>
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <SearchBox query={query} setQuery={setQuery} placeholder="Search participation..." />
        <button className="primary" onClick={() => setModal({ type: 'participation' })}><Plus size={18} /> Add Participation</button>
      </div>
      <FilterBar db={db} filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} compact levels={levels} />
      <PagedTable
        rows={groupedRows}
        columns={['Student / Group', 'Item', 'Category', 'Increase Level', 'Current Level', 'Next Competition Date', 'End', 'Result', 'Actions']}
        sortValue={(row, column) => {
          const participations = row.kind === 'group' ? row.participations : [row.participation];
          const first = participations[0] || {};
          const student = studentsById[first.studentId];
          const item = row.kind === 'group' ? row.item : itemsById[first.itemId];
          const result = first.results?.[first.currentLevel] || {};
          return [
            row.kind === 'group' ? item?.name : student?.name,
            item?.name,
            item?.category,
            levelRank(first.currentLevel, levels.filter(Boolean)),
            first.currentLevel,
            first.nextCompetitionDate || '',
            participations.every((p) => p.ended),
            formatResult(result),
            row.kind === 'group' ? item?.id : first.id
          ][column];
        }}
        allowPageSize
        render={(row) => {
        if (row.kind === 'single') return renderParticipationRow(row.participation);
        const open = Boolean(openGroups[row.item.id]);
        const allEnded = row.participations.every((p) => p.ended);
        return (
          <React.Fragment key={row.item.id}>
            <tr className="group-row">
              <td>
                <button className="chevron" onClick={() => setOpenGroups({ ...openGroups, [row.item.id]: !open })}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                <strong>{row.item.name}</strong>
                <em className="group-count">{row.participations.length} members</em>
              </td>
              <td>{row.item.name}</td>
              <td>{row.item.category}</td>
              <td>
                <div className={`level-arrows ${allEnded ? 'ended' : ''}`}>
                  <button title="Move group up" onClick={() => moveGroupLevel(row.participations, 1)}><ArrowUp size={16} /></button>
                  <button title="Move group down" onClick={() => moveGroupLevel(row.participations, -1)}><ArrowDown size={16} /></button>
                </div>
              </td>
              <td><button className={`level-pill readonly ${allEnded ? 'stopped' : ''}`} onClick={() => setModal({ type: 'groupResult', participations: row.participations, item: row.item })}>{groupLevel(row.participations)}</button></td>
              <td>{groupDate(row.participations)}</td>
              <td><button className={allEnded ? 'ghost success-text' : 'ghost danger-text'} onClick={() => toggleGroupEnd(row.participations)}>End here</button></td>
              <td>Click level to enter result</td>
              <td></td>
            </tr>
            {open && row.participations.map((p) => renderParticipationRow(p, 'member-row-inline', false))}
          </React.Fragment>
        );
        }}
      />
    </section>
  );
}

function GracePage({ notifications }) {
  return (
    <section className="notifications">
      {notifications.map((n) => (
        <article className="notice duplicate" key={n.student.id}>
          <Person student={n.student} />
          <strong>Total grace marks: {n.total}</strong>
          <div>{n.entries.map((e) => <span key={`${e.item}-${e.level}`}>{e.item} ({e.type}) - {e.level}: {e.marks}</span>)}</div>
        </article>
      ))}
      {!notifications.length && <div className="empty">No students with grace marks from more than one item.</div>}
    </section>
  );
}

function CollagePage(props) {
  return (
    <section className="panel">
      <CollageControls {...props} />
      <div className="collage-workspace">
        <CollageSheet entries={props.entries} columns={props.collageFilter.columns} details={props.collageFilter.details} />
        <CollageDetailsPanel collageFilter={props.collageFilter} setCollageFilter={props.setCollageFilter} />
      </div>
    </section>
  );
}

function SettingsPage({
  db,
  addCategory,
  deleteCategory,
  addLevel,
  renameLevel,
  deleteLevel,
  moveConfiguredLevel,
  resetLevels,
  resetAll,
  exportCsv,
  exportBackup,
  restoreBackup,
  importCsv,
  notify,
  requestReset
}) {
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const copyEmail = async () => {
    await navigator.clipboard.writeText('jeevanvarghese579@gmail.com');
    notify('Email copied to clipboard.');
  };
  return (
    <section className="settings-grid">
      <article className="panel">
        <h2>Categories</h2>
        <div className="inline-form">
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="New category" />
          <button className="primary" onClick={() => { if (addCategory(category)) setCategory(''); }}><Plus size={16} /> Add</button>
        </div>
        <div className="category-chips loose">{db.categories.map((c) => <span key={c}>{c}<button title="Delete category" onClick={() => deleteCategory(c)}><X size={13} /></button></span>)}</div>
      </article>
      <article className="panel">
        <h2>Current Levels</h2>
        <div className="inline-form">
          <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="New level" />
          <button className="primary" onClick={() => { if (addLevel(level)) setLevel(''); }}><Plus size={16} /> Add</button>
        </div>
        <div className="level-list">
          {(db.levels || DEFAULT_LEVELS).map((entry, index, levels) => (
            <LevelManagerRow
              key={entry}
              level={entry}
              isFirst={index === 0}
              isLast={index === levels.length - 1}
              renameLevel={renameLevel}
              deleteLevel={deleteLevel}
              moveConfiguredLevel={moveConfiguredLevel}
            />
          ))}
        </div>
        <button onClick={resetLevels}><RefreshCw size={16} /> Reset Levels</button>
      </article>
      <article className="panel">
        <h2>Import / Export</h2>
        <div className="button-row">
          <button onClick={exportCsv}><Download size={16} /> Export CSV</button>
          <label className="button-like"><Upload size={16} /> Import CSV<input type="file" accept=".csv" onChange={(e) => importCsv(e.target.files[0])} /></label>
        </div>
        <p className="muted">CSV import accepts Student Name, Admission No, Class, Division, Gender, School Name, Item, Category, Type, and Current Level columns.</p>
      </article>
      <article className="panel">
        <h2>Universal Backup / Restore</h2>
        <div className="button-row">
          <button onClick={exportBackup}><Download size={16} /> Backup All Data</button>
          <label className="button-like"><Upload size={16} /> Restore Backup<input type="file" accept=".json,application/json" onChange={(e) => { restoreBackup(e.target.files[0]); e.target.value = ''; }} /></label>
        </div>
        <p className="muted">Backs up and restores students, items, participations, categories, group members, results, and photos.</p>
      </article>
      <article className="panel about-panel">
        <h2>About</h2>
        <div className="app-meta">
          <span className="eyebrow">App</span>
          <strong>{APP_NAME}</strong>
          <p>Version {APP_VERSION}</p>
        </div>
        <div className="developer-card">
          <div className="developer-avatar">JV</div>
          <div>
            <span className="eyebrow">Developer</span>
            <strong>Jeevan Varghese</strong>
            <p>St. Gemmas GHSS Malappuram</p>
            <button className="link-button" onClick={copyEmail}><Mail size={16} /> jeevanvarghese579@gmail.com</button>
          </div>
        </div>
      </article>
      <article className="panel danger-zone">
        <h2>Reset Data</h2>
        <p>Reset all students, items, categories, participations, group members, and photos. Arts and Sports remain as defaults.</p>
        <button className="danger solid" onClick={requestReset}><RefreshCw size={16} /> Reset App Data</button>
      </article>
    </section>
  );
}

function LevelManagerRow({ level, isFirst, isLast, renameLevel, deleteLevel, moveConfiguredLevel }) {
  const [name, setName] = useState(level);
  useEffect(() => setName(level), [level]);
  const saveName = () => {
    if (name !== level) renameLevel(level, name);
  };
  return (
    <div className="level-row">
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }} />
      <button className="icon" title="Move level up" disabled={isFirst} onClick={() => moveConfiguredLevel(level, -1)}><ArrowUp size={16} /></button>
      <button className="icon" title="Move level down" disabled={isLast} onClick={() => moveConfiguredLevel(level, 1)}><ArrowDown size={16} /></button>
      <button className="icon danger" title="Delete level" onClick={() => deleteLevel(level)}><Trash2 size={16} /></button>
    </div>
  );
}

function StudentModal({ data, db, save, close, notify, addCategory, levels }) {
  const [form, setForm] = useState(data || { name: '', admissionNo: '', className: '', division: '', gender: '', schoolName: 'St. Gemmas GHSS Malappuram', contact: '', photo: blankPhoto });
  const [participationItem, setParticipationItem] = useState('');
  const [newItem, setNewItem] = useState({ name: '', category: db.categories[0] || 'Arts', type: 'Individual', level: 'School Level' });
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const isEdit = Boolean(data);
  const pastePhoto = async () => {
    const photo = await readClipboardPhoto();
    if (!photo) return notify('No image found in clipboard.');
    setForm({ ...form, photo });
  };
  const submit = () => {
    if (!form.name.trim()) return notify('Student name is required.');
    const student = { ...form, id: form.id || uid(), photo: form.photo || blankPhoto };
    const next = {
      ...db,
      students: isEdit ? db.students.map((s) => (s.id === student.id ? student : s)) : [...db.students, student]
    };
    if (!isEdit && participationItem) {
      let item = db.items.find((i) => i.id === participationItem);
      if (participationItem === '__new__') {
        if (!newItem.name.trim()) return notify('New item name is required.');
        item = { ...newItem, id: uid(), name: newItem.name.trim() };
        next.items = [...next.items, item];
      }
      next.participations = [...next.participations, { id: uid(), studentId: student.id, itemId: item.id, currentLevel: normalizeLevel(item.level || 'School Level'), nextCompetitionDate: '', ended: false, results: {} }];
      if (item?.type === 'Group') next.groupMembers = [...next.groupMembers, { id: uid(), studentId: student.id, itemId: item.id }];
    }
    save(next);
    close();
  };
  return (
    <Modal title={isEdit ? 'Edit Student' : 'Add Student'} close={close}>
      <FormGrid>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Student name" />
        <input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="Admission number / ID" />
        <input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="Class" />
        <input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} placeholder="Division" />
        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Gender</option><option>Female</option><option>Male</option><option>Other</option></select>
        <input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} placeholder="School name" />
        <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Contact details" />
        <label className="photo-upload"><Camera size={16} /> Upload photo<input type="file" accept="image/*" onChange={(e) => readPhoto(e.target.files[0], (photo) => setForm({ ...form, photo }))} /></label>
        <button onClick={pastePhoto}><ClipboardList size={16} /> Paste photo</button>
      </FormGrid>
      <img className="photo-preview" src={form.photo || blankPhoto} alt="" />
      {!isEdit && (
        <div className="modal-section">
          <label>Optional participation while adding student</label>
          <select value={participationItem} onChange={(e) => setParticipationItem(e.target.value)}>
            <option value="">Choose item</option>
            <option value="__new__">New item</option>
            {db.items.map((i) => <option key={i.id} value={i.id}>{i.name} - {i.category}</option>)}
          </select>
          {participationItem === '__new__' && (
            <FormGrid>
              <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="New item name" />
              <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>{db.categories.map((c) => <option key={c}>{c}</option>)}</select>
              <select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}><option>Individual</option><option>Group</option></select>
              <LevelSelect value={newItem.level} onChange={(level) => setNewItem({ ...newItem, level })} levels={levels} />
            </FormGrid>
          )}
          <button onClick={() => setShowCategoryDialog(true)}>Add Category</button>
        </div>
      )}
      {showCategoryDialog && <CategoryMiniDialog addCategory={addCategory} close={() => setShowCategoryDialog(false)} />}
      <ModalActions close={close} submit={submit} label={isEdit ? 'Save Student' : 'Add Student'} />
    </Modal>
  );
}

function ItemModal({ data, db, save, close, addCategory, levels }) {
  const [form, setForm] = useState(data || { name: '', category: db.categories[0] || 'Arts', type: 'Individual', level: 'School Level' });
  const [itemChoice, setItemChoice] = useState(data?.id || '__new__');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const chooseItem = (value) => {
    setItemChoice(value);
    if (value === '__new__') {
      setForm({ name: '', category: db.categories[0] || 'Arts', type: 'Individual', level: 'School Level' });
      return;
    }
    const existing = db.items.find((i) => i.id === value);
    if (existing) setForm({ ...existing });
  };
  const submit = () => {
    if (!form.name.trim()) return;
    const item = { ...form, id: form.id || uid() };
    const exists = db.items.some((i) => i.id === item.id);
    save({ ...db, items: exists ? db.items.map((i) => (i.id === item.id ? item : i)) : [...db.items, item] });
    close();
  };
  return (
    <Modal title={data ? 'Edit Item' : 'Add Competition Item'} close={close}>
      <FormGrid>
        <select value={itemChoice} onChange={(e) => chooseItem(e.target.value)}>
          <option value="__new__">New item</option>
          {db.items.map((i) => <option key={i.id} value={i.id}>{i.name} - {i.category}</option>)}
        </select>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{db.categories.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Individual</option><option>Group</option></select>
        <LevelSelect value={form.level} onChange={(level) => setForm({ ...form, level })} levels={levels} />
      </FormGrid>
      <button onClick={() => setShowCategoryDialog(true)}>Add Category</button>
      {showCategoryDialog && <CategoryMiniDialog addCategory={addCategory} close={() => setShowCategoryDialog(false)} />}
      <ModalActions close={close} submit={submit} label="Save Item" />
    </Modal>
  );
}

function ParticipationModal({ data, db, save, close, levels }) {
  const [form, setForm] = useState(data || { studentId: db.students[0]?.id || '', itemId: db.items[0]?.id || '', currentLevel: 'School Level', nextCompetitionDate: '', ended: false, results: {} });
  const submit = () => {
    if (!form.studentId || !form.itemId) return;
    const item = db.items.find((i) => i.id === form.itemId);
    const currentLevel = Object.prototype.hasOwnProperty.call(form, 'currentLevel') ? normalizeLevel(form.currentLevel) : normalizeLevel(item?.level || 'School Level');
    const participation = { ...form, id: form.id || uid(), currentLevel };
    const next = {
      ...db,
      participations: data ? db.participations.map((p) => (p.id === participation.id ? participation : p)) : [...db.participations, participation]
    };
    if (item?.type === 'Group' && !next.groupMembers.some((m) => m.itemId === item.id && m.studentId === form.studentId)) {
      next.groupMembers.push({ id: uid(), itemId: item.id, studentId: form.studentId });
    }
    save(next);
    close();
  };
  return (
    <Modal title={data ? 'Edit Participation' : 'Add Participation'} close={close}>
      <FormGrid>
        <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{db.students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}</select>
        <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>{db.items.map((i) => <option key={i.id} value={i.id}>{i.name} - {i.type}</option>)}</select>
        <LevelSelect value={form.currentLevel} onChange={(currentLevel) => setForm({ ...form, currentLevel })} levels={levels} />
        <label className="date-field"><span>Next competition date</span><input type="date" value={form.nextCompetitionDate || ''} onChange={(e) => setForm({ ...form, nextCompetitionDate: e.target.value })} /></label>
      </FormGrid>
      <ModalActions close={close} submit={submit} label="Save Participation" />
    </Modal>
  );
}

function ResultModal({ participation, level, db, save, close }) {
  const existing = participation.results?.[level] || { position: '', grade: '', graceMarks: 0, remarks: '', date: today() };
  const [form, setForm] = useState(existing);
  const submit = () => {
    save({
      ...db,
      participations: db.participations.map((p) =>
        p.id === participation.id ? { ...p, results: { ...(p.results || {}), [level]: { ...form, graceMarks: Number(form.graceMarks || 0) } } } : p
      )
    });
    close();
  };
  return (
    <Modal title={`Result - ${formatLevel(level)}`} close={close}>
      <FormGrid>
        <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Position secured" />
        <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Grade / result" />
        <input type="number" value={form.graceMarks} onChange={(e) => setForm({ ...form, graceMarks: e.target.value })} placeholder="Grace marks" />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Remarks" />
      </FormGrid>
      <ModalActions close={close} submit={submit} label="Save Result" />
    </Modal>
  );
}

function GroupResultModal({ participations, item, db, save, close, levels }) {
  const defaultLevel = Object.prototype.hasOwnProperty.call(participations[0] || {}, 'currentLevel') ? normalizeLevel(participations[0]?.currentLevel) : normalizeLevel(item.level || 'School Level');
  const [level, setLevel] = useState(defaultLevel);
  const existing = participations[0]?.results?.[defaultLevel] || { position: '', grade: '', graceMarks: 0, remarks: '', date: today() };
  const [form, setForm] = useState(existing);
  const submit = () => {
    const ids = new Set(participations.map((p) => p.id));
    save({
      ...db,
      participations: db.participations.map((p) =>
        ids.has(p.id)
          ? { ...p, results: { ...(p.results || {}), [level]: { ...form, graceMarks: Number(form.graceMarks || 0) } } }
          : p
      )
    });
    close();
  };
  return (
    <Modal title={`Group Result - ${item.name}`} close={close}>
      <FormGrid>
        <LevelSelect value={level} onChange={setLevel} levels={levels} />
        <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Position secured" />
        <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Grade / result" />
        <input type="number" value={form.graceMarks} onChange={(e) => setForm({ ...form, graceMarks: e.target.value })} placeholder="Grace marks" />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Remarks for all group members" />
      </FormGrid>
      <ModalActions close={close} submit={submit} label="Save Group Result" />
    </Modal>
  );
}

function CategoryMiniDialog({ addCategory, close }) {
  const [name, setName] = useState('');
  const submit = () => {
    if (addCategory(name)) close();
  };
  return (
    <div className="sub-dialog">
      <div className="sub-dialog-head">
        <strong>Add Category</strong>
        <button className="icon" onClick={close}><X size={16} /></button>
      </div>
      <div className="inline-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
        <button className="primary" onClick={submit}>Add</button>
      </div>
    </div>
  );
}

function ResetConfirmModal({ resetAll, close }) {
  const confirm = () => {
    resetAll();
    close();
  };
  return (
    <Modal title="Reset App Data" close={close}>
      <p className="modal-copy">This will remove all students, items, categories, participations, group members, and photos. Arts and Sports will remain as default categories.</p>
      <div className="modal-actions">
        <button onClick={close}>Cancel</button>
        <button className="danger solid" onClick={confirm}><RefreshCw size={16} /> Reset Data</button>
      </div>
    </Modal>
  );
}

function CollageControls({ db, levels, collageFilter, setCollageFilter, downloadCollageImage, downloadCollagePdf }) {
  const classes = [...new Set(db.students.map((s) => s.className).filter(Boolean))].sort();
  const divisions = [...new Set(db.students
    .filter((s) => collageFilter.className === 'All' || s.className === collageFilter.className)
    .map((s) => s.division)
    .filter(Boolean))]
    .sort();
  return (
    <div className="collage-controls">
      <select value={collageFilter.level} onChange={(e) => setCollageFilter({ ...collageFilter, level: e.target.value })}>
        <option>Entire list</option>
        {levels.map((l) => <option key={l || '__blank__'} value={l}>{formatLevel(l)}</option>)}
      </select>
      <select value={collageFilter.category} onChange={(e) => setCollageFilter({ ...collageFilter, category: e.target.value })}>
        <option>All</option>
        {db.categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select value={collageFilter.className} onChange={(e) => setCollageFilter({ ...collageFilter, className: e.target.value, division: 'All' })}>
        <option>All</option>
        {classes.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select value={collageFilter.division} onChange={(e) => setCollageFilter({ ...collageFilter, division: e.target.value })}>
        <option>All</option>
        {divisions.map((d) => <option key={d}>{d}</option>)}
      </select>
      <select value={collageFilter.columns} onChange={(e) => setCollageFilter({ ...collageFilter, columns: Number(e.target.value) })}>
        <option value="1">1 column</option>
        <option value="2">2 columns</option>
        <option value="3">3 columns</option>
        <option value="4">4 columns</option>
        <option value="5">5 columns</option>
      </select>
      <button onClick={downloadCollageImage}><FileImage size={16} /> Download Image</button>
      <button onClick={downloadCollagePdf}><FileText size={16} /> Download PDF</button>
    </div>
  );
}

function CollageDetailsPanel({ collageFilter, setCollageFilter }) {
  const details = collageFilter.details || {};
  const setDetail = (key) => {
    setCollageFilter({
      ...collageFilter,
      details: { ...details, [key]: !details[key] }
    });
  };
  const options = [
    ['photo', 'Photo'],
    ['name', 'Name'],
    ['classDivision', 'Class and division'],
    ['admissionNo', 'Admission number'],
    ['gender', 'Gender'],
    ['schoolName', 'School name'],
    ['item', 'Item'],
    ['category', 'Category'],
    ['type', 'Type'],
    ['currentLevel', 'Current level'],
    ['result', 'Result']
  ];
  return (
    <aside className="collage-details-panel">
      <h2>Details in Collage</h2>
      {options.map(([key, label]) => (
        <label className="check-row" key={key}>
          <input type="checkbox" checked={Boolean(details[key])} onChange={() => setDetail(key)} />
          <span>{label}</span>
        </label>
      ))}
    </aside>
  );
}

function CollageSheet({ entries, columns = 3, details = {} }) {
  return (
    <div className="collage-sheet" style={{ '--collage-columns': columns }}>
      {entries.map(({ student, item, level, result }, index) => {
        const resultText = [formatPosition(result.position), formatGrade(result.grade)].filter(Boolean).join(' | ');
        return (
          <article className="collage-card" key={`${student.id}-${item?.id || 'student'}-${level}-${index}`}>
            {details.photo && <img src={student.photo || blankPhoto} alt="" />}
            <div>
              {details.name && <strong>{student.name}</strong>}
              {details.classDivision && classDivision(student) && <span>{classDivision(student)}</span>}
              {details.admissionNo && student.admissionNo && <span>Adm No: {student.admissionNo}</span>}
              {details.gender && student.gender && <span>{student.gender}</span>}
              {details.schoolName && student.schoolName && <span>{student.schoolName}</span>}
              {details.item && item?.name && <span>{item.name}</span>}
              {details.category && item?.category && <span>{item.category}</span>}
              {details.type && item?.type && <span>{item.type}</span>}
              {details.currentLevel && <span>{formatLevel(level)}</span>}
              {details.result && resultText && <b>{resultText}</b>}
            </div>
          </article>
        );
      })}
      {!entries.length && <div className="empty">No collage entries match this filter.</div>}
    </div>
  );
}

function FilterBar({ db, filters, setFilters, query, setQuery, compact, levels }) {
  const classes = [...new Set(db.students.map((s) => s.className).filter(Boolean))].sort();
  return (
    <section className={`filters ${compact ? 'compact' : ''}`}>
      {!compact && <SearchBox query={query} setQuery={setQuery} placeholder="Search student name, class, item..." />}
      <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}><option>All</option>{levels.map((l) => <option key={l || '__blank__'} value={l}>{formatLevel(l)}</option>)}</select>
      <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option>All</option>{db.categories.map((c) => <option key={c}>{c}</option>)}</select>
      <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option>All</option><option>Individual</option><option>Group</option></select>
      <select value={filters.className} onChange={(e) => setFilters({ ...filters, className: e.target.value })}><option>All</option>{classes.map((c) => <option key={c}>{c}</option>)}</select>
      <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option>All</option><option>Not Ended</option><option>Ended</option></select>
    </section>
  );
}

function LevelSelect({ value, onChange, levels }) {
  return (
    <select value={normalizeLevel(value)} onChange={(e) => onChange(e.target.value)}>
      {levels.map((level) => <option key={level || '__blank__'} value={level}>{formatLevel(level)}</option>)}
    </select>
  );
}

function SortableHeader({ label, active, direction, onClick }) {
  return (
    <th aria-sort={active ? (direction === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-header" onClick={onClick} title={`Sort by ${label}`}>
        <span>{label}</span>
        {active ? (direction === 1 ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
      </button>
    </th>
  );
}

function sortRows(rows, sortIndex, sortDirection, sortValue) {
  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((left, right) => {
      const a = sortValue(left.row, sortIndex);
      const b = sortValue(right.row, sortIndex);
      const aEmpty = a === '' || a === null || a === undefined;
      const bEmpty = b === '' || b === null || b === undefined;
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      if (aEmpty && bEmpty) return left.originalIndex - right.originalIndex;

      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      return comparison === 0 ? left.originalIndex - right.originalIndex : comparison * sortDirection;
    })
    .map(({ row }) => row);
}

function PagedTable({ rows, columns, render, sortValue = (row) => JSON.stringify(row), allowPageSize = false }) {
  const [page, setPage] = useState(1);
  const [sortIndex, setSortIndex] = useState(0);
  const [sortDirection, setSortDirection] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const sorted = sortRows(rows, sortIndex, sortDirection, sortValue);
  const total = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, total);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const sortBy = (column) => {
    setPage(1);
    if (sortIndex === column) setSortDirection((direction) => direction * -1);
    else {
      setSortIndex(column);
      setSortDirection(1);
    }
  };
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((column, index) => (
            <SortableHeader
              key={column}
              label={column}
              active={sortIndex === index}
              direction={sortDirection}
              onClick={() => sortBy(index)}
            />
          ))}</tr></thead>
          <tbody>{visible.map(render)}</tbody>
        </table>
      </div>
      <div className="pagination">
        {allowPageSize && (
          <label className="page-size">Entries
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
        )}
        <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <span>Page {currentPage} of {total}</span>
        <button disabled={currentPage === total} onClick={() => setPage(currentPage + 1)}>Next</button>
      </div>
    </>
  );
}

function Modal({ title, close, children, wide }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head"><h2>{title}</h2><button className="icon" onClick={close}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ close, submit, label }) {
  return <div className="modal-actions"><button onClick={close}>Cancel</button><button className="primary" onClick={submit}>{label}</button></div>;
}

function FormGrid({ children }) {
  return <div className="form-grid">{children}</div>;
}

function Person({ student, small }) {
  if (!student) return null;
  return <div className={`person ${small ? 'small' : ''}`}><img src={student.photo || blankPhoto} alt="" /><span><strong>{student.name}</strong><em>{classDivision(student)}</em></span></div>;
}

function SearchBox({ query, setQuery, placeholder }) {
  return <label className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} /></label>;
}

function filterStudents(students, query) {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter((s) => `${s.name} ${s.admissionNo} ${s.className} ${s.division} ${s.schoolName}`.toLowerCase().includes(q));
}

function formatResult(result) {
  if (!result || (!result.position && !result.grade && !result.graceMarks)) return 'No result';
  return [formatPosition(result.position), formatGrade(result.grade), result.graceMarks ? `${result.graceMarks} grace` : ''].filter(Boolean).join(' | ');
}

function formatCompetitionDate(value) {
  if (!value) return 'Set date';
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

function classDivision(student) {
  return [student.className, student.division].filter(Boolean).join(' ');
}

function normalizeLevel(level) {
  return String(level ?? '').trim();
}

function uniqueLevels(levels) {
  const seen = new Set();
  return levels
    .map(normalizeLevel)
    .filter(Boolean)
    .filter((level) => {
      const key = level.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function levelRank(level, levels = DEFAULT_LEVELS) {
  const selectableLevels = ['', ...levels];
  const index = selectableLevels.indexOf(normalizeLevel(level));
  return index === -1 ? Math.max(1, selectableLevels.indexOf('School Level')) : index;
}

function formatLevel(level) {
  return normalizeLevel(level) || 'Blank Current Level';
}

function rewriteLevel(db, oldLevel, nextLevel, levels, deleteResults = false) {
  const oldName = normalizeLevel(oldLevel);
  const newName = normalizeLevel(nextLevel);
  return {
    ...db,
    levels: uniqueLevels(levels),
    items: db.items.map((item) => (normalizeLevel(item.level) === oldName ? { ...item, level: newName } : item)),
    participations: db.participations.map((p) => {
      const results = {};
      Object.entries(p.results || {}).forEach(([level, result]) => {
        const key = normalizeLevel(level);
        if (key === oldName) {
          if (!deleteResults && newName) results[newName] = result;
        } else {
          results[key] = result;
        }
      });
      return {
        ...p,
        currentLevel: normalizeLevel(p.currentLevel) === oldName ? newName : p.currentLevel,
        results
      };
    })
  };
}

function formatPosition(position) {
  if (!position) return '';
  const text = String(position).trim();
  const number = Number(text);
  if (!Number.isFinite(number)) return `${text} Position`;
  const mod100 = number % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] || 'th';
  return `${number}${suffix} Position`;
}

function formatGrade(grade) {
  if (!grade) return '';
  return `${String(grade).trim()} Grade`;
}

function compareResult(a = {}, b = {}) {
  const posA = Number(a.position || 999);
  const posB = Number(b.position || 999);
  if (posA !== posB) return posA - posB;
  return String(a.grade || 'Z').localeCompare(String(b.grade || 'Z'));
}

function readPhoto(file, cb) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

async function readClipboardPhoto() {
  if (!navigator.clipboard?.read) return '';
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'));
    if (imageType) {
      const blob = await item.getType(imageType);
      return await blobToDataUrl(blob);
    }
  }
  return '';
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quote = !quote;
    } else if (ch === ',' && !quote) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

createRoot(document.getElementById('root')).render(<App />);
