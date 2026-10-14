import React, { useState } from 'react';
import { UserProfile, UserRole, MonthlyRecord } from '../types';
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
  Check
} from 'lucide-react';

interface RBACManagementViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  record: MonthlyRecord;
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
  onSwitchUser,
  onUpdateUsers,
  onRestoreRecord,
  onResetDatabase,
  onOpenRegisterModal,
}) => {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
      desc: 'จัดการสิทธิ์ผู้ใช้ทั้งหมด, สำรองและกู้คืนฐานข้อมูล, ตั้งค่าระบบ',
      icon: 'Shield',
    },
  };

  const handleSaveUser = (userToSave: UserProfile) => {
    let nextUsers: UserProfile[];
    if (isAddMode) {
      nextUsers = [...users, { ...userToSave, id: `usr-${Date.now()}` }];
    } else {
      nextUsers = users.map((u) => (u.id === userToSave.id ? userToSave : u));
    }
    onUpdateUsers(nextUsers);
    setEditingUser(null);
    setIsAddMode(false);
    setStatusMessage('บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (users.length <= 1) {
      alert('ไม่สามารถลบผู้ใช้คนสุดท้ายของระบบได้');
      return;
    }
    if (window.confirm(`ยืนยันการลบผู้ใช้: ${userName}?`)) {
      const nextUsers = users.filter((u) => u.id !== userId);
      onUpdateUsers(nextUsers);
      if (currentUser.id === userId && nextUsers.length > 0) {
        onSwitchUser(nextUsers[0]);
      }
    }
  };

  // Export JSON Database Backup
  const handleExportBackup = () => {
    const backupData = {
      app: 'SKB Medical Debtor System',
      hospital: 'โรงพยาบาลสังขละบุรี',
      exportDate: new Date().toISOString(),
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
          setStatusMessage('กู้คืนฐานข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว');
          setTimeout(() => setStatusMessage(null), 4000);
        } else {
          alert('รูปแบบไฟล์สำรองไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            ระบบจัดการผู้ใช้งานตามลำดับชั้นข้อมูล (RBAC User Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดบทบาทและสิทธิ์การเข้าถึงข้อมูลตามลำดับชั้น: ผู้บริหาร, เวชสถิติ, การเงิน, ผู้ดูแลระบบ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.canManageUsers && (
            <button
              onClick={() => {
                setIsAddMode(true);
                setEditingUser({
                  id: `usr-${Date.now()}`,
                  name: '',
                  username: '',
                  role: 'ACCOUNTANT',
                  roleTitleTh: 'เจ้าหน้าที่การเงิน',
                  department: 'งานการเงิน บัญชี และพัสดุ',
                  phone: '08X-XXX-XXXX',
                  email: '',
                  active: true,
                  canEditDebts: true,
                  canReview: false,
                  canApprove: false,
                  canManageUsers: false,
                });
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              เพิ่มผู้ใช้งานใหม่
            </button>
          )}

          {onOpenRegisterModal && (
            <button
              onClick={onOpenRegisterModal}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-800"
            >
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              ลงทะเบียนผ่าน Firebase Auth
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Switch Active User / Simulator Card */}
      <div className="p-5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              เข้าสู่ระบบในฐานะ (Active User Role Switcher)
            </h3>
            <p className="text-xs text-slate-500">
              คลิกเพื่อสลับผู้ใช้งานจำลองและทดสอบสิทธิ์การทำงานตามบทบาทจริงของโรงพยาบาล
            </p>
          </div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>ผู้ใช้ปัจจุบัน:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {currentUser.name} ({ROLE_CONFIGS[currentUser.role]?.title})
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {users.map((user) => {
            const isCurrent = currentUser.id === user.id;
            const roleInfo = ROLE_CONFIGS[user.role];
            return (
              <button
                key={user.id}
                onClick={() => onSwitchUser(user)}
                className={`p-3.5 rounded-xl text-left transition-all border ${
                  isCurrent
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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
      </div>

      {/* User Directory Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            รายชื่อผู้มีสิทธิ์ใช้งานระบบ (User Directory)
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{users.length} บัญชีผู้ใช้งาน</span>
            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                สมัครสมาชิกใหม่
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-3">ชื่อ - สกุล / ตำแหน่ง</th>
                <th className="py-2.5 px-3">บทบาท (Role)</th>
                <th className="py-2.5 px-3">สังกัด / กลุ่มงาน</th>
                <th className="py-2.5 px-3">สิทธิ์การดำเนินการ</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {user.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {user.roleTitleTh} · ({user.phone})
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
                          ตรวจสอบเวชสถิติ
                        </span>
                      )}
                      {user.canApprove && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          รับรองรายงาน
                        </span>
                      )}
                      {user.canManageUsers && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          จัดการผู้ใช้/สำรองข้อมูล
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
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        title="แก้ไขข้อมูลผู้ใช้"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {currentUser.canManageUsers && users.length > 1 && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                          title="ลบผู้ใช้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Backup & Restore Section */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              การสำรองและกู้คืนฐานข้อมูล (Database Backup & Restore)
            </h3>
            <p className="text-xs text-slate-500">
              สำรองข้อมูลทะเบียนคุมลูกหนี้ 52 สิทธิ์ และบัญชีผู้ใช้ หรือนำเข้าข้อมูลเดิมกลับคืน
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            สำรองข้อมูล (Export JSON)
          </button>

          <label className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
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
            className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-2 ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            รีเซ็ตข้อมูลตั้งต้น (Reset Data)
          </button>
        </div>
      </div>

      {/* Edit / Add User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                {isAddMode ? 'เพิ่มผู้ใช้งานระบบใหม่' : 'แก้ไขข้อมูลและสิทธิ์ผู้ใช้งาน'}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">ชื่อ - สกุล</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="เช่น นายแพทย์... หรือ นางสาว..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="EXECUTIVE">ผู้บริหาร (Executive / ผอ.รพ.)</option>
                    <option value="STATISTICIAN">เจ้าพนักงานเวชสถิติ</option>
                    <option value="ACCOUNTANT">เจ้าหน้าที่การเงิน/ธุรการ</option>
                    <option value="ADMIN">ผู้ดูแลระบบ (Super Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">ตำแหน่งทางการ</label>
                  <input
                    type="text"
                    value={editingUser.roleTitleTh}
                    onChange={(e) => setEditingUser({ ...editingUser, roleTitleTh: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">กลุ่มงาน / หน่วยงาน</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                    <span>ตรวจสอบความถูกต้อง (เวชสถิติ)</span>
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
                    <span>จัดการผู้ใช้และสำรองข้อมูล</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleSaveUser(editingUser)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
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
