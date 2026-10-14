import React, { useState, useEffect } from 'react';
import {
  MonthlyRecord,
  UserProfile,
  NotificationSettings,
  NotificationLog,
  SystemSecuritySettings,
} from './types';
import {
  INITIAL_MONTHLY_RECORD,
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
import { LoginPortal } from './components/LoginPortal';
import {
  saveRecordToFirestore,
  subscribeToRecord,
  loadRecordFromFirestore,
  syncUserProfileToFirestore,
  loadUsersFromFirestore,
  getUserProfileFromFirestore,
  loadSecuritySettingsFromFirestore,
  DEFAULT_SECURITY_SETTINGS,
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
  Calendar,
  LogOut,
  UserPlus,
  Clock,
  ChevronRight,
  Database,
  Building,
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
        // ลบผู้ใช้งานทดสอบออก
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

  // Security Policy Settings
  const [securitySettings, setSecuritySettings] = useState<SystemSecuritySettings>(DEFAULT_SECURITY_SETTINGS);

  // State to check session before rendering web app
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    return !!localStorage.getItem('skb_current_user_id');
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
    saveRecordToFirestore(updatedRecord);
  };

  useEffect(() => {
    // Load security settings
    loadSecuritySettingsFromFirestore().then((settings) => {
      if (settings) {
        setSecuritySettings(settings);
      }
    }).catch(() => {});

    // Initial fetch from Cloud Firestore or seed if not exists
    loadRecordFromFirestore(record.id).then((cloudRecord) => {
      if (cloudRecord && cloudRecord.items && cloudRecord.items.length > 0) {
        setRecord(cloudRecord);
        localStorage.setItem('skb_monthly_record', JSON.stringify(cloudRecord));
      } else {
        saveRecordToFirestore(record);
      }
    }).catch(() => {});

    const unsub = subscribeToRecord(record.id, (cloudRecord) => {
      if (cloudRecord && cloudRecord.items) {
        setRecord(cloudRecord);
        localStorage.setItem('skb_monthly_record', JSON.stringify(cloudRecord));
      }
    });

    // Sync registered staff accounts from Cloud Firestore
    loadUsersFromFirestore().then((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
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
      try {
        if (fbUser) {
          const profile = await getUserProfileFromFirestore(fbUser.uid);
          if (profile) {
            // Check if approved
            if (profile.approvalStatus === 'APPROVED' || (profile.active && !profile.approvalStatus)) {
              setCurrentUser(profile);
              localStorage.setItem('skb_current_user_id', profile.id);
            }
          }
        }
      } catch (e) {
        console.warn('Auth state sync notice:', e);
      } finally {
        setIsAuthChecking(false);
      }
    });

    const fallbackTimer = setTimeout(() => {
      setIsAuthChecking(false);
    }, 800);

    return () => {
      if (unsub) unsub();
      unsubAuth();
      clearTimeout(fallbackTimer);
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

  // Pending user registrations count
  const pendingUsersCount = users.filter(
    (u) =>
      u.approvalStatus === 'PENDING' ||
      (!u.active && u.approvalStatus !== 'REJECTED' && u.approvalStatus !== 'APPROVED')
  ).length;

  const navigateToLedgerWithFilter = (filterMode?: 'OVERDUE' | 'ALL' | 'GOV' | 'EXT') => {
    if (filterMode) {
      setLedgerInitialFilter(filterMode);
    }
    setActiveTab('LEDGER');
  };

  // 1. Session verification loading screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <SangkhlaburiLogo size={56} className="w-14 h-14 animate-pulse" />
          <div className="text-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              กำลังตรวจสอบการเข้าสู่ระบบ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. REQUIRED: Login/Registration Portal BEFORE accessing the web application
  if (!currentUser) {
    return (
      <LoginPortal
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
    );
  }

  // Nav Items definition for Left Sidebar
  const navItems = [
    {
      id: 'DASHBOARD' as const,
      label: 'แดชบอร์ดภาพรวม',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'LEDGER' as const,
      label: 'ทะเบียนคุม 52 สิทธิ์',
      icon: <TableProperties className="w-4 h-4 shrink-0" />,
      badge:
        overdueCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-[10px]">
            {overdueCount}
          </span>
        ) : null,
    },
    {
      id: 'REPORT' as const,
      label: 'รายงานเสนอผู้บริหาร',
      icon: <Printer className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'NOTIFICATIONS' as const,
      label: 'ระบบแจ้งเตือน SMS/Email',
      icon: <Bell className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'RBAC' as const,
      label: 'จัดการสิทธิ์และผู้ใช้',
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge:
        currentUser.canManageUsers && pendingUsersCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] animate-pulse">
            {pendingUsersCount} รออนุมัติ
          </span>
        ) : null,
    },
    {
      id: 'RECONCILE' as const,
      label: 'เปรียบเทียบข้อมูล HIS',
      icon: <GitCompare className="w-4 h-4 shrink-0" />,
      badge: null,
    },
  ];

  const currentNav = navItems.find((n) => n.id === activeTab);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      {/* ============================================================ */}
      {/* DESKTOP LEFT SIDEBAR                                          */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between h-full z-30 select-none transition-all">
        {/* Top: Brand Header & Navigation List */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="p-4 xl:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <SangkhlaburiLogo size={40} className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                รพ.สังขละบุรี
              </div>
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
                SKB Management
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                ทะเบียนคุม 52 ผังบัญชี
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              เมนูหลัก
            </div>
            <nav className="space-y-1 text-xs">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'LEDGER') {
                        setLedgerInitialFilter('ALL');
                      }
                      setActiveTab(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border-l-4 border-emerald-600 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <span className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section: Current User Profile, Dark Mode & Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          {/* User Profile Card */}
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                  {currentUser.role}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                {currentUser.roleTitleTh}
              </span>
            </div>
          </div>

          {/* Action Buttons: Dark Mode & Sign Out */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-800 cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
                <span>{darkMode ? 'โหมดสว่าง' : 'โหมดถนอมสายตา'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                {darkMode ? 'เปิดอยู่' : 'ปิดอยู่'}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200/60 dark:border-red-900/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>

          {/* Cloud DB & Vercel live badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cloud Firestore เชื่อมต่อแล้ว</span>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE DRAWER SIDEBAR                                         */}
      {/* ============================================================ */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SangkhlaburiLogo size={36} className="w-9 h-9 shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      รพ.สังขละบุรี
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      ระบบคุมลูกหนี้ 52 สิทธิ์
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation List */}
              <nav className="p-3 space-y-1 text-xs">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'LEDGER') {
                          setLedgerInitialFilter('ALL');
                        }
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border-l-4 border-emerald-600'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Bottom Profile */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {currentUser.roleTitleTh}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MAIN VIEWPORT WORKSPACE (Fits Screen, Comfortable Viewing)    */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active Page Title & Icon */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-emerald-700 dark:text-emerald-400 shrink-0">
                {currentNav?.icon}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {currentNav?.label}
              </h2>
            </div>

            {/* Fiscal Period Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 shrink-0">
              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>งวดประจำเดือน {record.monthName} {record.year} (ปีงบประมาณ 2568)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Pending Approvals Quick Alert for Admin */}
            {currentUser.canManageUsers && pendingUsersCount > 0 && (
              <button
                onClick={() => setActiveTab('RBAC')}
                className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-amber-100 cursor-pointer animate-pulse"
                title="มีคำขอสมัครสมาชิกรอการอนุมัติ"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">คำขอรออนุมัติ:</span>
                <span>{pendingUsersCount} คน</span>
              </button>
            )}

            {/* Overdue Debt Alert Badge */}
            {overdueCount > 0 && (
              <button
                onClick={() => navigateToLedgerWithFilter('OVERDUE')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors"
                title="คลิกเพื่อกรองเฉพาะรายการค้างชำระเกิน 30 วัน"
              >
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>ค้างเกิน 30 วัน ({overdueCount})</span>
              </button>
            )}

            {/* Dark Mode Icon Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={darkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดถนอมสายตา'}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>
        </header>

        {/* Scrollable View Content Workspace (Comfortable eye-spacing & responsive width) */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 scroll-smooth">
          <div className="max-w-[1600px] w-full mx-auto space-y-6">
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
                securitySettings={securitySettings}
                onUpdateSecuritySettings={(newSettings) => setSecuritySettings(newSettings)}
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

            {/* Bottom Footer inside main scroll */}
            <footer className="no-print pt-8 pb-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SangkhlaburiLogo size={18} className="w-4 h-4 inline" />
                  <span>กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศทางการแพทย์ โรงพยาบาลสังขละบุรี</span>
                </div>
                <span>ระบบสารสนเทศบริหารจัดการทะเบียนคุมลูกหนี้ 52 ผังบัญชี (SKB Management System)</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Auth & Registration Modal (if invoked inside app) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        currentUser={currentUser}
        initialTab={authModalTab}
      />
    </div>
  );
}
