import React, { useState, useMemo } from 'react';
import { RightsItem, MonthlyRecord, UserProfile, DebtCategory } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Search,
  Filter,
  Plus,
  Save,
  RotateCcw,
  Edit2,
  Trash2,
  AlertTriangle,
  Flame,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Clock,
  Sparkles
} from 'lucide-react';

interface DebtorLedgerViewProps {
  record: MonthlyRecord;
  currentUser: UserProfile | null;
  initialFilter?: 'ALL' | 'GOV' | 'EXT' | 'OVERDUE';
  onUpdateRecord: (updatedRecord: MonthlyRecord) => void;
  onResetToOfficial: () => void;
}

export const DebtorLedgerView: React.FC<DebtorLedgerViewProps> = ({
  record,
  currentUser,
  initialFilter = 'ALL',
  onUpdateRecord,
  onResetToOfficial,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'GOV' | 'EXT' | 'OVERDUE'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<RightsItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedRecordDate, setSelectedRecordDate] = useState<string>('2026-08-31');

  // Working copy of items for local edits
  const [workingItems, setWorkingItems] = useState<RightsItem[]>(record.items);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Synchronize when record prop changes from external
  React.useEffect(() => {
    setWorkingItems(record.items);
    setHasUnsavedChanges(false);
  }, [record]);

  // Tab filtering
  const filteredItems = useMemo(() => {
    return workingItems.filter((item) => {
      // Tab filter
      if (activeTab === 'GOV' && item.category !== 'GOVERNMENT') return false;
      if (activeTab === 'EXT' && item.category !== 'EXTERNAL') return false;
      if (activeTab === 'OVERDUE' && !(item.daysOverdue > 30 && item.endingBalance > 0)) return false;

      // Search filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        return (
          item.code.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.subGroup.toLowerCase().includes(query) ||
          (item.notes && item.notes.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [workingItems, activeTab, searchTerm]);

  // Subtotals
  const govItems = useMemo(() => workingItems.filter(i => i.category === 'GOVERNMENT'), [workingItems]);
  const extItems = useMemo(() => workingItems.filter(i => i.category === 'EXTERNAL'), [workingItems]);

  const calcTotals = (list: RightsItem[]) => {
    return list.reduce(
      (acc, item) => {
        acc.initial += item.initialBalance;
        acc.newD += item.newDebt;
        acc.paid += item.paymentReceived;
        acc.bad += item.badDebtWrittenOff;
        acc.ending += item.endingBalance;
        return acc;
      },
      { initial: 0, newD: 0, paid: 0, bad: 0, ending: 0 }
    );
  };

  const govTotals = useMemo(() => calcTotals(govItems), [govItems]);
  const extTotals = useMemo(() => calcTotals(extItems), [extItems]);
  const grandTotals = useMemo(() => calcTotals(workingItems), [workingItems]);

  // Handle single item update
  const handleSaveModalItem = (itemToSave: RightsItem) => {
    // Auto calculate endingBalance: initial + new - paid - badDebt
    const ending = Number(itemToSave.initialBalance || 0) +
                   Number(itemToSave.newDebt || 0) -
                   Number(itemToSave.paymentReceived || 0) -
                   Number(itemToSave.badDebtWrittenOff || 0);

    const updatedItem = {
      ...itemToSave,
      endingBalance: Math.max(0, Math.round(ending * 100) / 100),
      lastUpdated: selectedRecordDate,
    };

    let nextItems: RightsItem[];
    if (isAddingNew) {
      nextItems = [...workingItems, updatedItem];
    } else {
      nextItems = workingItems.map(i => i.id === updatedItem.id ? updatedItem : i);
    }

    setWorkingItems(nextItems);
    setHasUnsavedChanges(true);
    setEditingItem(null);
    setIsAddingNew(false);
  };

  // Delete item
  const handleDeleteItem = (id: string, name: string) => {
    if (!currentUser?.canEditDebts) {
      alert('คุณยังไม่ได้เข้าสู่ระบบ หรือไม่มีสิทธิ์ในการลบรายการลูกหนี้ (ต้องการสิทธิ์ เจ้าหน้าที่การเงิน หรือ Super Admin)');
      return;
    }
    if (window.confirm(`ยืนยันการลบรายการ: "${name}" ใช่หรือไม่?`)) {
      const nextItems = workingItems.filter(i => i.id !== id);
      setWorkingItems(nextItems);
      setHasUnsavedChanges(true);
    }
  };

  // Commit changes to Database
  const handleCommitToDatabase = () => {
    if (!currentUser?.canEditDebts) {
      alert('คุณยังไม่ได้เข้าสู่ระบบ หรือไม่มีสิทธิ์บันทึกการแก้ไข (กรุณาเข้าสู่ระบบด้วยสิทธิ์เจ้าหน้าที่การเงิน)');
      return;
    }

    const updatedRecord: MonthlyRecord = {
      ...record,
      items: workingItems,
      updatedAt: new Date().toISOString(),
    };

    onUpdateRecord(updatedRecord);
    setHasUnsavedChanges(false);
    setSaveSuccessMsg(`บันทึกข้อมูลเข้าฐานข้อมูลเรียบร้อยแล้ว เมื่อวันที่ ${selectedRecordDate}`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const overdueCount = useMemo(() => {
    return workingItems.filter(i => i.daysOverdue > 30 && i.endingBalance > 0).length;
  }, [workingItems]);

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ทะเบียนคุมลูกหนี้ 52 สิทธิ์การรักษาพยาบาล
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              รพ.สังขละบุรี (SKB)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            สูตรคำนวณอัตโนมัติ: ยอดตั้งต้น + ยอดตั้งใหม่ − ยอดรับชำระ − ยอดตัดหนี้สูญ = ยอดลูกหนี้คงเหลือยกไป
          </p>
        </div>

        {/* Date Selector & Save Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Calendar Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500 text-[11px] font-medium">วันที่บันทึก:</span>
            <input
              type="date"
              value={selectedRecordDate}
              onChange={(e) => setSelectedRecordDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>

          {/* Add New Right Item */}
          {currentUser?.canEditDebts && (
            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingItem({
                  id: `custom-${Date.now()}`,
                  code: '1102050101.999',
                  name: '',
                  category: 'GOVERNMENT',
                  subGroup: 'สิทธิเพิ่มเติม',
                  initialBalance: 0,
                  newDebt: 0,
                  paymentReceived: 0,
                  badDebtWrittenOff: 0,
                  endingBalance: 0,
                  daysOverdue: 0,
                  lastUpdated: selectedRecordDate,
                });
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มสิทธิใหม่
            </button>
          )}

          {/* Save to DB */}
          <button
            onClick={handleCommitToDatabase}
            disabled={!currentUser?.canEditDebts}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white'
            } ${!currentUser?.canEditDebts ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save className="w-3.5 h-3.5" />
            {hasUnsavedChanges ? 'บันทึกเข้าฐานข้อมูล (มีรายการแก้ไข)' : 'บันทึกเก็บเข้าฐานข้อมูล'}
          </button>

          {/* Reset button */}
          <button
            onClick={onResetToOfficial}
            title="รีเซ็ตยอดกลับสู่เอกสารทางการ ส.ค. 2569"
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Notification Bar */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Interactive Filter Tabs (Buttons with click handlers) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ทั้งหมด ({workingItems.length})
          </button>

          <button
            onClick={() => setActiveTab('GOV')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'GOV'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. หน่วยงานภาครัฐ ({govItems.length})
          </button>

          <button
            onClick={() => setActiveTab('EXT')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'EXT'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2. บุคคลภายนอก ({extItems.length})
          </button>

          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'OVERDUE'
                ? 'bg-red-600 text-white shadow-xs font-bold'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            ค้างชำระ &gt; 30 วัน ({overdueCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสิทธิ หรือ รหัสบัญชี..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <th className="py-3 px-3 text-center w-12 font-semibold">ลำดับ</th>
                <th className="py-3 px-3 w-36 font-semibold">รหัสบัญชี</th>
                <th className="py-3 px-3 min-w-[280px] font-semibold">รายการสิทธิการรักษาพยาบาล</th>
                <th className="py-3 px-3 text-right w-32 font-semibold">ยกมา (31 ก.ค.)</th>
                <th className="py-3 px-3 text-right w-32 font-semibold">ตั้งใหม่ (ส.ค.)</th>
                <th className="py-3 px-3 text-right w-32 font-semibold">รับชำระ</th>
                <th className="py-3 px-3 text-right w-24 font-semibold">ตัดหนี้สูญ</th>
                <th className="py-3 px-3 text-right w-36 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                  คงเหลือยกไป
                </th>
                <th className="py-3 px-3 text-center w-24 font-semibold">อายุหนี้</th>
                <th className="py-3 px-3 text-center w-24 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    ไม่พบรายการสิทธิที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isOverdue = item.daysOverdue > 30 && item.endingBalance > 0;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isOverdue ? 'bg-red-50/30 dark:bg-red-950/15' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {item.code}
                      </td>

                      {/* Name & Subgroup */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{item.subGroup}</span>
                          {item.notes && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400 italic">
                                {item.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Initial Balance */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.initialBalance)}
                      </td>

                      {/* New Debt */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-600 dark:text-sky-400">
                        {item.newDebt > 0 ? `+${formatCurrency(item.newDebt)}` : '0.00'}
                      </td>

                      {/* Payment Received */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {item.paymentReceived > 0 ? `-${formatCurrency(item.paymentReceived)}` : '0.00'}
                      </td>

                      {/* Bad Debt */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(item.badDebtWrittenOff)}
                      </td>

                      {/* Ending Balance */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white bg-emerald-50/30 dark:bg-emerald-950/10">
                        {formatCurrency(item.endingBalance)}
                      </td>

                      {/* Overdue Age Indicator */}
                      <td className="py-2.5 px-3 text-center">
                        {isOverdue ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-400 animate-pulse">
                            <Flame className="w-3 h-3 text-red-600" />
                            <span>{item.daysOverdue} วัน</span>
                          </div>
                        ) : item.daysOverdue > 0 ? (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {item.daysOverdue} วัน
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                            ปกติ
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setIsAddingNew(false);
                              setEditingItem({ ...item });
                            }}
                            title="แก้ไขตัวเลข / บันทึกข้อมูล"
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.canManageUsers && (
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              title="ลบรายการ"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Official Subtotals and Grand Total */}
            <tfoot>
              {/* Grand Total Row */}
              <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 border-t-2 border-emerald-500 font-bold text-slate-900 dark:text-white">
                <td colSpan={3} className="py-3 px-3 text-center font-bold text-emerald-900 dark:text-emerald-200">
                  รวมทั้งสิ้น (Grand Total 52 สิทธิ์)
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(grandTotals.initial)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-700 dark:text-sky-300">
                  +{formatCurrency(grandTotals.newD)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                  -{formatCurrency(grandTotals.paid)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                  {formatCurrency(grandTotals.bad)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
                  {formatCurrency(grandTotals.ending)}
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-xs text-slate-500">
                  บาท
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal: Edit / Add Rights Item */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                {isAddingNew ? 'เพิ่มสิทธิการรักษาพยาบาลใหม่' : 'บันทึกแก้ไขข้อมูลสิทธิลูกหนี้'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">รหัสบัญชี (Account Code)</label>
                  <input
                    type="text"
                    value={editingItem.code}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">หมวดหมู่</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as DebtCategory })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="GOVERNMENT">หมวด 1: หน่วยงานภาครัฐ (1102050101)</option>
                    <option value="EXTERNAL">หมวด 2: บุคคลภายนอก (1102050102)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">ชื่อสิทธิการรักษาพยาบาล</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="เช่น ลูกหนี้ค่ารักษา UC- OP ใน CUP"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Financial Numbers with Auto Calculate Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  ตัวเลขทางการเงิน (สูตร: ตั้งต้น + ตั้งใหม่ − รับชำระ − ตัดหนี้สูญ)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-0.5">ยอดลูกหนี้ยกมา (บ.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.initialBalance}
                      onChange={(e) => setEditingItem({ ...editingItem, initialBalance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">ยอดลูกหนี้ของเดือน (บ.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.newDebt}
                      onChange={(e) => setEditingItem({ ...editingItem, newDebt: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono tabular-nums text-sky-600 dark:text-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">ยอดรับชำระระหว่างเดือน (บ.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.paymentReceived}
                      onChange={(e) => setEditingItem({ ...editingItem, paymentReceived: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">ยอดตัดหนี้สูญ (บ.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.badDebtWrittenOff}
                      onChange={(e) => setEditingItem({ ...editingItem, badDebtWrittenOff: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono tabular-nums text-slate-500"
                    />
                  </div>
                </div>

                {/* Real-time calculated ending preview */}
                <div className="p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/60 flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                    ยอดลูกหนี้ยกไปคำนวณอัตโนมัติ:
                  </span>
                  <span className="font-mono tabular-nums text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    {formatCurrency(
                      (editingItem.initialBalance || 0) +
                      (editingItem.newDebt || 0) -
                      (editingItem.paymentReceived || 0) -
                      (editingItem.badDebtWrittenOff || 0)
                    )} บาท
                  </span>
                </div>
              </div>

              {/* Overdue Days & Notes */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">จำนวนวันค้างชำระ</label>
                  <input
                    type="number"
                    value={editingItem.daysOverdue}
                    onChange={(e) => setEditingItem({ ...editingItem, daysOverdue: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-500 mb-1">หมายเหตุ / สถานะติดตาม</label>
                  <input
                    type="text"
                    value={editingItem.notes || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                    placeholder="เช่น รอ Statement สปสช. หรือ ยื่น พรบ."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleSaveModalItem(editingItem)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                ตกลงบันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
