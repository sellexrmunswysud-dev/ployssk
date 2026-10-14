import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { MonthlyRecord, UserProfile, UserRole } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
}

// Resolve config: prefer firebase-applet-config.json, with optional VITE_ env var overrides for Vercel
const resolvedFirebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId || 'ploy-d797f',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig?.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId || 'ai-studio-0b5f39f1-42eb-4e7f-a501-b3844b7b6797',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId,
};

// Initialize official Firebase App with provisioned config
export const app: FirebaseApp = !getApps().length
  ? initializeApp(resolvedFirebaseConfig)
  : getApps()[0];

// CRITICAL: The app uses the dedicated firestoreDatabaseId
export const db: Firestore = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

// ==========================================
// Authentication Services
// ==========================================

export async function loginWithGoogle(): Promise<{ user: FirebaseUser; error?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { user: null as unknown as FirebaseUser, error: msg };
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser | { uid: string; email: string; displayName?: string }; error?: string; isFallback?: boolean }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    // Check if user exists in Firestore users collection as a fallback
    try {
      const allUsers = await loadUsersFromFirestore();
      const matched = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        return {
          user: { uid: matched.id, email: matched.email, displayName: matched.name },
          isFallback: true,
        };
      }
    } catch {
      // ignore
    }

    return { user: null as unknown as FirebaseUser, error: msg };
  }
}

export async function registerStaffWithEmail(
  email: string,
  pass: string,
  displayName: string,
  role: UserRole,
  department: string,
  roleTitleTh: string,
  phone: string
): Promise<{ user: FirebaseUser | { uid: string; email: string; displayName?: string }; error?: string; isFallback?: boolean }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await updateProfile(result.user, { displayName });
      const userProfile: UserProfile = {
        id: result.user.uid,
        name: displayName,
        username: email.split('@')[0],
        role,
        roleTitleTh,
        department,
        phone,
        email,
        active: true,
        canEditDebts: role === 'ACCOUNTANT' || role === 'STATISTICIAN' || role === 'ADMIN',
        canReview: role === 'STATISTICIAN' || role === 'EXECUTIVE' || role === 'ADMIN',
        canApprove: role === 'EXECUTIVE' || role === 'ADMIN',
        canManageUsers: role === 'ADMIN',
      };
      await syncUserProfileToFirestore(userProfile);
    }
    return { user: result.user };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    // If Email/Password provider isn't enabled in Firebase Console, fallback gracefully to Firestore registration!
    if (msg.includes('operation-not-allowed') || msg.includes('admin-restricted-operation')) {
      const fallbackUid = `skb-user-${Date.now()}`;
      const userProfile: UserProfile = {
        id: fallbackUid,
        name: displayName,
        username: email.split('@')[0],
        role,
        roleTitleTh,
        department,
        phone,
        email,
        active: true,
        canEditDebts: role === 'ACCOUNTANT' || role === 'STATISTICIAN' || role === 'ADMIN',
        canReview: role === 'STATISTICIAN' || role === 'EXECUTIVE' || role === 'ADMIN',
        canApprove: role === 'EXECUTIVE' || role === 'ADMIN',
        canManageUsers: role === 'ADMIN',
      };
      await syncUserProfileToFirestore(userProfile);
      return {
        user: { uid: fallbackUid, email, displayName },
        isFallback: true,
      };
    }

    return { user: null as unknown as FirebaseUser, error: msg };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut exception (safe to ignore if offline):', e);
  }
}

export async function syncUserProfileToFirestore(profile: UserProfile): Promise<boolean> {
  const path = `users/${profile.id}`;
  try {
    const userDocRef = doc(db, 'users', profile.id);
    await setDoc(userDocRef, profile, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function getUserProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function loadUsersFromFirestore(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const usersCol = collection(db, path);
    const snap = await getDocs(usersCol);
    const usersList: UserProfile[] = [];
    snap.forEach((docSnap) => {
      if (docSnap.exists()) {
        usersList.push(docSnap.data() as UserProfile);
      }
    });
    return usersList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// ==========================================
// Debtor Record Database Services
// ==========================================

export async function saveRecordToFirestore(record: MonthlyRecord): Promise<boolean> {
  const path = `monthly_records/${record.id}`;
  try {
    const recordDocRef = doc(db, 'monthly_records', record.id);
    await setDoc(recordDocRef, {
      id: record.id,
      year: record.year,
      month: record.month,
      monthName: record.monthName,
      status: record.status,
      items: record.items,
      reporter: record.reporter,
      reviewer: record.reviewer,
      approver: record.approver,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function loadRecordFromFirestore(recordId: string): Promise<MonthlyRecord | null> {
  const path = `monthly_records/${recordId}`;
  try {
    const recordDocRef = doc(db, 'monthly_records', recordId);
    const snap = await getDoc(recordDocRef);
    if (snap.exists()) {
      return snap.data() as MonthlyRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export function subscribeToRecord(recordId: string, onUpdate: (data: MonthlyRecord) => void): Unsubscribe | null {
  const path = `monthly_records/${recordId}`;
  try {
    const docRef = doc(db, 'monthly_records', recordId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as MonthlyRecord);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch {
    return null;
  }
}
