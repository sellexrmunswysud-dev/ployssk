export type DebtCategory = 'GOVERNMENT' | 'EXTERNAL';

export interface RightsItem {
  id: string;
  code: string;
  name: string;
  category: DebtCategory;
  subGroup: string;
  initialBalance: number;       // ยอดลูกหนี้ยกมา ณ 31 ก.ค.
  newDebt: number;              // ยอดลูกหนี้ของเดือน
  paymentReceived: number;      // ยอดรับชำระระหว่างเดือน
  badDebtWrittenOff: number;    // ยอดตัดหนี้สูญ
  endingBalance: number;        // ยอดลูกหนี้ยกไป ณ 31 ส.ค.
  daysOverdue: number;          // จำนวนวันที่ค้างชำระ
  notes?: string;
  lastUpdated: string;
}

export type MonthlyStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED';

export interface SignerInfo {
  name: string;
  position: string;
  signDate?: string;
  isSigned?: boolean;
}

export interface MonthlyRecord {
  id: string;
  year: number; // e.g. 2569
  month: number; // 1-12
  monthName: string; // e.g. "สิงหาคม"
  items: RightsItem[];
  status: MonthlyStatus;
  reporter: SignerInfo;
  reviewer: SignerInfo;
  approver: SignerInfo;
  updatedAt: string;
}

export type UserRole = 'EXECUTIVE' | 'STATISTICIAN' | 'ACCOUNTANT' | 'ADMIN';

export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  roleTitleTh: string;
  department: string;
  phone: string;
  email: string;
  active: boolean;
  approvalStatus?: ApprovalStatus;
  registeredAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  canEditDebts: boolean;
  canReview: boolean;
  canApprove: boolean;
  canManageUsers: boolean;
}

export interface SystemSecuritySettings {
  requireAdminApproval: boolean;
  allowAutoApproveFirstAdmin: boolean;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  channel: 'SMS' | 'EMAIL';
  recipientName: string;
  recipientTarget: string;
  subject: string;
  message: string;
  status: 'DELIVERED' | 'PENDING' | 'FAILED';
  triggerEvent: string;
}

export interface NotificationSettings {
  directorPhone: string;
  directorEmail: string;
  financePhone: string;
  financeEmail: string;
  statisticianPhone: string;
  statisticianEmail: string;
  autoNotifyOnClose: boolean;
  notifyOnOverdueThreshold: boolean;
}

export interface ReconciliationRow {
  code: string;
  name: string;
  systemEndingBalance: number;
  externalEndingBalance: number;
  difference: number;
  status: 'MATCH' | 'DISCREPANCY';
  lastCheckedDate: string;
}
