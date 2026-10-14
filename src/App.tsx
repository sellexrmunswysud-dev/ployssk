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
import { saveRecordToFirestore, subscribeToRecord, loadRecordFromFirestore } from './services/firebase';
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
  Calendar
} from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LEDGER' | 'REPORT' | 'NOTIFICATIONS' | 'RBAC' | 'RECONCILE'>('DASHBOARD');
  const [ledgerInitialFilter, setLedgerInitialFilter] = useState<'ALL' | 'GOV' | 'EXT' | 'OVERDUE'>('ALL');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        return JSON.parse(saved);
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('skb_current_user_id');
    const matched = users.find((u) => u.id === savedId);
    return matched || users[2]; // Default to Accountant (น.ส.สุดลัดดา จันทวุฒิ) for easy editing
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
    return () => {
      if (unsub) unsub();
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
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[2]);
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

            {/* Current User Quick Switcher Dropdown */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="leading-tight">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block line-clamp-1 max-w-[130px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 block line-clamp-1">
                  {currentUser.roleTitleTh}
                </span>
              </div>
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

            {/* Mobile Dark Mode Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
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
          />
        )}

        {activeTab === 'RECONCILE' && (
          <ReconciliationView
            record={record}
            onUpdateRecord={handleUpdateRecord}
          />
        )}
      </main>


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
