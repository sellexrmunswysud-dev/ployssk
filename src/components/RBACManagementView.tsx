import React, { useState } from 'react';
import { UserProfile, UserRole, MonthlyRecord, SystemSecuritySettings } from '../types';
import {
  Users,
  Shield,
  UserPlus,
  Key,
  CheckCircle,
  XCircle,
  Database,
  Download,
  Upload,
  RotateCcw,
  UserCheck,
  Building,
  Lock,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  UserCog
} from 'lucide-react';
import {
  approveUserInFirestore,
  rejectUserInFirestore,
  deleteUserFromFirestore,
  saveSecuritySettingsToFirestore,
  syncUserProfileToFirestore,
} from '../services/firebase';

interface RBACManagementViewProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  record: MonthlyRecord;
  securitySettings?: SystemSecuritySettings;
  onUpdateSecuritySettings?: (settings: SystemSecuritySettings) => void;
  onSwitchUser: (user: UserProfile) => void;
  onUpdateUsers: (users: UserProfile[]) => void;
  onRestoreRecord: (restoredRecord: MonthlyRecord) => void;
  onResetDatabase: () => void;
  onOpenRegisterModal?: () => void;
}

export const RBACManagementView: React.FC<RBACManagementViewProps> = ({
  users,
  currentUser,
  record,
  securitySettings = { requireAdminApproval: true, allowAutoApproveFirstAdmin: true },
  onUpdateSecuritySettings,
  onSwitchUser,
  onUpdateUsers,
  onRestoreRecord,
  onResetDatabase,
  onOpenRegisterModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'APPROVED' | 'PENDING' | 'SETTINGS'>('APPROVED');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingRoleSelection, setPendingRoleSelection] = useState<Record<string, UserRole>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Group users by approval status
  const approvedUsers = users.filter(
    (u) => u.approvalStatus === 'APPROVED' || (u.active && !u.approvalStatus)
  );
  const pendingUsers = users.filter(
    (u) =>
      u.approvalStatus === 'PENDING' ||
      (!u.active && u.approvalStatus !== 'REJECTED' && u.approvalStatus !== 'APPROVED')
  );
  const rejectedUsers = users.filter((u) => u.approvalStatus === 'REJECTED');

  // Role details mapping
  const ROLE_CONFIGS: Record<UserRole, { title: string; color: string; desc: string; icon: string }> = {
    EXECUTIVE: {
      title: 'ผู้บริหาร (Executive / ผอ.รพ.)',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
      desc: 'ดูแดชบอร์ดภาพรวม, รับรองรายงานประจำเดือน, รับแจ้งเตือน SMS/Email สรุปยอด',
      icon: 'Crown',
    },
    STATISTICIAN: {
      title: 'เจ้าพนักงานเวชสถิติ (Statistician)',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
      desc: 'ตรวจสอบความถูกต้อง 52 สิทธิ์, เปรียบเทียบข้อมูล HIS, ตรวจสอบ Statement',
      icon: 'BarChart2',
    },
    ACCOUNTANT: {
      title: 'เจ้าหน้าที่การเงิน/ธุรการ (Accountant)',
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      desc: 'บันทึกรับชำระ, ตั้งหนี้ใหม่, ตัดหนี้สูญ, สรุปยอดบัญชีลูกหนี้',
      icon: 'CreditCard',
    },
    ADMIN: {
      title: 'ผู้ดูแลระบบ (Super Admin)',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      desc: 'จัดการสิทธิ์ผู้ใช้ทั้งหมด, อนุมัติการเข้าใช้งาน, สำรองและกู้คืนฐานข้อมูล',
      icon: 'Shield',
    },
  };

  // Handle Approve user
  const handleApproveUser = async (user: UserProfile) => {
    setIsProcessing(true);
    const chosenRole = pendingRoleSelection[user.id] || user.role;
    const approver = currentUser?.name || 'ผู้ดูแลระบบไอที';

    const success = await approveUserInFirestore(user.id, approver, chosenRole);
    setIsProcessing(false);

    if (success) {
      const nextUsers = users.map((u) => {
        if (u.id === user.id) {
          return {
            ...u,
            role: chosenRole,
            active: true,
            approvalStatus: 'APPROVED' as const,
            approvedAt: new Date().toISOString(),
            approvedBy: approver,
            canEditDebts: chosenRole === 'ACCOUNTANT' || chosenRole === 'STATISTICIAN' || chosenRole === 'ADMIN',
            canReview: chosenRole === 'STATISTICIAN' || chosenRole === 'EXECUTIVE' || chosenRole === 'ADMIN',
            canApprove: chosenRole === 'EXECUTIVE' || chosenRole === 'ADMIN',
            canManageUsers: chosenRole === 'ADMIN',
          };
        }
        return u;
      });
      onUpdateUsers(nextUsers);
      setStatusMessage(`อนุมัติสิทธิ์ให้เจ้าหน้าที่ "${user.name}" (${ROLE_CONFIGS[chosenRole]?.title}) เรียบร้อยแล้ว`);
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      alert('เกิดข้อผิดพลาดในการอนุมัติผู้ใช้งาน กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Handle Reject user
  const handleRejectUser = async (user: UserProfile) => {
    if (!window.confirm(`ยืนยันการปฏิเสธคำขอเข้าใช้งานของ: ${user.name}?`)) return;
    setIsProcessing(true);
    const success = await rejectUserInFirestore(user.id);
    setIsProcessing(false);

    if (success) {
      const nextUsers = users.map((u) => (u.id === user.id ? { ...u, approvalStatus: 'REJECTED' as const, active: false } : u));
      onUpdateUsers(nextUsers);
      setStatusMessage(`ปฏิเสธคำขอของ "${user.name}" เรียบร้อยแล้ว`);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Handle Delete user (pending or approved)
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้: ${userName}?`)) {
      setIsProcessing(true);
      await deleteUserFromFirestore(userId);
      setIsProcessing(false);
      const nextUsers = users.filter((u) => u.id !== userId);
      onUpdateUsers(nextUsers);
      if (currentUser?.id === userId && nextUsers.length > 0) {
        onSwitchUser(nextUsers[0]);
      }
      setStatusMessage(`ลบผู้ใช้ "${userName}" ออกจากระบบเรียบร้อยแล้ว`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Handle Toggle Security Settings
  const handleToggleRequireApproval = async () => {
    const updated: SystemSecuritySettings = {
      ...securitySettings,
      requireAdminApproval: !securitySettings.requireAdminApproval,
    };
    if (onUpdateSecuritySettings) {
      onUpdateSecuritySettings(updated);
    }
    await saveSecuritySettingsToFirestore(updated);
    setStatusMessage(
      updated.requireAdminApproval
        ? 'เปิดการตั้งค่า: ผู้ใช้งานที่สมัครใหม่ต้องได้รับการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งาน'
        : 'ปิดการตั้งค่า: ผู้ใช้งานที่สมัครใหม่จะสามารถเข้าใช้งานได้ทันทีโดยไม่ต้องรออนุมัติ'
    );
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Save manual add/edit user
  const handleSaveUser = async (userToSave: UserProfile) => {
    let nextUsers: UserProfile[];
    if (isAddMode) {
      const newUser: UserProfile = {
        ...userToSave,
        id: `usr-${Date.now()}`,
        approvalStatus: 'APPROVED',
        active: true,
      };
      nextUsers = [...users, newUser];
      await syncUserProfileToFirestore(newUser);
    } else {
      nextUsers = users.map((u) => (u.id === userToSave.id ? userToSave : u));
      await syncUserProfileToFirestore(userToSave);
    }
    onUpdateUsers(nextUsers);
    setEditingUser(null);
    setIsAddMode(false);
    setStatusMessage('บันทึกข้อมูลและสิทธิ์ผู้ใช้งานเรียบร้อยแล้ว');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Export JSON Database Backup
  const handleExportBackup = () => {
    const backupData = {
      app: 'SKB Medical Debtor System',
      hospital: 'โรงพยาบาลสังขละบุรี',
      exportDate: new Date().toISOString(),
      securitySettings,
      record: record,
      users: users,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKB_Debtor_Backup_${record.year}_${record.month}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('ส่งออกไฟล์สำรองข้อมูล (JSON Backup) สำเร็จ');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.record && parsed.record.items) {
          onRestoreRecord(parsed.record);
          if (parsed.users) {
            onUpdateUsers(parsed.users);
          }
          if (parsed.securitySettings && onUpdateSecuritySettings) {
            onUpdateSecuritySettings(parsed.securitySettings);
          }
          setStatusMessage('กู้คืนฐานข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว');
          setTimeout(() => setStatusMessage(null), 4000);
        } else {
          alert('รูปแบบไฟล์สำรองไม่ถูกต้อง');
        }
      } catch {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ระบบจัดการสิทธิ์และอนุมัติผู้ใช้งาน (RBAC & Admin Approval System)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดบทบาทหน้าที่ สิทธิ์ตามลำดับชั้นข้อมูล และตรวจสอบคำขอสมัครเข้าใช้งานของเจ้าหน้าที่ รพ.สังขละบุรี
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.canManageUsers && (
            <button
              onClick={() => {
                setIsAddMode(true);
                setEditingUser({
                  id: `usr-${Date.now()}`,
                  name: '',
                  username: '',
                  role: 'ACCOUNTANT',
                  roleTitleTh: 'เจ้าหน้าที่การเงินและบัญชี',
                  department: 'งานการเงิน บัญชี และพัสดุ',
                  phone: '034-595000',
                  email: '',
                  active: true,
                  approvalStatus: 'APPROVED',
                  canEditDebts: true,
                  canReview: false,
                  canApprove: false,
                  canManageUsers: false,
                });
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              เพิ่มเจ้าหน้าที่โดยตรง
            </button>
          )}

          {onOpenRegisterModal && (
            <button
              onClick={onOpenRegisterModal}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              ลงทะเบียนผ่าน Firebase Auth
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{statusMessage}</span>
        </div>
      )}

      {/* Sub-Tabs: Approved vs Pending vs Settings */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('APPROVED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'APPROVED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>ผู้ใช้งานที่ได้รับอนุมัติแล้ว</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSubTab === 'APPROVED' ? 'bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {approvedUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'PENDING'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>คำขอสมัครใหม่รอการอนุมัติ</span>
          {pendingUsers.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              {pendingUsers.length} คำขอ
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('SETTINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'SETTINGS'
              ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>ตั้งค่านโยบายความปลอดภัยและการอนุมัติ</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: APPROVED USERS                                         */}
      {/* ============================================================ */}
      {activeSubTab === 'APPROVED' && (
        <div className="space-y-6">
          {/* Active User Simulator / Switcher */}
          <div className="p-5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  สลับบทบาทผู้ใช้งานที่ได้รับอนุมัติ (Active User Simulator)
                </h3>
                <p className="text-xs text-slate-500">
                  คลิกที่การ์ดเจ้าหน้าที่เพื่อทดสอบมุมมองและสิทธิ์การทำงานตามบทบาท
                </p>
              </div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>กำลังใช้งาน:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {currentUser ? `${currentUser.name} (${currentUser.roleTitleTh})` : 'ยังไม่ได้เข้าสู่ระบบ'}
                </span>
              </div>
            </div>

            {approvedUsers.length === 0 ? (
              <div className="mt-4 p-8 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-emerald-300 dark:border-emerald-800 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  ยังไม่มีรายชื่อผู้ใช้งานที่ได้รับการอนุมัติในระบบ
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {pendingUsers.length > 0
                    ? `มี ${pendingUsers.length} คำขอที่รอการอนุมัติ กรุณาคลิกแท็บ "คำขอสมัครใหม่รอการอนุมัติ" เพื่อตรวจสอบและเปิดสิทธิ์`
                    : 'กรุณาสมัครสมาชิกใหม่ หรือเพิ่มเจ้าหน้าที่คนแรกเพื่อเริ่มใช้งานระบบ'}
                </p>
                {pendingUsers.length > 0 && (
                  <button
                    onClick={() => setActiveSubTab('PENDING')}
                    className="mt-3 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    ดู {pendingUsers.length} คำขอรออนุมัติ
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {approvedUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  const roleInfo = ROLE_CONFIGS[user.role] || {
                    title: user.roleTitleTh || user.role,
                    color: 'bg-emerald-100 text-emerald-800',
                  };
                  return (
                    <button
                      key={user.id}
                      onClick={() => onSwitchUser(user)}
                      className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-white/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                          {user.role}
                        </span>
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                            ใช้งานอยู่
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {user.roleTitleTh}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {user.department}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Directory Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                รายชื่อผู้มีสิทธิ์ใช้งานระบบ (Approved User Directory)
              </h3>
              <span className="text-xs text-slate-500">{approvedUsers.length} บัญชีผู้ใช้งานที่เปิดสิทธิ์แล้ว</span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">ชื่อ - สกุล / ตำแหน่ง</th>
                    <th className="py-2.5 px-3">บทบาท (Role)</th>
                    <th className="py-2.5 px-3">สังกัด / กลุ่มงาน</th>
                    <th className="py-2.5 px-3">สิทธิ์การดำเนินการ</th>
                    <th className="py-2.5 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {approvedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        ยังไม่มีผู้ใช้งานที่ได้รับอนุมัติในระบบ
                      </td>
                    </tr>
                  ) : (
                    approvedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {user.roleTitleTh} · ({user.phone || 'ไม่ระบุเบอร์'})
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_CONFIGS[user.role]?.color}`}>
                            {ROLE_CONFIGS[user.role]?.title}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {user.department}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {user.canEditDebts && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                แก้ไขลูกหนี้
                              </span>
                            )}
                            {user.canReview && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                ตรวจสอบสถิติ
                              </span>
                            )}
                            {user.canApprove && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                รับรองรายงาน
                              </span>
                            )}
                            {user.canManageUsers && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                ดูแลระบบ/อนุมัติ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setIsAddMode(false);
                                setEditingUser({ ...user });
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลผู้ใช้"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PENDING APPROVAL REQUESTS                               */}
      {/* ============================================================ */}
      {activeSubTab === 'PENDING' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 shadow-xs">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  คำขอสมัครสมาชิกใหม่รอการอนุมัติสิทธิ์ ({pendingUsers.length} รายการ)
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                  เจ้าหน้าที่ด้านล่างนี้ได้ทำการลงทะเบียนในระบบ และกำลังรอให้ผู้ดูแลระบบ (Admin) ตรวจสอบตัวตน กำหนดสิทธิ์ และกดยืนยันการอนุมัติก่อนที่จะสามารถล็อกอินเข้าสู่ระบบได้
                </p>
              </div>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                ไม่มีคำขอสมัครสมาชิกรอการอนุมัติในขณะนี้
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                เมื่อมีบุคลากรทางการแพทย์หรือเจ้าหน้าที่ทำการสมัครสมาชิกใหม่ผ่านหน้าเข้าสู่ระบบ คำขอจะปรากฏในหน้านี้โดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((user) => {
                const selectedRole = pendingRoleSelection[user.id] || user.role;
                return (
                  <div
                    key={user.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/70 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {user.name}
                          </h4>
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block mt-0.5">
                            ขอสิทธิ์: {ROLE_CONFIGS[user.role]?.title || user.roleTitleTh || user.role}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        รออนุมัติ
                      </span>
                    </div>

                    {/* Applicant Information Details */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>กลุ่มงาน/ฝ่าย: <strong>{user.department || 'ไม่ระบุ'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>เบอร์ติดต่อ: <strong>{user.phone || 'ไม่ระบุ'}</strong></span>
                      </div>
                      {user.registeredAt && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>ลงทะเบียนเมื่อ: {new Date(user.registeredAt).toLocaleString('th-TH')}</span>
                        </div>
                      )}
                    </div>

                    {/* Role Adjustment Selector Before Approving */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ปรับเปลี่ยนบทบาทก่อนอนุมัติ (ถ้าจำเป็น):
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setPendingRoleSelection({
                            ...pendingRoleSelection,
                            [user.id]: e.target.value as UserRole,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="ACCOUNTANT">เจ้าหน้าที่การเงิน/ธุรการ (Accountant)</option>
                        <option value="STATISTICIAN">เจ้าพนักงานเวชสถิติ (Statistician)</option>
                        <option value="EXECUTIVE">ผู้บริหาร (Executive / ผอ.รพ.)</option>
                        <option value="ADMIN">ผู้ดูแลระบบ (Super Admin)</option>
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleApproveUser(user)}
                        disabled={isProcessing}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>อนุมัติและเปิดสิทธิ์</span>
                      </button>

                      <button
                        onClick={() => handleRejectUser(user)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-xl border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        ปฏิเสธ
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={isProcessing}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="ลบคำขอ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rejected Users Section */}
          {rejectedUsers.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500" />
                คำขอที่ปฏิเสธแล้ว ({rejectedUsers.length} รายการ)
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rejectedUsers.map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{u.name}</span>
                      <span className="text-slate-400 ml-2">({u.email})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveUser(u)}
                        className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
                      >
                        เปลี่ยนใจอนุมัติ
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SECURITY POLICY & APPROVAL SETTINGS                    */}
      {/* ============================================================ */}
      {activeSubTab === 'SETTINGS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-600" />
                  การตั้งค่านโยบายการสมัครและการอนุมัติสิทธิ์ผู้ใช้งานใหม่
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ควบคุมความปลอดภัยตามมาตรฐานเทคโนโลยีสารสนเทศทางการแพทย์ (กระทรวงสาธารณสุข)
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ควบคุมโดยผู้ดูแลระบบ
              </span>
            </div>

            {/* Main Toggle: Require Admin Approval for new users */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>บังคับให้ผู้ใช้งานที่สมัครใหม่ ต้องได้รับการอนุมัติจากผู้ดูแลระบบ (Admin) ก่อนเข้าใช้งาน</span>
                  {securitySettings.requireAdminApproval ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      เปิดใช้งานอยู่ (แนะนำ)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      ปิดอยู่ (เข้าใช้งานได้ทันที)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
                  เมื่อเปิดใช้งาน: ผู้ใช้งานที่ลงทะเบียนใหม่ทั้งหมด (ทั้งแบบอีเมล/รหัสผ่าน และ Google SSO) จะถูกกักไว้ในสถานะ &quot;รอการอนุมัติ&quot; และจะไม่สามารถล็อกอินเข้าสู่หน้าแดชบอร์ดหรือดูข้อมูลลูกหนี้ได้ จนกว่าผู้ดูแลระบบจะกด &quot;อนุมัติและเปิดสิทธิ์&quot;
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleRequireApproval}
                className="shrink-0 p-1 cursor-pointer transition-transform"
                title={securitySettings.requireAdminApproval ? 'คลิกเพื่อปิดการบังคับอนุมัติ' : 'คลิกเพื่อเปิดการบังคับอนุมัติ'}
              >
                {securitySettings.requireAdminApproval ? (
                  <ToggleRight className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-400" />
                )}
              </button>
            </div>

            {/* Information Box */}
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>แนวทางปฏิบัติด้านความปลอดภัยของระบบ รพ.สังขละบุรี:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                <li>สิทธิ์ <strong>EXECUTIVE</strong> (ผู้อำนวยการ/ผู้บริหาร): มีสิทธิ์ดูภาพรวม สถิติ และอนุมัติรายงานราชการ</li>
                <li>สิทธิ์ <strong>STATISTICIAN</strong> (เวชสถิติ): มีสิทธิ์ตรวจสอบข้อมูล 52 สิทธิ์ และเปรียบเทียบข้อมูล HIS</li>
                <li>สิทธิ์ <strong>ACCOUNTANT</strong> (การเงิน/บัญชี): มีสิทธิ์บันทึกรับชำระ ตั้งหนี้ใหม่ และตัดหนี้สูญ</li>
                <li>สิทธิ์ <strong>ADMIN</strong> (ผู้ดูแลระบบ): มีสิทธิ์จัดการสิทธิ์ผู้ใช้งานทั้งหมด และกู้คืนฐานข้อมูล</li>
              </ul>
            </div>
          </div>

          {/* Database Backup & Restore Section */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  การสำรองและกู้คืนฐานข้อมูล (Database Backup & Restore)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  สำรองข้อมูลทะเบียนคุมลูกหนี้ 52 สิทธิ์ บัญชีผู้ใช้งาน และการตั้งค่านโยบายความปลอดภัย
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                สำรองข้อมูลทั้งหมด (Export JSON)
              </button>

              <label className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                กู้คืนข้อมูล (Import JSON)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  if (window.confirm('คุณต้องการรีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้นตามเอกสารทางการ ส.ค. 2569 ใช่หรือไม่?')) {
                    onResetDatabase();
                    setStatusMessage('รีเซ็ตฐานข้อมูลเป็นค่ามาตรฐานทางการ ส.ค. 2569 เรียบร้อยแล้ว');
                    setTimeout(() => setStatusMessage(null), 3000);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-2 ml-auto cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                รีเซ็ตข้อมูลตั้งต้น (Reset Data)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-emerald-600" />
                {isAddMode ? 'เพิ่มผู้ใช้งานระบบใหม่' : 'แก้ไขข้อมูลและสิทธิ์ผู้ใช้งาน'}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">ชื่อ - สกุล (พร้อมคำนำหน้า)</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="เช่น นพ.สมชาย หรือ น.ส.พิมพ์ชนก"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">บทบาท (Role)</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      let canEdit = false;
                      let canReview = false;
                      let canApprove = false;
                      let canAdmin = false;

                      if (newRole === 'EXECUTIVE') {
                        canReview = true;
                        canApprove = true;
                      } else if (newRole === 'STATISTICIAN') {
                        canEdit = true;
                        canReview = true;
                      } else if (newRole === 'ACCOUNTANT') {
                        canEdit = true;
                      } else if (newRole === 'ADMIN') {
                        canEdit = true;
                        canReview = true;
                        canApprove = true;
                        canAdmin = true;
                      }

                      setEditingUser({
                        ...editingUser,
                        role: newRole,
                        canEditDebts: canEdit,
                        canReview: canReview,
                        canApprove: canApprove,
                        canManageUsers: canAdmin,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ACCOUNTANT">เจ้าหน้าที่การเงิน/ธุรการ</option>
                    <option value="STATISTICIAN">เจ้าพนักงานเวชสถิติ</option>
                    <option value="EXECUTIVE">ผู้บริหาร (ผอ.รพ.)</option>
                    <option value="ADMIN">ผู้ดูแลระบบ (Super Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">ตำแหน่งทางการ (สำหรับรายงาน)</label>
                  <input
                    type="text"
                    value={editingUser.roleTitleTh}
                    onChange={(e) => setEditingUser({ ...editingUser, roleTitleTh: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">เบอร์มือถือ</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">กลุ่มงาน / หน่วยงาน</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Permission Checkboxes */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  กำหนดสิทธิ์การเข้าถึง (Permissions)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingUser.canEditDebts}
                      onChange={(e) => setEditingUser({ ...editingUser, canEditDebts: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>บันทึก/แก้ไขยอดลูกหนี้</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingUser.canReview}
                      onChange={(e) => setEditingUser({ ...editingUser, canReview: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>ตรวจสอบสถิติ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingUser.canApprove}
                      onChange={(e) => setEditingUser({ ...editingUser, canApprove: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>ลงนามรับรองรายงาน (ผอ.)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingUser.canManageUsers}
                      onChange={(e) => setEditingUser({ ...editingUser, canManageUsers: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>จัดการผู้ใช้และอนุมัติสิทธิ์</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleSaveUser(editingUser)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                บันทึกข้อมูลผู้ใช้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
