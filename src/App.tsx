import React, { useState, useEffect } from 'react';
import {
  MonthlyRecord,
  UserProfile,
  NotificationSettings,
  NotificationLog,
} from './types';
import {
  INITIAL_MONTHLY_RECORD,
  INITIAL_USERS,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_NOTIFICATION_LOGS,
} from './data/initialRightsData';
import { SangkhlaburiLogo } from './components/SangkhlaburiLogo';
import { DashboardView } from './components/DashboardView';
import { DebtorLedgerView } from './components/DebtorLedgerView';
import { OfficialReportView } from './components/OfficialReportView';
import { NotificationSystemView } from './components/NotificationSystemView';
import { RBACManagementView } from './components/RBACManagementView';
import { ReconciliationView } from './components/ReconciliationView';
import { AuthModal } from './components/AuthModal';
import {
  saveRecordToFirestore,
  subscribeToRecord,
  loadRecordFromFirestore,
  syncUserProfileToFirestore,
  loadUsersFromFirestore,
  getUserProfileFromFirestore,
  logoutUser,
  auth,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  LayoutDashboard,
  TableProperties,
  Printer,
  Bell,
  Users,
  GitCompare,
  Moon,
  Sun,
  Flame,
  Menu,
  X,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  LogIn,
  UserCheck,
  LogOut,
  UserPlus,
  Database,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LEDGER' | 'REPORT' | 'NOTIFICATIONS' | 'RBAC' | 'RECONCILE'>('DASHBOARD');
  const [ledgerInitialFilter, setLedgerInitialFilter] = useState<'ALL' | 'GOV' | 'EXT' | 'OVERDUE'>('ALL');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const openAuthModal = (tab: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('skb_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode class to html document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('skb_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Master State (with localStorage persistence)
  const [record, setRecord] = useState<MonthlyRecord>(() => {
    const saved = localStorage.getItem('skb_monthly_record');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MONTHLY_RECORD;
      }
    }
    return INITIAL_MONTHLY_RECORD;
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('skb_users');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        // ลบผู้ใช้งานทดสอบออก (usr-1, usr-2, usr-3, usr-4 หรือ username ลงท้ายด้วย _skb)
        const cleaned = parsed.filter(
          (u) =>
            !['usr-1', 'usr-2', 'usr-3', 'usr-4'].includes(u.id) &&
            !u.username?.endsWith('_skb') &&
            !u.id?.startsWith('usr-1') &&
            !u.id?.startsWith('usr-2') &&
            !u.id?.startsWith('usr-3') &&
            !u.id?.startsWith('usr-4')
        );
        localStorage.setItem('skb_users', JSON.stringify(cleaned));
        return cleaned;
      } catch {
        return [];
      }
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const savedId = localStorage.getItem('skb_current_user_id');
    if (['usr-1', 'usr-2', 'usr-3', 'usr-4'].includes(savedId || '')) {
      localStorage.removeItem('skb_current_user_id');
      return null;
    }
    const savedUsers = localStorage.getItem('skb_users');
    if (savedUsers) {
      try {
        const parsed: UserProfile[] = JSON.parse(savedUsers);
        const matched = parsed.find(
          (u) => u.id === savedId && !['usr-1', 'usr-2', 'usr-3', 'usr-4'].includes(u.id)
        );
        if (matched) return matched;
      } catch {}
    }
    return null;
  });

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('skb_notif_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATION_SETTINGS;
      }
    }
    return INITIAL_NOTIFICATION_SETTINGS;
  });

  const [notifLogs, setNotifLogs] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('skb_notif_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATION_LOGS;
      }
    }
    return INITIAL_NOTIFICATION_LOGS;
  });

  // Save changes to localStorage and Firestore
  const handleUpdateRecord = (updatedRecord: MonthlyRecord) => {
    setRecord(updatedRecord);
    localStorage.setItem('skb_monthly_record', JSON.stringify(updatedRecord));
    // Asynchronously sync to Cloud Firestore
    saveRecordToFirestore(updatedRecord);
  };

  useEffect(() => {
    // Initial fetch from Cloud Firestore or seed if not exists
    loadRecordFromFirestore(record.id).then((cloudRecord) => {
      if (cloudRecord && cloudRecord.items && cloudRecord.items.length > 0) {
        setRecord(cloudRecord);
        localStorage.setItem('skb_monthly_record', JSON.stringify(cloudRecord));
      } else {
        saveRecordToFirestore(record);
      }
    }).catch(() => {
      // Fallback seamlessly to local cache
    });

    const unsub = subscribeToRecord(record.id, (cloudRecord) => {
      if (cloudRecord && cloudRecord.items) {
        setRecord(cloudRecord);
        localStorage.setItem('skb_monthly_record', JSON.stringify(cloudRecord));
      }
    });

    // Sync registered staff accounts from Cloud Firestore
    loadUsersFromFirestore().then((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        // Exclude mock test users
        const validUsers = cloudUsers.filter(
          (u) =>
            !['usr-1', 'usr-2', 'usr-3', 'usr-4'].includes(u.id) &&
            !u.username?.endsWith('_skb') &&
            !u.id?.startsWith('usr-1') &&
            !u.id?.startsWith('usr-2') &&
            !u.id?.startsWith('usr-3') &&
            !u.id?.startsWith('usr-4')
        );
        setUsers((prev) => {
          const map = new Map<string, UserProfile>();
          prev.forEach((u) => {
            if (!['usr-1', 'usr-2', 'usr-3', 'usr-4'].includes(u.id)) {
              map.set(u.id, u);
            }
          });
          validUsers.forEach((u) => map.set(u.id, u));
          const merged = Array.from(map.values());
          localStorage.setItem('skb_users', JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(() => {});

    // Listen to Firebase Authentication state for session persistence
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfileFromFirestore(fbUser.uid);
        if (profile) {
          setCurrentUser(profile);
          localStorage.setItem('skb_current_user_id', profile.id);
        }
      }
    });

    return () => {
      if (unsub) unsub();
      unsubAuth();
    };
  }, [record.id]);

  const handleUpdateUsers = (updatedUsers: UserProfile[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('skb_users', JSON.stringify(updatedUsers));
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('skb_current_user_id', user.id);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    localStorage.removeItem('skb_current_user_id');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('skb_current_user_id', user.id);
    const exists = users.find((u) => u.id === user.id);
    if (!exists) {
      const updated = [...users, user];
      setUsers(updated);
      localStorage.setItem('skb_users', JSON.stringify(updated));
    }
    syncUserProfileToFirestore(user);
  };

  const handleUpdateNotifSettings = (newSettings: NotificationSettings) => {
    setNotifSettings(newSettings);
    localStorage.setItem('skb_notif_settings', JSON.stringify(newSettings));
  };

  const handleAddNotifLog = (newLog: NotificationLog) => {
    const updated = [newLog, ...notifLogs];
    setNotifLogs(updated);
    localStorage.setItem('skb_notif_logs', JSON.stringify(updated));
  };

  const handleResetToOfficial = () => {
    setRecord(INITIAL_MONTHLY_RECORD);
    localStorage.setItem('skb_monthly_record', JSON.stringify(INITIAL_MONTHLY_RECORD));
  };

  const handleResetDatabase = () => {
    setRecord(INITIAL_MONTHLY_RECORD);
    setUsers([]);
    setCurrentUser(null);
    setNotifSettings(INITIAL_NOTIFICATION_SETTINGS);
    setNotifLogs(INITIAL_NOTIFICATION_LOGS);
    localStorage.removeItem('skb_monthly_record');
    localStorage.removeItem('skb_users');
    localStorage.removeItem('skb_current_user_id');
    localStorage.removeItem('skb_notif_settings');
    localStorage.removeItem('skb_notif_logs');
  };

  // Check overdue count > 30 days
  const overdueCount = record.items.filter((i) => i.daysOverdue > 30 && i.endingBalance > 0).length;

  const navigateToLedgerWithFilter = (filterMode?: 'OVERDUE' | 'ALL' | 'GOV' | 'EXT') => {
    if (filterMode) {
      setLedgerInitialFilter(filterMode);
    }
    setActiveTab('LEDGER');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Bar Contract: 3 Zones */}
      <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <SangkhlaburiLogo size={36} className="w-9 h-9" />
              <div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('DASHBOARD');
                  }}
                  className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <span>รพ.สังขละบุรี</span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs">SKB Management</span>
                </a>
                <span className="text-[10px] text-slate-500 block leading-none">
                  ระบบสารสนเทศบริหารจัดการทะเบียนคุมลูกหนี้ 52 สิทธิ์
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'DASHBOARD'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              แดชบอร์ดภาพรวม
            </button>

            <button
              onClick={() => {
                setLedgerInitialFilter('ALL');
                setActiveTab('LEDGER');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'LEDGER'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              ทะเบียนคุม 52 สิทธิ์
              {overdueCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('REPORT')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'REPORT'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              รายงานราชการเสนอผู้บริหาร
            </button>

            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              ระบบแจ้งเตือน SMS/Email
            </button>

            <button
              onClick={() => setActiveTab('RBAC')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'RBAC'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              จัดการสิทธิ์ผู้ใช้ (RBAC)
            </button>

            <button
              onClick={() => setActiveTab('RECONCILE')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'RECONCILE'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              เปรียบเทียบข้อมูล HIS
            </button>
          </nav>

          {/* Zone 3: Primary Actions (Dark mode toggle & User Profile) */}
          <div className="flex items-center gap-2.5 shrink-0">

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-2xs"
              title={darkMode ? 'ปิดโหมดถนอมสายตา (สลับเป็นโหมดสว่าง)' : 'เปิดโหมดถนอมสายตา (สลับเป็นโหมดมืด)'}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">โหมดสว่าง</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">โหมดถนอมสายตา</span>
                </>
              )}
            </button>

            {/* User Profile & Auth Trigger */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-750 text-xs text-left">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 shadow-2xs">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block line-clamp-1 max-w-[120px]">
                          {currentUser.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          {currentUser.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block line-clamp-1">
                        {currentUser.roleTitleTh}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="ออกจากระบบ"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAuthModal('LOGIN')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="เข้าสู่ระบบ"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>เข้าสู่ระบบ</span>
                  </button>

                  <button
                    onClick={() => openAuthModal('REGISTER')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="สมัครสมาชิกใหม่"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>สมัครสมาชิกใหม่</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden px-4 pt-2 pb-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 text-xs">
            <button
              onClick={() => {
                setActiveTab('DASHBOARD');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              แดชบอร์ดภาพรวม
            </button>
            <button
              onClick={() => {
                setLedgerInitialFilter('ALL');
                setActiveTab('LEDGER');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <TableProperties className="w-4 h-4 text-emerald-600" />
              ทะเบียนคุม 52 สิทธิ์
            </button>
            <button
              onClick={() => {
                setActiveTab('REPORT');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              รายงานราชการเสนอผู้บริหาร
            </button>
            <button
              onClick={() => {
                setActiveTab('NOTIFICATIONS');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Bell className="w-4 h-4 text-emerald-600" />
              ระบบแจ้งเตือน SMS/Email
            </button>
            <button
              onClick={() => {
                setActiveTab('RBAC');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              จัดการสิทธิ์ผู้ใช้ (RBAC)
            </button>
            <button
              onClick={() => {
                setActiveTab('RECONCILE');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4 text-emerald-600" />
              เปรียบเทียบข้อมูล HIS
            </button>

            {/* Mobile Auth Buttons */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="px-1 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>ผู้ใช้งาน: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong></span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      {currentUser.roleTitleTh}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2 px-3 rounded-lg font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      openAuthModal('LOGIN');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2 px-2.5 rounded-lg font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 text-xs shadow-2xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    เข้าสู่ระบบ
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('REGISTER');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2 px-2.5 rounded-lg font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 text-xs shadow-2xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    สมัครสมาชิก
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Dark Mode Toggle */}
            <div className="pt-1">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-full text-left px-3 py-2 rounded-lg font-medium bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
                  <span>โหมดถนอมสายตา (Dark Mode)</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {darkMode ? 'เปิดอยู่ (มืด)' : 'ปิดอยู่ (สว่าง)'}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'DASHBOARD' && (
          <DashboardView
            record={record}
            onNavigateToLedger={navigateToLedgerWithFilter}
            onNavigateToReport={() => setActiveTab('REPORT')}
          />
        )}

        {activeTab === 'LEDGER' && (
          <DebtorLedgerView
            record={record}
            currentUser={currentUser}
            initialFilter={ledgerInitialFilter}
            onUpdateRecord={handleUpdateRecord}
            onResetToOfficial={handleResetToOfficial}
          />
        )}

        {activeTab === 'REPORT' && (
          <OfficialReportView
            record={record}
            currentUser={currentUser}
            onUpdateRecord={handleUpdateRecord}
          />
        )}

        {activeTab === 'NOTIFICATIONS' && (
          <NotificationSystemView
            record={record}
            currentUser={currentUser}
            settings={notifSettings}
            logs={notifLogs}
            onUpdateSettings={handleUpdateNotifSettings}
            onAddLog={handleAddNotifLog}
          />
        )}

        {activeTab === 'RBAC' && (
          <RBACManagementView
            users={users}
            currentUser={currentUser}
            record={record}
            onSwitchUser={handleSwitchUser}
            onUpdateUsers={handleUpdateUsers}
            onRestoreRecord={handleUpdateRecord}
            onResetDatabase={handleResetDatabase}
            onOpenRegisterModal={() => openAuthModal('REGISTER')}
          />
        )}

        {activeTab === 'RECONCILE' && (
          <ReconciliationView
            record={record}
            onUpdateRecord={handleUpdateRecord}
          />
        )}
      </main>

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        currentUser={currentUser}
        initialTab={authModalTab}
      />

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-slate-200 dark:border-slate-800 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SangkhlaburiLogo size={20} className="w-5 h-5 inline" />
            <span>กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศทางการแพทย์ โรงพยาบาลสังขละบุรี</span>
          </div>
          <div>
            <span>ระบบสารสนเทศบริหารจัดการทะเบียนคุมลูกหนี้ (SKB Management System)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
