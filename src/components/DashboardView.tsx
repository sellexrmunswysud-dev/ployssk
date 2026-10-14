import React, { useMemo } from 'react';
import { RightsItem, MonthlyRecord } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { 
  TrendingUp, 
  ArrowUpRight, 
  CreditCard, 
  AlertTriangle, 
  ShieldAlert, 
  Building2, 
  Users, 
  FileCheck2,
  Calendar,
  Layers,
  Percent,
  CheckCircle2,
  Flame
} from 'lucide-react';

interface DashboardViewProps {
  record: MonthlyRecord;
  onNavigateToLedger: (filterMode?: 'OVERDUE' | 'ALL' | 'GOV' | 'EXT') => void;
  onNavigateToReport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  record,
  onNavigateToLedger,
  onNavigateToReport,
}) => {
  const items = record.items;

  // Key totals
  const stats = useMemo(() => {
    let initialTotal = 0;
    let newDebtTotal = 0;
    let paymentTotal = 0;
    let badDebtTotal = 0;
    let endingTotal = 0;

    let govEnding = 0;
    let extEnding = 0;
    let govPayment = 0;
    let extPayment = 0;
    let govNew = 0;
    let extNew = 0;

    let overdue30DaysCount = 0;
    let overdue30DaysTotal = 0;

    // Aging breakdown
    let agingUnder30 = 0;
    let aging31to60 = 0;
    let aging61to90 = 0;
    let agingOver90 = 0;

    // Fund distribution
    const funds: Record<string, { initial: number; newD: number; paid: number; ending: number }> = {
      'UC บัตรทอง': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'ประกันสังคม': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'กรมบัญชีกลาง (ข้าราชการ)': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'ต่างด้าว / ชายแดน': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'อปท. ท้องถิ่น': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'ผู้ป่วยจ่ายเอง (Self-Pay)': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'พรบ. รถ': { initial: 0, newD: 0, paid: 0, ending: 0 },
      'บริการตรวจ/อื่นๆ': { initial: 0, newD: 0, paid: 0, ending: 0 },
    };

    items.forEach((item) => {
      initialTotal += item.initialBalance;
      newDebtTotal += item.newDebt;
      paymentTotal += item.paymentReceived;
      badDebtTotal += item.badDebtWrittenOff;
      endingTotal += item.endingBalance;

      if (item.category === 'GOVERNMENT') {
        govEnding += item.endingBalance;
        govPayment += item.paymentReceived;
        govNew += item.newDebt;
      } else {
        extEnding += item.endingBalance;
        extPayment += item.paymentReceived;
        extNew += item.newDebt;
      }

      if (item.daysOverdue > 30 && item.endingBalance > 0) {
        overdue30DaysCount += 1;
        overdue30DaysTotal += item.endingBalance;
      }

      // Aging
      if (item.daysOverdue <= 30) {
        agingUnder30 += item.endingBalance;
      } else if (item.daysOverdue <= 60) {
        aging31to60 += item.endingBalance;
      } else if (item.daysOverdue <= 90) {
        aging61to90 += item.endingBalance;
      } else {
        agingOver90 += item.endingBalance;
      }

      // Fund allocation
      const name = item.name.toLowerCase();
      const code = item.code;
      if (name.includes('uc') || code.includes('.201') || code.includes('.202') || code.includes('.203') || code.includes('.204') || code.includes('.209') || code.includes('.216') || code.includes('.217')) {
        funds['UC บัตรทอง'].initial += item.initialBalance;
        funds['UC บัตรทอง'].newD += item.newDebt;
        funds['UC บัตรทอง'].paid += item.paymentReceived;
        funds['UC บัตรทอง'].ending += item.endingBalance;
      } else if (name.includes('ประกันสังคม') || name.includes('กองทุนทดแทน')) {
        funds['ประกันสังคม'].initial += item.initialBalance;
        funds['ประกันสังคม'].newD += item.newDebt;
        funds['ประกันสังคม'].paid += item.paymentReceived;
        funds['ประกันสังคม'].ending += item.endingBalance;
      } else if (name.includes('กรมบัญชีกลาง')) {
        funds['กรมบัญชีกลาง (ข้าราชการ)'].initial += item.initialBalance;
        funds['กรมบัญชีกลาง (ข้าราชการ)'].newD += item.newDebt;
        funds['กรมบัญชีกลาง (ข้าราชการ)'].paid += item.paymentReceived;
        funds['กรมบัญชีกลาง (ข้าราชการ)'].ending += item.endingBalance;
      } else if (name.includes('ต่างด้าว') || name.includes('สถานะและสิทธิ')) {
        funds['ต่างด้าว / ชายแดน'].initial += item.initialBalance;
        funds['ต่างด้าว / ชายแดน'].newD += item.newDebt;
        funds['ต่างด้าว / ชายแดน'].paid += item.paymentReceived;
        funds['ต่างด้าว / ชายแดน'].ending += item.endingBalance;
      } else if (name.includes('อปท') || name.includes('ท้องถิ่น')) {
        funds['อปท. ท้องถิ่น'].initial += item.initialBalance;
        funds['อปท. ท้องถิ่น'].newD += item.newDebt;
        funds['อปท. ท้องถิ่น'].paid += item.paymentReceived;
        funds['อปท. ท้องถิ่น'].ending += item.endingBalance;
      } else if (name.includes('ชำระเงิน') || name.includes('เบิกต้นสังกัด')) {
        funds['ผู้ป่วยจ่ายเอง (Self-Pay)'].initial += item.initialBalance;
        funds['ผู้ป่วยจ่ายเอง (Self-Pay)'].newD += item.newDebt;
        funds['ผู้ป่วยจ่ายเอง (Self-Pay)'].paid += item.paymentReceived;
        funds['ผู้ป่วยจ่ายเอง (Self-Pay)'].ending += item.endingBalance;
      } else if (name.includes('พรบ')) {
        funds['พรบ. รถ'].initial += item.initialBalance;
        funds['พรบ. รถ'].newD += item.newDebt;
        funds['พรบ. รถ'].paid += item.paymentReceived;
        funds['พรบ. รถ'].ending += item.endingBalance;
      } else {
        funds['บริการตรวจ/อื่นๆ'].initial += item.initialBalance;
        funds['บริการตรวจ/อื่นๆ'].newD += item.newDebt;
        funds['บริการตรวจ/อื่นๆ'].paid += item.paymentReceived;
        funds['บริการตรวจ/อื่นๆ'].ending += item.endingBalance;
      }
    });

    const totalAvailableToCollect = initialTotal + newDebtTotal;
    const collectionRate = totalAvailableToCollect > 0 ? (paymentTotal / totalAvailableToCollect) * 100 : 0;
    const govCollectionRate = (govPayment / (govPayment + govEnding || 1)) * 100;
    const extCollectionRate = (extPayment / (extPayment + extEnding || 1)) * 100;

    return {
      initialTotal,
      newDebtTotal,
      paymentTotal,
      badDebtTotal,
      endingTotal,
      collectionRate,
      govEnding,
      extEnding,
      govPayment,
      extPayment,
      govNew,
      extNew,
      govCollectionRate,
      extCollectionRate,
      overdue30DaysCount,
      overdue30DaysTotal,
      agingUnder30,
      aging31to60,
      aging61to90,
      agingOver90,
      funds,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Period Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                งวดบัญชี: {record.monthName} {record.year}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                สถานะ: {record.status === 'APPROVED' ? 'รับรองแล้ว' : record.status === 'REVIEWED' ? 'ตรวจสอบแล้ว' : 'ฉบับร่าง'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              งานประกันสุขภาพฯ โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี · ทะเบียนคุม 52 สิทธิ์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToLedger('ALL')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            เปิดทะเบียนคุม 52 สิทธิ์
          </button>
          <button
            onClick={onNavigateToReport}
            className="px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            พิมพ์รายงานราชการ
          </button>
        </div>
      </div>

      {/* Urgent Flashing Alarm Card (Overdue > 30 Days) */}
      {stats.overdue30DaysCount > 0 && (
        <div className="p-4 rounded-xl border-2 border-red-500/80 bg-red-50 dark:bg-red-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center animate-urgent shadow-md shadow-red-500/20">
                <Flame className="w-6 h-6" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  แจ้งเตือนด่วน: หนี้ค้างชำระเกิน 30 วัน (Urgent Overdue Alert)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200">
                  {stats.overdue30DaysCount} สิทธิ์
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                มียอดลูกหนี้ค้างชำระเกิน 1 เดือน รวม <strong className="font-mono tabular-nums">{formatCurrency(stats.overdue30DaysTotal)} บาท</strong> (ส่วนใหญ่เป็นกลุ่มเบิกจ่ายตรง, ผู้ป่วยชำระเงินเอง และกองทุนนอก CUP)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateToLedger('OVERDUE')}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              กรองดูรายการเร่งด่วนทันที ({stats.overdue30DaysCount})
            </button>
          </div>
        </div>
      )}

      {/* 5 Core Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: ยอดตั้งต้น */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">1. ยอดลูกหนี้ยกมา</span>
            <span className="text-xs text-slate-400">ณ 31 ก.ค.</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(stats.initialTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>52 สิทธิ์การรักษา</span>
          </div>
        </div>

        {/* Card 2: ยอดตั้งใหม่ */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">2. ยอดลูกหนี้ของเดือน</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
            +{formatCurrency(stats.newDebtTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            ตั้งหนี้ใหม่ระหว่างเดือน
          </div>
        </div>

        {/* Card 3: ยอดรับชำระ + Collection Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">3. ยอดรับชำระระหว่างเดือน</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            -{formatCurrency(stats.paymentTotal)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
            <Percent className="w-3 h-3" />
            <span>จัดเก็บได้ {formatPercent(stats.collectionRate)}</span>
          </div>
        </div>

        {/* Card 4: ยอดตัดหนี้สูญ */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">4. ยอดตัดหนี้สูญ</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {formatCurrency(stats.badDebtTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            รอการพิจารณาจำหน่าย
          </div>
        </div>

        {/* Card 5: ยอดคงเหลือยกไป */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-2">
            <span className="text-xs font-bold">5. ยอดลูกหนี้ยกไป</span>
            <span className="text-xs text-emerald-600 font-mono">ณ 31 ส.ค.</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200">
            {formatCurrency(stats.endingTotal)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
            ยอดสุทธิยกไปเดือนถัดไป
          </div>
        </div>
      </div>

      {/* Comparison: Government vs External Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Split Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                เปรียบเทียบสัดส่วนลูกหนี้ภาครัฐ vs บุคคลภายนอก
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                หมวด 1 (รหัส 1102050101: 33 รายการ) vs หมวด 2 (รหัส 1102050102: 19 รายการ)
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* Government Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  <span>หมวด 1: ลูกหนี้ภาครัฐ (33 รายการ)</span>
                </div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(stats.govEnding)} บ. ({formatPercent((stats.govEnding / stats.endingTotal) * 100)})
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(stats.govEnding / stats.endingTotal) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>ตั้งใหม่: {formatCurrency(stats.govNew)} บ.</span>
                <span>รับชำระ: {formatCurrency(stats.govPayment)} บ.</span>
              </div>
            </div>

            {/* External Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
                  <span>หมวด 2: ลูกหนี้บุคคลภายนอก (19 รายการ)</span>
                </div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(stats.extEnding)} บ. ({formatPercent((stats.extEnding / stats.endingTotal) * 100)})
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(stats.extEnding / stats.endingTotal) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>ตั้งใหม่: {formatCurrency(stats.extNew)} บ.</span>
                <span>รับชำระ: {formatCurrency(stats.extPayment)} บ.</span>
              </div>
            </div>

            {/* Quick Summary Pill Strip */}
            <div className="pt-3 grid grid-cols-2 gap-3 text-xs border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-[11px]">อัตราจัดเก็บลูกหนี้ภาครัฐ</span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatPercent((stats.govPayment / (stats.govPayment + stats.govEnding)) * 100)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-[11px]">อัตราจัดเก็บลูกหนี้ภายนอก</span>
                <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {formatPercent((stats.extPayment / (stats.extPayment + stats.extEnding)) * 100)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Aging Distribution Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                การวิเคราะห์อายุหนี้ (Debt Aging Analysis)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามระยะเวลาค้างชำระตามมาตรการเร่งรัดหนี้สินทางการแพทย์
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Normal (< 30 days) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">ปกติ: ค้างชำระ 0 - 30 วัน</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
                  {formatCurrency(stats.agingUnder30)} บ. ({formatPercent((stats.agingUnder30 / stats.endingTotal) * 100)})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(stats.agingUnder30 / stats.endingTotal) * 100}%` }}
                />
              </div>
            </div>

            {/* 31 - 60 days */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">เตือน: ค้างชำระ 31 - 60 วัน</span>
                <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                  {formatCurrency(stats.aging31to60)} บ. ({formatPercent((stats.aging31to60 / stats.endingTotal) * 100)})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${(stats.aging31to60 / stats.endingTotal) * 100}%` }}
                />
              </div>
            </div>

            {/* 61 - 90 days */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">เร่งรัด: ค้างชำระ 61 - 90 วัน</span>
                <span className="font-mono tabular-nums text-orange-600 dark:text-orange-400 font-semibold">
                  {formatCurrency(stats.aging61to90)} บ. ({formatPercent((stats.aging61to90 / stats.endingTotal) * 100)})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full"
                  style={{ width: `${(stats.aging61to90 / stats.endingTotal) * 100}%` }}
                />
              </div>
            </div>

            {/* > 90 days */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium text-red-600 dark:text-red-400">
                  วิกฤต: ค้างชำระ &gt; 90 วัน (ติดตามพิเศษ)
                </span>
                <span className="font-mono tabular-nums text-red-600 dark:text-red-400 font-semibold">
                  {formatCurrency(stats.agingOver90)} บ. ({formatPercent((stats.agingOver90 / stats.endingTotal) * 100)})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-600 h-full rounded-full"
                  style={{ width: `${(stats.agingOver90 / stats.endingTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Health Fund / Rights Categories */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              สัดส่วนยอดลูกหนี้คงเหลือยกไป แยกตามกองทุนและประเภทสิทธิ
            </h3>
            <p className="text-xs text-slate-500">
              วิเคราะห์โครงสร้างลูกหนี้ 7 กองทุนหลักของโรงพยาบาลสังขละบุรี
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            รวม 14,988,727.69 บาท
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(stats.funds).map(([fundName, fundData]) => {
            const share = (fundData.ending / (stats.endingTotal || 1)) * 100;
            return (
              <div
                key={fundName}
                className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {fundName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatPercent(share)}
                    </span>
                  </div>
                  <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {formatCurrency(fundData.ending)} บ.
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>รับชำระ: {formatCurrency(fundData.paid)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
