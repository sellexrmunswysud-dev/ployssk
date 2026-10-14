import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerStaffWithEmail,
  getUserProfileFromFirestore,
  syncUserProfileToFirestore,
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
  LogIn,
  UserPlus,
  RefreshCw,
  Database,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  FileSpreadsheet,
  Check
} from 'lucide-react';

interface LoginPortalProps {
  onLoginSuccess: (user: UserProfile) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLoginSuccess,
  darkMode,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>('ACCOUNTANT');
  const [regRoleTitleTh, setRegRoleTitleTh] = useState('เจ้าหน้าที่การเงินและบัญชี');
  const [regDepartment, setRegDepartment] = useState('งานการเงิน บัญชี และพัสดุ');
  const [regPhone, setRegPhone] = useState('034-595000');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick switch role title based on role selected
  const handleRoleChange = (role: UserRole) => {
    setRegRole(role);
    switch (role) {
      case 'EXECUTIVE':
        setRegRoleTitleTh('รักษาการผู้อำนวยการ / ผู้บริหาร');
        setRegDepartment('กลุ่มงานบริหารงานทั่วไปและยุทธศาสตร์');
        break;
      case 'STATISTICIAN':
        setRegRoleTitleTh('นักวิชาการสถิติและเวชระเบียน');
        setRegDepartment('กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศ');
        break;
      case 'ACCOUNTANT':
        setRegRoleTitleTh('เจ้าหน้าที่การเงินและบัญชี');
        setRegDepartment('งานการเงิน บัญชี และพัสดุ');
        break;
      case 'ADMIN':
        setRegRoleTitleTh('ผู้ดูแลระบบไอทีสารสนเทศ (Admin)');
        setRegDepartment('ศูนย์เทคโนโลยีสารสนเทศทางการแพทย์');
        break;
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await loginWithGoogle();
    setIsLoading(false);

    if (res.user) {
      let profile = await getUserProfileFromFirestore(res.user.uid);
      if (!profile) {
        profile = {
          id: res.user.uid,
          name: res.user.displayName || 'เจ้าหน้าที่ รพ.สังขละบุรี',
          username: res.user.email?.split('@')[0] || 'staff',
          role: 'ACCOUNTANT',
          roleTitleTh: 'เจ้าหน้าที่บันทึกข้อมูล',
          department: 'กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศ',
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
      setSuccessMsg(`ยินดีต้อนรับ ${profile.name} เข้าสู่ระบบสำเร็จ`);
      setTimeout(() => {
        onLoginSuccess(profile!);
      }, 500);
    } else if (res.error) {
      setErrorMsg(
        res.error.includes('popup-closed-by-user')
          ? 'ยกเลิกการเข้าสู่ระบบผ่าน Google'
          : res.error
      );
    }
  };

  // Handle Email & Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPass) {
      setErrorMsg('กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await loginWithEmail(loginEmail.trim(), loginPass);
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
      setSuccessMsg(`ยินดีต้อนรับคุณ ${profile.name} เข้าสู่ระบบสำเร็จ`);
      setTimeout(() => {
        onLoginSuccess(profile!);
      }, 500);
    } else if (res.error) {
      if (
        res.error.includes('user-not-found') ||
        res.error.includes('invalid-credential') ||
        res.error.includes('wrong-password')
      ) {
        setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง (หากยังไม่มีบัญชี สามารถกดแท็บ "ลงทะเบียนเจ้าหน้าที่ใหม่" ด้านบนได้ทันที)');
      } else if (res.error.includes('operation-not-allowed')) {
        setErrorMsg('Email/Password provider ยังไม่ได้เปิดใช้งานใน Firebase Console กรุณาใช้ปุ่ม Google Sign-In หรือเปิดใช้งานใน Firebase Authentication');
      } else {
        setErrorMsg(res.error);
      }
    }
  };

  // Handle Staff Registration
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
    setSuccessMsg(null);

    const res = await registerStaffWithEmail(
      regEmail.trim(),
      regPass,
      regName.trim(),
      regRole,
      regDepartment,
      regRoleTitleTh,
      regPhone
    );
    setIsLoading(false);

    if (res.user) {
      const newProfile: UserProfile = {
        id: res.user.uid,
        name: regName.trim(),
        username: regEmail.split('@')[0],
        role: regRole,
        roleTitleTh: regRoleTitleTh,
        department: regDepartment,
        phone: regPhone,
        email: regEmail.trim(),
        active: true,
        canEditDebts: regRole === 'ACCOUNTANT' || regRole === 'STATISTICIAN' || regRole === 'ADMIN',
        canReview: regRole === 'STATISTICIAN' || regRole === 'EXECUTIVE' || regRole === 'ADMIN',
        canApprove: regRole === 'EXECUTIVE' || regRole === 'ADMIN',
        canManageUsers: regRole === 'ADMIN',
      };

      setSuccessMsg('ลงทะเบียนเจ้าหน้าที่ใหม่เรียบร้อยแล้ว กำลังนำท่านเข้าสู่ระบบ...');
      setTimeout(() => {
        onLoginSuccess(newProfile);
      }, 700);
    } else if (res.error) {
      if (res.error.includes('email-already-in-use')) {
        setErrorMsg('อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาเข้าสู่ระบบผ่านแท็บ "เข้าสู่ระบบ"');
      } else {
        setErrorMsg(res.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SangkhlaburiLogo size={42} className="w-10 h-10 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md border border-emerald-300 dark:border-emerald-800">
                  ระบบสารสนเทศทะเบียนคุม 52 ผังบัญชี
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศทางการแพทย์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              title={darkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดถนอมสายตา'}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg">
          {/* Security Notice Banner */}
          <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <span className="font-bold">ระบบความปลอดภัยสารสนเทศทางการแพทย์:</span>{' '}
              กรุณาเข้าสู่ระบบหรือลงทะเบียนเจ้าหน้าที่ก่อนเข้าใช้งานเว็ปแอปพริเคชั่น เพื่อการรักษาความลับข้อมูลลูกหนี้สิทธิการรักษาพยาบาล
            </div>
          </div>

          {/* Authentication Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Card Header & Tabs */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      ยืนยันตัวตนก่อนเข้าใช้งาน
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ระบบบันทึกและตรวจสอบทะเบียนคุมลูกหนี้ รพ.สังขละบุรี
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Cloud DB พร้อมใช้งาน</span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-750">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'LOGIN'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'REGISTER'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>สมัครสมาชิกใหม่</span>
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6">
              {/* Feedback Alerts */}
              {errorMsg && (
                <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span className="leading-relaxed font-medium">{successMsg}</span>
                </div>
              )}

              {/* TAB 1: LOGIN */}
              {activeTab === 'LOGIN' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      อีเมลเจ้าหน้าที่ / อีเมลเข้าใช้งาน
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="staff@sangkhla-hospital.moph.go.th"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      รหัสผ่าน (Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showLoginPass ? 'text' : 'password'}
                        required
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPass(!showLoginPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>เข้าสู่ระบบเพื่อใช้งานเว็ปแอปพริเคชั่น</span>
                      </>
                    )}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                    <span className="flex-shrink mx-3 text-[11px] text-slate-400">หรือเข้าใช้งานด้วย</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  </div>

                  {/* Google Sign-in */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>เข้าสู่ระบบด้วย Google Account สาธารณสุข</span>
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ยังไม่มีบัญชีเจ้าหน้าที่?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('REGISTER');
                          setErrorMsg(null);
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        กดที่นี่เพื่อลงทะเบียนเจ้าหน้าที่ใหม่
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2: REGISTER */}
              {activeTab === 'REGISTER' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ชื่อ - นามสกุล (พร้อมคำนำหน้า) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="เช่น นพ.สมชาย ใจดี หรือ น.ส.พิมพ์ชนก สุขใจ"
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        บทบาทและหน้าที่ในระบบ <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value={regRole}
                          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        >
                          <option value="ACCOUNTANT">เจ้าหน้าที่การเงินและบัญชี</option>
                          <option value="STATISTICIAN">นักวิชาการสถิติและข้อมูล</option>
                          <option value="EXECUTIVE">ผู้บริหาร / ผู้อำนวยการ</option>
                          <option value="ADMIN">ผู้ดูแลระบบไอที (Admin)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ตำแหน่งทางการ (ระบุในรายงาน)
                      </label>
                      <input
                        type="text"
                        value={regRoleTitleTh}
                        onChange={(e) => setRegRoleTitleTh(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        กลุ่มงาน / ฝ่าย <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={regDepartment}
                          onChange={(e) => setRegDepartment(e.target.value)}
                          placeholder="งานการเงิน บัญชี และพัสดุ"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        เบอร์โทรศัพท์ / เบอร์ภายใน
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="034-595000 ต่อ 104"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      อีเมลสำหรับเข้าสู่ระบบ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="yourname@sangkhla-hospital.moph.go.th"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      กำหนดรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        required
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(!showRegPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Summary of rights assigned */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                      สิทธิ์การใช้งานสำหรับ {regRoleTitleTh}:
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        ดูแดชบอร์ด 52 สิทธิ์
                      </span>
                      {(regRole === 'ACCOUNTANT' || regRole === 'STATISTICIAN' || regRole === 'ADMIN') && (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          บันทึก/แก้ไขยอดลูกหนี้
                        </span>
                      )}
                      {(regRole === 'STATISTICIAN' || regRole === 'EXECUTIVE' || regRole === 'ADMIN') && (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          ตรวจสอบรายงาน
                        </span>
                      )}
                      {(regRole === 'EXECUTIVE' || regRole === 'ADMIN') && (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          ลงนามอนุมัติรายงานเสนอผู้บริหาร
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ยืนยันการสมัครและเข้าใช้งานระบบทันที</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('LOGIN');
                        setErrorMsg(null);
                      }}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      มีบัญชีอยู่แล้ว? กดเพื่อกลับไปหน้าเข้าสู่ระบบ
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Hosting & Database Status */}
          <div className="mt-4 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shadow-2xs">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ฐานข้อมูล: Cloud Firestore (Hospital Encrypted)</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Vercel Hosting พร้อมใช้งาน</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>กลุ่มงานประกันสุขภาพ ยุทธศาสตร์และสารสนเทศทางการแพทย์ โรงพยาบาลสังขละบุรี</span>
          <span>ระบบบริหารจัดการทะเบียนคุมลูกหนี้ 52 ผังบัญชี (SKB Management System)</span>
        </div>
      </footer>
    </div>
  );
};
