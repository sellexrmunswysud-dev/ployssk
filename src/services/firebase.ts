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
import { getAuth } from 'firebase/auth';
import { MonthlyRecord, UserProfile, NotificationLog } from '../types';
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

/**
 * Save Monthly Debtor Record to Firestore
 */
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

/**
 * Load Monthly Record from Firestore
 */
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

/**
 * Subscribe to real-time changes
 */
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
