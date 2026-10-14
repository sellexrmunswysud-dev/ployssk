import React, { useState } from 'react';
import { MonthlyRecord, UserProfile } from '../types';
import { formatCurrency, exportToExcelFile, THAI_MONTHS } from '../utils/formatters';
import { SangkhlaburiLogo } from './SangkhlaburiLogo';
import {
  Printer,
  FileSpreadsheet,
  CheckCircle,
  Edit3,
  Calendar,
  Building,
  UserCheck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface OfficialReportViewProps {
  record: MonthlyRecord;
  currentUser: UserProfile;
  onUpdateRecord: (updatedRecord: MonthlyRecord) => void;
}

export const OfficialReportView: React.FC<OfficialReportViewProps> = ({
  record,
  currentUser,
  onUpdateRecord,
}) => {
  // Pre-print editable settings
  const [reportTitle, setReportTitle] = useState('รายงานสรุปการเรียกเก็บลูกหนี้และยอดคงเหลือลูกหนี้แต่ละสิทธิ');
  const [reportPeriod, setReportPeriod] = useState(`ประจำเดือน...${record.monthName}...${record.year}.......`);
  const [hospitalUnit, setHospitalUnit] = useState('งานประกันสุขภาพฯ โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี');

  // Signatures
  const [reporterName, setReporterName] = useState(record.reporter.name);
  const [reporterPos, setReporterPos] = useState(record.reporter.position);
  const [isReporterSigned, setIsReporterSigned] = useState(record.reporter.isSigned ?? true);

  const [reviewerName, setReviewerName] = useState(record.reviewer.name);
  const [reviewerPos, setReviewerPos] = useState(record.reviewer.position);
  const [isReviewerSigned, setIsReviewerSigned] = useState(record.reviewer.isSigned ?? true);

  const [approverName, setApproverName] = useState(record.approver.name);
  const [approverPos, setApproverPos] = useState(record.approver.position);
  const [isApproverSigned, setIsApproverSigned] = useState(record.approver.isSigned ?? false);

  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);

  // Group 52 items
  const govItems = record.items.filter((i) => i.category === 'GOVERNMENT');
  const extItems = record.items.filter((i) => i.category === 'EXTERNAL');

  // Gov subtotal
  const govInitial = govItems.reduce((acc, i) => acc + i.initialBalance, 0);
  const govNew = govItems.reduce((acc, i) => acc + i.newDebt, 0);
  const govPaid = govItems.reduce((acc, i) => acc + i.paymentReceived, 0);
  const govEnding = govItems.reduce((acc, i) => acc + i.endingBalance, 0);

  // Ext subtotal
  const extInitial = extItems.reduce((acc, i) => acc + i.initialBalance, 0);
  const extNew = extItems.reduce((acc, i) => acc + i.newDebt, 0);
  const extPaid = extItems.reduce((acc, i) => acc + i.paymentReceived, 0);
  const extEnding = extItems.reduce((acc, i) => acc + i.endingBalance, 0);

  // Grand Total
  const totalInitial = govInitial + extInitial;
  const totalNew = govNew + extNew;
  const totalPaid = govPaid + extPaid;
  const totalEnding = govEnding + extEnding;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportToExcelFile(record);
  };

  const handleExecutiveApprove = () => {
    setIsApproverSigned(true);
    const updated: MonthlyRecord = {
      ...record,
      status: 'APPROVED',
      approver: {
        ...record.approver,
        name: approverName,
        position: approverPos,
        isSigned: true,
        signDate: new Date().toLocaleDateString('th-TH'),
      },
    };
    onUpdateRecord(updated);
  };

  return (
    <div className="space-y-6">
      {/* Control Action Toolbar (Hidden during print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            รายงานประจำเดือนเสนอผู้บริหาร (Official Hospital Form)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แบบฟอร์มรายงานมาตรฐานราชการ โรงพยาบาลสังขละบุรี พร้อมช่องลงนาม 3 ลำดับชั้น
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEditHeaderOpen(!isEditHeaderOpen)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            ปรับแก้หัวข้อ/ผู้ลงนาม
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            ส่งออก Excel (.xls)
          </button>

          {currentUser.canApprove && !isApproverSigned && (
            <button
              onClick={handleExecutiveApprove}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              ลงนามรับรองรายงาน (ผอ.รพ.)
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน (Print A4)
          </button>
        </div>
      </div>

      {/* Pre-print Customization Accordion (Hidden during print) */}
      {isEditHeaderOpen && (
        <div className="no-print p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">
            ปรับแก้ไขข้อความก่อนพิมพ์ (Customize Report Header & Signatures)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-500 block mb-1">หัวรายงาน</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">งวดประจำเดือน</label>
              <input
                type="text"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">หน่วยงานเจ้าของเรื่อง</label>
              <input
                type="text"
                value={hospitalUnit}
                onChange={(e) => setHospitalUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">1. ผู้รายงาน</span>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                value={reporterPos}
                onChange={(e) => setReporterPos(e.target.value)}
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">2. ผู้ตรวจสอบ</span>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                value={reviewerPos}
                onChange={(e) => setReviewerPos(e.target.value)}
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">3. ผู้รับรอง (ผอ.รพ.)</span>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                value={approverPos}
                onChange={(e) => setApproverPos(e.target.value)}
                className="w-full px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Document Container */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 sm:p-10 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm print:bg-white print:text-black print:border-none print:shadow-none print:p-0 transition-colors">
        {/* Document Header with Sangkhlaburi Hospital Emblem */}
        <div className="flex flex-col items-center justify-center text-center pb-6 border-b border-slate-200 dark:border-slate-800 print:border-b-2 print:border-slate-900">
          <div className="mb-2">
            <SangkhlaburiLogo size={64} className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white font-serif">
            {reportTitle}
          </h1>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {reportPeriod}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {hospitalUnit}
          </div>
        </div>

        {/* 52-Rights Formal Official Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse print-table text-xs border border-slate-800 dark:border-slate-700">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border-b border-slate-800 dark:border-slate-700 text-[11px] font-semibold text-center">
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-10">ลำดับ</th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-28">รหัสบัญชี</th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 text-left min-w-[240px]">
                  รายการสิทธิการรักษาพยาบาล
                </th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-28">
                  ยอดลูกหนี้ยกมา<br /><span className="text-[10px] font-normal">ณ 31 ก.ค.</span>
                </th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-28">
                  ยอดลูกหนี้ของเดือน<br /><span className="text-[10px] font-normal">(ตั้งหนี้ใหม่)</span>
                </th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-28">
                  ยอดรับชำระ<br /><span className="text-[10px] font-normal">ระหว่างเดือน</span>
                </th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-28 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 print:bg-slate-200 print:text-black">
                  ยอดลูกหนี้ยกไป<br /><span className="text-[10px] font-normal">ณ 31 ส.ค.</span>
                </th>
                <th className="py-2 px-2 border border-slate-800 dark:border-slate-700 w-24">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {/* Category 1 Header: ลูกหนี้การค้า-หน่วยงานภาครัฐ (รหัส 1102050101) */}
              <tr className="bg-slate-200/90 dark:bg-slate-800 font-bold border-b border-slate-800 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                <td colSpan={8} className="py-1.5 px-3 border border-slate-800 dark:border-slate-700">
                  ลูกหนี้การค้า-หน่วยงานภาครัฐ (รหัส 1102050101)
                </td>
              </tr>
              {govItems.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-center font-mono text-slate-500 dark:text-slate-400">
                    {index + 1}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {item.code}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    {item.name}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(item.initialBalance)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums text-sky-700 dark:text-sky-400">
                    {formatCurrency(item.newDebt)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(item.paymentReceived)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums font-semibold bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-900 dark:text-emerald-200 print:bg-transparent print:text-black">
                    {formatCurrency(item.endingBalance)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    {item.notes || ''}
                  </td>
                </tr>
              ))}
              {/* Category 1 Subtotal */}
              <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-t border-b-2 border-slate-800 dark:border-slate-700 text-slate-900 dark:text-white">
                <td colSpan={3} className="py-1.5 px-3 text-center border border-slate-800 dark:border-slate-700">
                  รวม (ลูกหนี้การค้า-หน่วยงานภาครัฐ)
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(govInitial)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(govNew)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(govPaid)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(govEnding)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700"></td>
              </tr>

              {/* Category 2 Header: ลูกหนี้การค้า - บุคคลภายนอก (รหัส 1102050102) */}
              <tr className="bg-slate-200/90 dark:bg-slate-800 font-bold border-b border-slate-800 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                <td colSpan={8} className="py-1.5 px-3 border border-slate-800 dark:border-slate-700">
                  ลูกหนี้การค้า - บุคคลภายนอก (รหัส 1102050102)
                </td>
              </tr>
              {extItems.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-center font-mono text-slate-500 dark:text-slate-400">
                    {govItems.length + index + 1}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {item.code}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    {item.name}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(item.initialBalance)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums text-sky-700 dark:text-sky-400">
                    {formatCurrency(item.newDebt)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(item.paymentReceived)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-right font-mono tabular-nums font-semibold bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-900 dark:text-emerald-200 print:bg-transparent print:text-black">
                    {formatCurrency(item.endingBalance)}
                  </td>
                  <td className="py-1 px-2 border border-slate-300 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    {item.notes || ''}
                  </td>
                </tr>
              ))}
              {/* Category 2 Subtotal */}
              <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-t border-b-2 border-slate-800 dark:border-slate-700 text-slate-900 dark:text-white">
                <td colSpan={3} className="py-1.5 px-3 text-center border border-slate-800 dark:border-slate-700">
                  รวม (ลูกหนี้การค้า - บุคคลภายนอก)
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(extInitial)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(extNew)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(extPaid)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700 text-right font-mono tabular-nums">
                  {formatCurrency(extEnding)}
                </td>
                <td className="py-1.5 px-2 border border-slate-800 dark:border-slate-700"></td>
              </tr>

              {/* Grand Total Row */}
              <tr className="bg-emerald-100 dark:bg-emerald-950/80 font-extrabold border-t-2 border-b-2 border-slate-900 dark:border-emerald-700 text-slate-950 dark:text-emerald-200 text-sm">
                <td colSpan={3} className="py-2.5 px-3 text-center border border-slate-900 dark:border-emerald-700">
                  รวมทั้งหมด (52 สิทธิ์การรักษาพยาบาล)
                </td>
                <td className="py-2.5 px-2 border border-slate-900 dark:border-emerald-700 text-right font-mono tabular-nums">
                  {formatCurrency(totalInitial)}
                </td>
                <td className="py-2.5 px-2 border border-slate-900 dark:border-emerald-700 text-right font-mono tabular-nums">
                  {formatCurrency(totalNew)}
                </td>
                <td className="py-2.5 px-2 border border-slate-900 dark:border-emerald-700 text-right font-mono tabular-nums">
                  {formatCurrency(totalPaid)}
                </td>
                <td className="py-2.5 px-2 border border-slate-900 dark:border-emerald-700 text-right font-mono tabular-nums text-emerald-950 dark:text-emerald-100 font-black">
                  {formatCurrency(totalEnding)}
                </td>
                <td className="py-2.5 px-2 border border-slate-900 dark:border-emerald-700 text-center text-xs font-normal">
                  บาท
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3-Tier Official Signatures (Exactly as specified in prompt and hospital document) */}
        <div className="mt-12 pt-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-xs print:grid-cols-3 print-break-inside-avoid">
          {/* Level 1: ผู้รายงาน */}
          <div className="flex flex-col items-center">
            <div className="h-14 flex items-end justify-center pb-2">
              {isReporterSigned && (
                <div className="font-serif italic text-base text-blue-900 dark:text-blue-300 select-none">
                  {reporterName}
                </div>
              )}
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-medium">
              (......{reporterName}......)
            </div>
            <div className="text-slate-700 dark:text-slate-400 mt-1">
              ตำแหน่ง....{reporterPos}....
            </div>
            <div className="text-slate-900 dark:text-slate-200 font-bold mt-2">
              ผู้รายงาน
            </div>
          </div>

          {/* Level 2: ผู้ตรวจสอบ */}
          <div className="flex flex-col items-center">
            <div className="h-14 flex items-end justify-center pb-2">
              {isReviewerSigned && (
                <div className="font-serif italic text-base text-blue-900 dark:text-blue-300 select-none">
                  {reviewerName}
                </div>
              )}
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-medium">
              (......{reviewerName}......)
            </div>
            <div className="text-slate-700 dark:text-slate-400 mt-1">
              ตำแหน่ง....{reviewerPos}....
            </div>
            <div className="text-slate-900 dark:text-slate-200 font-bold mt-2">
              ผู้ตรวจสอบ
            </div>
          </div>

          {/* Level 3: ผู้รับรอง (ผู้อำนวยการ รพ.) */}
          <div className="flex flex-col items-center">
            <div className="h-14 flex items-end justify-center pb-2">
              {isApproverSigned ? (
                <div className="font-serif italic text-base text-emerald-900 dark:text-emerald-300 select-none flex items-center gap-1">
                  <span>{approverName}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                </div>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-[11px] italic">
                  (รอรับรองรายงาน)
                </div>
              )}
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-medium">
              (.....{approverName}.....)
            </div>
            <div className="text-slate-700 dark:text-slate-400 mt-1 max-w-xs">
              {approverPos}
            </div>
            <div className="text-slate-900 dark:text-slate-200 font-bold mt-2">
              ผู้รับรอง
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
