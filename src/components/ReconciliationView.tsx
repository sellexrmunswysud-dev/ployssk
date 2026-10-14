import React, { useState, useMemo } from 'react';
import { MonthlyRecord, RightsItem, ReconciliationRow } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  GitCompare,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface ReconciliationViewProps {
  record: MonthlyRecord;
  onUpdateRecord: (updatedRecord: MonthlyRecord) => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  record,
  onUpdateRecord,
}) => {
  // Pre-seed some slight external discrepancies to demonstrate the comparison feature realistically
  const [externalData, setExternalData] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    record.items.forEach((item) => {
      // By default most match, but let 4 items have slight differences (e.g. HIS e-Claim clearing delay)
      if (item.code === '1102050101.203') {
        initialMap[item.code] = item.endingBalance - 2500.00; // HIS shows 2,500 less
      } else if (item.code === '1102050101.301') {
        initialMap[item.code] = item.endingBalance + 4120.50; // HIS shows 4,120.50 more
      } else if (item.code === '1102050102.106') {
        initialMap[item.code] = item.endingBalance - 10000.00; // Counter receipt paid earlier
      } else if (item.code === '1102050102.801') {
        initialMap[item.code] = item.endingBalance + 1250.00;
      } else {
        initialMap[item.code] = item.endingBalance;
      }
    });
    return initialMap;
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DISCREPANCY' | 'MATCH'>('ALL');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Generate comparison rows
  const comparisonRows: ReconciliationRow[] = useMemo(() => {
    return record.items.map((item) => {
      const extBal = externalData[item.code] !== undefined ? externalData[item.code] : item.endingBalance;
      const diff = Math.round((item.endingBalance - extBal) * 100) / 100;
      return {
        code: item.code,
        name: item.name,
        systemEndingBalance: item.endingBalance,
        externalEndingBalance: extBal,
        difference: diff,
        status: Math.abs(diff) < 0.01 ? 'MATCH' : 'DISCREPANCY',
        lastCheckedDate: new Date().toLocaleDateString('th-TH'),
      };
    });
  }, [record.items, externalData]);

  const discrepancyCount = useMemo(() => {
    return comparisonRows.filter((r) => r.status === 'DISCREPANCY').length;
  }, [comparisonRows]);

  const totalDiscrepancySum = useMemo(() => {
    return comparisonRows.reduce((acc, r) => acc + Math.abs(r.difference), 0);
  }, [comparisonRows]);

  // One-click reconcile all
  const handleAutoReconcileAll = () => {
    const updatedItems = record.items.map((item) => {
      const targetBal = externalData[item.code];
      if (targetBal !== undefined && targetBal !== item.endingBalance) {
        // Adjust paymentReceived or newDebt to align cleanly
        const diff = targetBal - item.endingBalance;
        return {
          ...item,
          endingBalance: targetBal,
          notes: item.notes ? `${item.notes} · ปรับยอดกระทบยอด HIS (${diff > 0 ? '+' : ''}${diff.toFixed(2)})` : `ปรับยอดกระทบยอด HIS (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`,
        };
      }
      return item;
    });

    onUpdateRecord({
      ...record,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    });

    setSuccessNotice(`คลิกเดียวปรับยอดเรียบร้อย: ปรับยอดลูกหนี้ทั้ง ${discrepancyCount} รายการให้ตรงกับระบบเดิมทันที 100%`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Reconcile single row
  const handleReconcileRow = (code: string) => {
    const targetBal = externalData[code];
    if (targetBal === undefined) return;

    const updatedItems = record.items.map((item) => {
      if (item.code === code) {
        return {
          ...item,
          endingBalance: targetBal,
          notes: item.notes ? `${item.notes} · ปรับยอดตรงกับ HIS` : 'ปรับยอดตรงกับ HIS',
        };
      }
      return item;
    });

    onUpdateRecord({
      ...record,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    });

    setSuccessNotice(`ปรับยอดรหัส ${code} ตรงกับระบบ HIS เรียบร้อย`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Handle CSV/File import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      const newMap = { ...externalData };
      let matchedCount = 0;

      lines.forEach((line) => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const code = parts[0].trim().replace(/"/g, '');
          const val = parseFloat(parts[1].trim().replace(/"/g, ''));
          if (code && !isNaN(val)) {
            newMap[code] = val;
            matchedCount++;
          }
        }
      });

      setExternalData(newMap);
      setSuccessNotice(`นำเข้าข้อมูลไฟล์สำเร็จ: จับคู่รหัสบัญชีได้ ${matchedCount} รายการ`);
      setTimeout(() => setSuccessNotice(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredRows = comparisonRows.filter((r) => {
    if (activeFilter === 'DISCREPANCY') return r.status === 'DISCREPANCY';
    if (activeFilter === 'MATCH') return r.status === 'MATCH';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-emerald-600" />
            ระบบนำเข้าและเปรียบเทียบข้อมูลลูกหนี้อัตโนมัติ (Reconciliation)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เปรียบเทียบยอดคงเหลือ 52 สิทธิ์ ระหว่างระบบทะเบียนคุม SKB กับข้อมูลสารสนเทศโรงพยาบาล (HIS/HOSxP)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            นำเข้าไฟล์ข้อมูลเปรียบเทียบ (CSV)
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          {discrepancyCount > 0 && (
            <button
              onClick={handleAutoReconcileAll}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              คลิกเดียวปรับยอดให้ตรงกับระบบเดิมทันที ({discrepancyCount} รายการ)
            </button>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Summary Comparison KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">รายการสิทธิทั้งหมด</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            52 สิทธิ์
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">ครอบคลุมทุกกองทุน รพ.สังขละบุรี</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">สถานะยอดตรงกัน 100%</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span>{52 - discrepancyCount} สิทธิ์</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 inline" />
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            ไม่มีผลต่างทางบัญชี
          </span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${
          discrepancyCount > 0
            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <span className="text-xs text-slate-500 block mb-1">พบผลต่างที่ต้องกระทบยอด</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <span>{discrepancyCount} สิทธิ์</span>
            {discrepancyCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500 inline" />}
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 block font-mono">
            มูลค่าผลต่างรวม: {formatCurrency(totalDiscrepancySum)} บาท
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          ทั้งหมด (52)
        </button>
        <button
          onClick={() => setActiveFilter('DISCREPANCY')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeFilter === 'DISCREPANCY'
              ? 'bg-amber-500 text-white font-bold'
              : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          เฉพาะรายการมีผลต่าง ({discrepancyCount})
        </button>
        <button
          onClick={() => setActiveFilter('MATCH')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeFilter === 'MATCH'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          เฉพาะรายการที่ตรงกัน ({52 - discrepancyCount})
        </button>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <th className="py-3 px-3 w-36 font-semibold">รหัสบัญชี</th>
                <th className="py-3 px-3 min-w-[260px] font-semibold">รายการสิทธิการรักษาพยาบาล</th>
                <th className="py-3 px-3 text-right w-36 font-semibold">ยอดคงเหลือในระบบ SKB</th>
                <th className="py-3 px-3 text-right w-36 font-semibold">ยอดระบบเดิม / HIS</th>
                <th className="py-3 px-3 text-right w-32 font-semibold">ผลต่าง (Difference)</th>
                <th className="py-3 px-3 text-center w-28 font-semibold">สถานะ</th>
                <th className="py-3 px-3 text-center w-24 font-semibold">ปรับยอด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => {
                const hasDiff = row.status === 'DISCREPANCY';
                return (
                  <tr
                    key={row.code}
                    className={`transition-colors ${
                      hasDiff
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/40'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {row.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 font-semibold">
                      {formatCurrency(row.systemEndingBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatCurrency(row.externalEndingBalance)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                      hasDiff ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {row.difference !== 0 ? `${row.difference > 0 ? '+' : ''}${formatCurrency(row.difference)}` : '0.00'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasDiff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          มีผลต่าง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ตรงกัน
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasDiff && (
                        <button
                          onClick={() => handleReconcileRow(row.code)}
                          className="px-2 py-1 text-[11px] font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
                          title="ปรับยอดรายการนี้ให้ตรงกับระบบ HIS"
                        >
                          ปรับยอด
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
