import React, { useState } from 'react';
import { NotificationLog, NotificationSettings, MonthlyRecord, UserProfile } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Bell,
  Smartphone,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Settings,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sliders,
  History,
  CheckCheck
} from 'lucide-react';

interface NotificationSystemViewProps {
  record: MonthlyRecord;
  currentUser: UserProfile;
  settings: NotificationSettings;
  logs: NotificationLog[];
  onUpdateSettings: (settings: NotificationSettings) => void;
  onAddLog: (log: NotificationLog) => void;
}

export const NotificationSystemView: React.FC<NotificationSystemViewProps> = ({
  record,
  currentUser,
  settings,
  logs,
  onUpdateSettings,
  onAddLog,
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  // Custom Dispatch State
  const [targetChannel, setTargetChannel] = useState<'SMS' | 'EMAIL' | 'BOTH'>('BOTH');
  const [customSubject, setCustomSubject] = useState(`สรุปยอดทะเบียนคุมลูกหนี้ รพ.สังขละบุรี (${record.monthName} ${record.year})`);
  const [customMsg, setCustomMsg] = useState(
    `[SKB Management System] สรุปยอด 52 สิทธิ์: ยอดตั้งใหม่ ${formatCurrency(
      record.items.reduce((acc, i) => acc + i.newDebt, 0)
    )} บ. รับชำระ ${formatCurrency(
      record.items.reduce((acc, i) => acc + i.paymentReceived, 0)
    )} บ. คงเหลือยกไป ${formatCurrency(
      record.items.reduce((acc, i) => acc + i.endingBalance, 0)
    )} บ. โปรดตรวจสอบรายงาน`
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    setSendSuccessNotice('บันทึกการตั้งค่าเบอร์โทรศัพท์และอีเมลเรียบร้อยแล้ว');
    setTimeout(() => setSendSuccessNotice(null), 3000);
  };

  const handleBroadcastMonthlySummary = async () => {
    setIsSending(true);

    const endingTotal = record.items.reduce((acc, i) => acc + i.endingBalance, 0);
    const paidTotal = record.items.reduce((acc, i) => acc + i.paymentReceived, 0);
    const newTotal = record.items.reduce((acc, i) => acc + i.newDebt, 0);
    const now = new Date();
    const timestampStr = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Dispatch SMS to Director
    setTimeout(() => {
      onAddLog({
        id: `log-${Date.now()}-1`,
        timestamp: timestampStr,
        channel: 'SMS',
        recipientName: 'นายแพทย์จิรวัฒน์ วงษ์สวัสดิ์ (รักษาการ ผอ.รพ.)',
        recipientTarget: localSettings.directorPhone,
        subject: 'แจ้งเตือนปิดยอดบัญชีลูกหนี้ 52 สิทธิ์',
        message: `[SKB-Hospital] ปิดยอดประจำเดือน ${record.monthName} ${record.year}: ตั้งหนี้ใหม่ ${formatCurrency(newTotal)} บ., ชำระแล้ว ${formatCurrency(paidTotal)} บ., ยอดคงเหลือ ${formatCurrency(endingTotal)} บ.`,
        status: 'DELIVERED',
        triggerEvent: 'ส่งสรุปยอดประจำเดือน (Broadcast)',
      });

      // Dispatch Email to Director
      onAddLog({
        id: `log-${Date.now()}-2`,
        timestamp: timestampStr,
        channel: 'EMAIL',
        recipientName: 'นายแพทย์จิรวัฒน์ วงษ์สวัสดิ์ (รักษาการ ผอ.รพ.)',
        recipientTarget: localSettings.directorEmail,
        subject: `รายงานสรุปการเรียกเก็บลูกหนี้และยอดคงเหลือลูกหนี้ ประจำเดือน ${record.monthName} ${record.year}`,
        message: `เรียน ผู้อำนวยการโรงพยาบาลสังขละบุรี ระบบได้ประมวลผลทะเบียนคุมลูกหนี้ 52 สิทธิ์ เรียบร้อยแล้ว ยอดคงเหลือสุทธิ ${formatCurrency(endingTotal)} บาท ขอเรียนเชิญตรวจสอบและลงนามรับรอง`,
        status: 'DELIVERED',
        triggerEvent: 'ส่งสรุปยอดประจำเดือน (Broadcast)',
      });

      // Dispatch SMS to Finance
      onAddLog({
        id: `log-${Date.now()}-3`,
        timestamp: timestampStr,
        channel: 'SMS',
        recipientName: 'นางสาวสุดลัดดา จันทวุฒิ (เจ้าหน้าที่ธุรการ/การเงิน)',
        recipientTarget: localSettings.financePhone,
        subject: 'ยืนยันปิดงวดบัญชี',
        message: `[SKB-Finance] ระบบบันทึกการปิดงวด ${record.monthName} ${record.year} ครบถ้วน และส่งรายงานถึงผู้บริหารเรียบร้อย`,
        status: 'DELIVERED',
        triggerEvent: 'ส่งสรุปยอดประจำเดือน (Broadcast)',
      });

      setIsSending(false);
      setSendSuccessNotice('ส่งแจ้งเตือนผ่านระบบ SMS และ Email สำเร็จแล้ว (3 ปลายทาง: สถานะ Delivered)');
      setTimeout(() => setSendSuccessNotice(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              ระบบแจ้งเตือนผ่านเบอร์มือถือ (SMS) และอีเมล (Email)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ส่งข้อมูลสรุปยอดและแจ้งเตือนลูกหนี้ค้างชำระถึงผู้บริหารและเจ้าหน้าที่โดยตรง
          </p>
        </div>

        <button
          onClick={handleBroadcastMonthlySummary}
          disabled={isSending}
          className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-2 transition-all"
        >
          {isSending ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              กำลังส่งข้อความ SMS & Email...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              ส่งสรุปยอดประจำเดือน (Broadcast)
            </>
          )}
        </button>
      </div>

      {sendSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sendSuccessNotice}</span>
        </div>
      )}

      {/* 2-Column: Settings & Quick Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              ตั้งค่าเบอร์มือถือและอีเมลประจำตำแหน่ง
            </h3>
            <span className="text-[11px] text-slate-400">สำหรับรับการแจ้งเตือน</span>
          </div>

          <form onSubmit={handleSaveSettings} className="mt-4 space-y-4 text-xs">
            {/* Director Contact */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                ผู้อำนวยการ รพ. (นพ.จิรวัฒน์ วงษ์สวัสดิ์)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">เบอร์โทรศัพท์ (SMS)</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={localSettings.directorPhone}
                      onChange={(e) => setLocalSettings({ ...localSettings, directorPhone: e.target.value })}
                      className="w-full bg-transparent font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">อีเมล (Email)</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={localSettings.directorEmail}
                      onChange={(e) => setLocalSettings({ ...localSettings, directorEmail: e.target.value })}
                      className="w-full bg-transparent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Finance Officer Contact */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                เจ้าหน้าที่การเงิน/ธุรการ (น.ส.สุดลัดดา จันทวุฒิ)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">เบอร์โทรศัพท์ (SMS)</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={localSettings.financePhone}
                      onChange={(e) => setLocalSettings({ ...localSettings, financePhone: e.target.value })}
                      className="w-full bg-transparent font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">อีเมล (Email)</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={localSettings.financeEmail}
                      onChange={(e) => setLocalSettings({ ...localSettings, financeEmail: e.target.value })}
                      className="w-full bg-transparent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Statistician Contact */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                เจ้าพนักงานเวชสถิติ (น.ส.มยุรา ปรางจันทร์)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">เบอร์โทรศัพท์ (SMS)</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={localSettings.statisticianPhone}
                      onChange={(e) => setLocalSettings({ ...localSettings, statisticianPhone: e.target.value })}
                      className="w-full bg-transparent font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">อีเมล (Email)</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={localSettings.statisticianEmail}
                      onChange={(e) => setLocalSettings({ ...localSettings, statisticianEmail: e.target.value })}
                      className="w-full bg-transparent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        </div>

        {/* Message Composition / Test Dispatch */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                ส่งข้อความแจ้งเตือนด่วน (Direct Dispatch)
              </h3>
              <span className="text-[11px] text-slate-400">ระบบ Gateway รพ.</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">ช่องทางจัดส่ง</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetChannel('BOTH')}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                      targetChannel === 'BOTH'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    SMS + Email (พร้อมกัน)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetChannel('SMS')}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                      targetChannel === 'SMS'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    เฉพาะ SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetChannel('EMAIL')}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                      targetChannel === 'EMAIL'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    เฉพาะ Email
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">หัวข้อข้อความ</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">เนื้อหาข้อความ</label>
                <textarea
                  rows={4}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleBroadcastMonthlySummary}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              ส่งข้อความทันที
            </button>
          </div>
        </div>
      </div>

      {/* Notification Logs Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            ประวัติการส่งข้อความแจ้งเตือน (Notification Logs)
          </h3>
          <span className="text-xs text-slate-500">บันทึกทั้งหมด {logs.length} รายการ</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                <th className="py-2 px-2.5">วันเวลา</th>
                <th className="py-2 px-2.5">ช่องทาง</th>
                <th className="py-2 px-2.5">ผู้รับ / เบอร์ / อีเมล</th>
                <th className="py-2 px-2.5">หัวข้อ / ข้อความ</th>
                <th className="py-2 px-2.5">เหตุการณ์</th>
                <th className="py-2 px-2.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    {log.channel === 'SMS' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                        <Smartphone className="w-3 h-3" />
                        SMS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        <Mail className="w-3 h-3" />
                        Email
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {log.recipientName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {log.recipientTarget}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 max-w-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {log.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {log.message}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                    {log.triggerEvent}
                  </td>
                  <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ส่งถึงแล้ว (Delivered)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
