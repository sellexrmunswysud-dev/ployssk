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
  deleteDoc,
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
import { MonthlyRecord, UserProfile, UserRole, SystemSecuritySettings } from '../types';
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

export const DEFAULT_SECURITY_SETTINGS: SystemSecuritySettings = {
  requireAdminApproval: true,
  allowAutoApproveFirstAdmin: true,
};

export async function loadSecuritySettingsFromFirestore(): Promise<SystemSecuritySettings> {
  const path = 'system/security_settings';
  try {
    const docRef = doc(db, 'system', 'security_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SystemSecuritySettings;
    }
    return DEFAULT_SECURITY_SETTINGS;
  } catch {
    return DEFAULT_SECURITY_SETTINGS;
  }
}

export async function saveSecuritySettingsToFirestore(settings: SystemSecuritySettings): Promise<boolean> {
  const path = 'system/security_settings';
  try {
    const docRef = doc(db, 'system', 'security_settings');
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
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
): Promise<{
  user: FirebaseUser | { uid: string; email: string; displayName?: string };
  profile?: UserProfile;
  isPendingApproval?: boolean;
  error?: string;
  isFallback?: boolean;
}> {
  try {
    // Check security settings and existing users
    const settings = await loadSecuritySettingsFromFirestore();
    const existingUsers = await loadUsersFromFirestore();
    const approvedUsers = existingUsers.filter((u) => u.approvalStatus === 'APPROVED' || (u.active && !u.approvalStatus));

    // First user in clean database becomes auto-approved Admin
    const isFirstUser = approvedUsers.length === 0;
    const shouldRequireApproval = settings.requireAdminApproval && !isFirstUser;

    const assignedRole: UserRole = isFirstUser ? 'ADMIN' : role;
    const assignedRoleTitleTh = isFirstUser ? 'ผู้ดูแลระบบไอที (Super Admin บัญชีหลัก)' : roleTitleTh;

    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await updateProfile(result.user, { displayName });
      const userProfile: UserProfile = {
        id: result.user.uid,
        name: displayName,
        username: email.split('@')[0],
        role: assignedRole,
        roleTitleTh: assignedRoleTitleTh,
        department,
        phone,
        email,
        active: !shouldRequireApproval,
        approvalStatus: shouldRequireApproval ? 'PENDING' : 'APPROVED',
        registeredAt: new Date().toISOString(),
        approvedAt: shouldRequireApproval ? undefined : new Date().toISOString(),
        approvedBy: shouldRequireApproval ? undefined : 'SYSTEM_INIT',
        canEditDebts: assignedRole === 'ACCOUNTANT' || assignedRole === 'STATISTICIAN' || assignedRole === 'ADMIN',
        canReview: assignedRole === 'STATISTICIAN' || assignedRole === 'EXECUTIVE' || assignedRole === 'ADMIN',
        canApprove: assignedRole === 'EXECUTIVE' || assignedRole === 'ADMIN',
        canManageUsers: assignedRole === 'ADMIN',
      };
      await syncUserProfileToFirestore(userProfile);
      return { user: result.user, profile: userProfile, isPendingApproval: shouldRequireApproval };
    }
    return { user: result.user };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    // If Email/Password provider isn't enabled in Firebase Console, fallback gracefully to Firestore registration!
    if (msg.includes('operation-not-allowed') || msg.includes('admin-restricted-operation')) {
      const settings = await loadSecuritySettingsFromFirestore();
      const existingUsers = await loadUsersFromFirestore();
      const approvedUsers = existingUsers.filter((u) => u.approvalStatus === 'APPROVED' || (u.active && !u.approvalStatus));
      const isFirstUser = approvedUsers.length === 0;
      const shouldRequireApproval = settings.requireAdminApproval && !isFirstUser;

      const assignedRole: UserRole = isFirstUser ? 'ADMIN' : role;
      const assignedRoleTitleTh = isFirstUser ? 'ผู้ดูแลระบบไอที (Super Admin บัญชีหลัก)' : roleTitleTh;

      const fallbackUid = `skb-user-${Date.now()}`;
      const userProfile: UserProfile = {
        id: fallbackUid,
        name: displayName,
        username: email.split('@')[0],
        role: assignedRole,
        roleTitleTh: assignedRoleTitleTh,
        department,
        phone,
        email,
        active: !shouldRequireApproval,
        approvalStatus: shouldRequireApproval ? 'PENDING' : 'APPROVED',
        registeredAt: new Date().toISOString(),
        approvedAt: shouldRequireApproval ? undefined : new Date().toISOString(),
        approvedBy: shouldRequireApproval ? undefined : 'SYSTEM_INIT',
        canEditDebts: assignedRole === 'ACCOUNTANT' || assignedRole === 'STATISTICIAN' || assignedRole === 'ADMIN',
        canReview: assignedRole === 'STATISTICIAN' || assignedRole === 'EXECUTIVE' || assignedRole === 'ADMIN',
        canApprove: assignedRole === 'EXECUTIVE' || assignedRole === 'ADMIN',
        canManageUsers: assignedRole === 'ADMIN',
      };
      await syncUserProfileToFirestore(userProfile);
      return {
        user: { uid: fallbackUid, email, displayName },
        profile: userProfile,
        isPendingApproval: shouldRequireApproval,
        isFallback: true,
      };
    }

    return { user: null as unknown as FirebaseUser, error: msg };
  }
}

export async function approveUserInFirestore(
  userId: string,
  approvedBy: string,
  updatedRole?: UserRole
): Promise<boolean> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return false;
    const existing = snap.data() as UserProfile;
    const targetRole = updatedRole || existing.role;
    const updated: UserProfile = {
      ...existing,
      role: targetRole,
      active: true,
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy,
      canEditDebts: targetRole === 'ACCOUNTANT' || targetRole === 'STATISTICIAN' || targetRole === 'ADMIN',
      canReview: targetRole === 'STATISTICIAN' || targetRole === 'EXECUTIVE' || targetRole === 'ADMIN',
      canApprove: targetRole === 'EXECUTIVE' || targetRole === 'ADMIN',
      canManageUsers: targetRole === 'ADMIN',
    };
    await setDoc(userDocRef, updated, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function rejectUserInFirestore(userId: string): Promise<boolean> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { approvalStatus: 'REJECTED', active: false }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
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
