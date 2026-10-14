import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerStaffWithEmail,
  getUserProfileFromFirestore,
  syncUserProfileToFirestore,
  logoutUser,
} from '../services/firebase';
import { UserProfile, UserRole } from '../types';
import { SangkhlaburiLogo } from './SangkhlaburiLogo';
import {
  Lock,
  Mail,
  User,
  Shield,
  Building,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  LogIn,
  UserPlus,
  RefreshCw,
  LogOut,
  Database,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout?: () => void;
  currentUser?: UserProfile | null;
  initialTab?: 'LOGIN' | 'REGISTER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onLogout,
  currentUser,
  initialTab = 'LOGIN',
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>(initialTab);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>('ACCOUNTANT');
  const [regDepartment, setRegDepartment] = useState('งานการเงิน บัญชี และพัสดุ');
  const [regPhone, setRegPhone] = useState('034-595000');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const res = await loginWithGoogle();
    setIsLoading(false);

    if (res.user) {
      // Check if user already exists in Firestore
      let profile = await getUserProfileFromFirestore(res.user.uid);
      if (!profile) {
        // Create initial profile for Google user
        profile = {
          id: res.user.uid,
          name: res.user.displayName || 'เจ้าหน้าที่ รพ.สังขละบุรี',
          username: res.user.email?.split('@')[0] || 'staff',
          role: 'ACCOUNTANT',
          roleTitleTh: 'เจ้าหน้าที่บันทึกข้อมูล',
          department: 'กลุ่มงานประกันสุขภาพ ยุทธศาสตร์',
          phone: res.user.phoneNumber || '034-595000',
          email: res.user.email || '',
          active: true,
          canEditDebts: true,
          canReview: false,
          canApprove: false,
          canManageUsers: false,
        };
        await syncUserProfileToFirestore(profile);
      }
      onLoginSuccess(profile);
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error.includes('popup-closed-by-user') ? 'ยกเลิกการเข้าสู่ระบบผ่าน Google' : res.error);
    }
  };

  // Handle Email & Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await loginWithEmail(loginEmail, loginPass);
    setIsLoading(false);

    if (res.user) {
      let profile = await getUserProfileFromFirestore(res.user.uid);
      if (!profile) {
        profile = {
          id: res.user.uid,
          name: res.user.displayName || loginEmail.split('@')[0],
          username: loginEmail.split('@')[0],
          role: 'ACCOUNTANT',
          roleTitleTh: 'เจ้าหน้าที่บันทึกข้อมูล',
          department: 'งานการเงิน บัญชี และพัสดุ',
          phone: '034-595000',
          email: loginEmail,
          active: true,
          canEditDebts: true,
          canReview: false,
          canApprove: false,
          canManageUsers: false,
        };
        await syncUserProfileToFirestore(profile);
      }
      onLoginSuccess(profile);
      onClose();
    } else if (res.error) {
      if (res.error.includes('user-not-found') || res.error.includes('invalid-credential')) {
        setErrorMsg('ไม่พบบัญชีผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (หากยังไม่มีบัญชี สามารถกดแท็บ "สมัครสมาชิกใหม่" ด้านบนได้ทันที)');
      } else if (res.error.includes('wrong-password')) {
        setErrorMsg('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      } else if (res.error.includes('operation-not-allowed')) {
        setErrorMsg('Email/Password Provider ยังไม่ได้เปิดใช้งานใน Firebase Console กรุณาใช้ปุ่ม Google Sign-In หรือเปิดใช้งานใน Firebase Authentication');
      } else {
        setErrorMsg(res.error);
      }
    }
  };

  // Handle Register Staff
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPass) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุล, อีเมล และรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (regPass.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    let roleTitle = 'เจ้าหน้าที่ธุรการ/การเงิน';
    if (regRole === 'EXECUTIVE') roleTitle = 'ผู้บริหาร / ผู้อำนวยการ รพ.';
    if (regRole === 'STATISTICIAN') roleTitle = 'เจ้าพนักงานเวชสถิติชำนาญงาน';
    if (regRole === 'ADMIN') roleTitle = 'ผู้ดูแลระบบสารสนเทศ (Super Admin)';

    const res = await registerStaffWithEmail(
      regEmail.trim(),
      regPass,
      regName.trim(),
      regRole,
      regDepartment.trim(),
      roleTitle,
      regPhone.trim()
    );
    setIsLoading(false);

    if (res.user) {
      const newProfile: UserProfile = {
        id: res.user.uid,
        name: regName.trim(),
        username: regEmail.split('@')[0],
        role: regRole,
        roleTitleTh: roleTitle,
        department: regDepartment.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        active: true,
        canEditDebts: regRole === 'ACCOUNTANT' || regRole === 'STATISTICIAN' || regRole === 'ADMIN',
        canReview: regRole === 'STATISTICIAN' || regRole === 'EXECUTIVE' || regRole === 'ADMIN',
        canApprove: regRole === 'EXECUTIVE' || regRole === 'ADMIN',
        canManageUsers: regRole === 'ADMIN',
      };
      setSuccessMsg('ลงทะเบียนเจ้าหน้าที่สำเร็จ และเชื่อมโยงบันทึกเข้าฐานข้อมูล Cloud Firestore เรียบร้อย!');
      setTimeout(() => {
        onLoginSuccess(newProfile);
        onClose();
      }, 1000);
    } else if (res.error) {
      if (res.error.includes('email-already-in-use')) {
        setErrorMsg('อีเมลนี้มีผู้ลงทะเบียนใช้งานแล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น');
      } else {
        setErrorMsg(res.error);
      }
    }
  };

  // Logout action
  const handleSignOut = async () => {
    setIsLoading(true);
    await logoutUser();
    setIsLoading(false);
    if (onLogout) {
      onLogout();
    }
    setSuccessMsg('ออกจากระบบเรียบร้อยแล้ว');
    setTimeout(() => {
      setSuccessMsg(null);
      setActiveTab('LOGIN');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden transition-all flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <SangkhlaburiLogo size={42} className="w-10 h-10" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Firebase
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                รพ.สังขละบุรี (SKB Medical Debtor System)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Card (if logged in) */}
        {currentUser && (
          <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block leading-tight">บัญชีที่กำลังใช้งาน:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-xs">
                  {currentUser.name} ({currentUser.roleTitleTh})
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="text-[11px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 shrink-0 font-medium ml-2 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              ออกจากระบบ
            </button>
          </div>
        )}

        {/* Navigation Tabs (Only 2 Tabs: Login & Register - Fast Switch removed per user request) */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs shrink-0">
          <button
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'LOGIN'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 text-xs space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-[11px]">{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-4">
              {/* Google Sign-in Option */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>เข้าสู่ระบบด้วย Google Account</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider absolute">
                  หรือใช้อีเมลและรหัสผ่าน
                </span>
              </div>

              {/* Email/Password Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">อีเมลผู้ใช้งาน</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="เช่น staff@skbhospital.go.th"
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">รหัสผ่าน</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-xs mt-1 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  เข้าสู่ระบบ
                </button>
              </form>

              {/* Switch to Register tab */}
              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                <p className="text-slate-500 text-[11px]">
                  ยังไม่มีบัญชีเจ้าหน้าที่ในระบบ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('REGISTER');
                      setErrorMsg(null);
                    }}
                    className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>สมัครสมาชิกใหม่</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">ชื่อ-สกุล เจ้าหน้าที่</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="เช่น น.ส.สุดลัดดา จันทวุฒิ"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">อีเมล (ใช้เป็น Username เข้าระบบ)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="staff@skbhospital.go.th"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="กำหนดรหัสผ่านปลอดภัย"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">บทบาทสิทธิ์ (Role)</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 text-xs"
                  >
                    <option value="ACCOUNTANT">เจ้าหน้าที่การเงิน/ธุรการ</option>
                    <option value="STATISTICIAN">เจ้าพนักงานเวชสถิติ</option>
                    <option value="EXECUTIVE">ผู้บริหาร (ผอ.รพ.)</option>
                    <option value="ADMIN">ผู้ดูแลระบบ (Super Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-300 block mb-1 font-medium">กลุ่มงาน / แผนก</label>
                <input
                  type="text"
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  placeholder="เช่น กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-300">
                <span className="font-semibold block mb-0.5">สิทธิ์ที่จะได้รับ:</span>
                {regRole === 'ACCOUNTANT' && '• บันทึกรับชำระ, ตั้งหนี้ใหม่, ตัดหนี้สูญ, สรุปยอดบัญชี 52 สิทธิ์'}
                {regRole === 'STATISTICIAN' && '• ตรวจสอบความถูกต้อง, เปรียบเทียบ Statement HIS, ตรวจทานรายงาน'}
                {regRole === 'EXECUTIVE' && '• รับรองรายงานประจำเดือน, ดูแดชบอร์ดภาพรวม, รับแจ้งเตือนสรุป'}
                {regRole === 'ADMIN' && '• จัดการผู้ใช้ทั้งหมด (RBAC), สำรอง/กู้คืนฐานข้อมูล, ตั้งค่าระบบ'}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-xs mt-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                ยืนยันลงทะเบียนเจ้าหน้าที่
              </button>

              {/* Switch to Login tab */}
              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                <p className="text-slate-500 text-[11px]">
                  มีบัญชีอยู่แล้ว?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setErrorMsg(null);
                    }}
                    className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Hosting & Database Connection Status Banner */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>ฐานข้อมูล: <strong>Cloud Firestore (ploy-d797f)</strong></span>
              </div>
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                เชื่อมต่อพร้อมใช้งาน
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
