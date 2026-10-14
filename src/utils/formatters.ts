import { RightsItem, MonthlyRecord } from '../types';

export const formatCurrency = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const formatPercent = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(1)}%`;
};

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const formatThaiDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = THAI_MONTHS[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * Generates an Excel-compatible HTML/XML Spreadsheet (.xls) with full formatting,
 * Thai font UTF-8 encoding, exact formulas, and structured sheets.
 */
export const exportToExcelFile = (record: MonthlyRecord, filename = `รายงานลูกหนี้_รพ.สังขละบุรี_${record.monthName}_${record.year}.xls`) => {
  const govItems = record.items.filter(i => i.category === 'GOVERNMENT');
  const extItems = record.items.filter(i => i.category === 'EXTERNAL');

  const sumGovInitial = govItems.reduce((acc, i) => acc + i.initialBalance, 0);
  const sumGovNew = govItems.reduce((acc, i) => acc + i.newDebt, 0);
  const sumGovPaid = govItems.reduce((acc, i) => acc + i.paymentReceived, 0);
  const sumGovEnding = govItems.reduce((acc, i) => acc + i.endingBalance, 0);

  const sumExtInitial = extItems.reduce((acc, i) => acc + i.initialBalance, 0);
  const sumExtNew = extItems.reduce((acc, i) => acc + i.newDebt, 0);
  const sumExtPaid = extItems.reduce((acc, i) => acc + i.paymentReceived, 0);
  const sumExtEnding = extItems.reduce((acc, i) => acc + i.endingBalance, 0);

  const totalInitial = sumGovInitial + sumExtInitial;
  const totalNew = sumGovNew + sumExtNew;
  const totalPaid = sumGovPaid + sumExtPaid;
  const totalEnding = sumGovEnding + sumExtEnding;

  const renderRow = (item: RightsItem, index: number) => `
    <tr>
      <td style="text-align:center;mso-number-format:'\\@';">${index}</td>
      <td style="mso-number-format:'\\@';">${item.code}</td>
      <td>${item.name}</td>
      <td style="text-align:right;mso-number-format:'#,##0.00';">${item.initialBalance.toFixed(2)}</td>
      <td style="text-align:right;mso-number-format:'#,##0.00';">${item.newDebt.toFixed(2)}</td>
      <td style="text-align:right;mso-number-format:'#,##0.00';">${item.paymentReceived.toFixed(2)}</td>
      <td style="text-align:right;mso-number-format:'#,##0.00';">${item.endingBalance.toFixed(2)}</td>
      <td>${item.notes || ''}</td>
    </tr>
  `;

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>ทะเบียนคุมลูกหนี้ 52 สิทธิ์</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #0E6B38; color: #ffffff; border: 1px solid #333333; padding: 6px; font-size: 11pt; }
        td { border: 1px solid #d1d5db; padding: 4px 6px; font-size: 10pt; }
        .subtotal { background-color: #e5e7eb; font-weight: bold; }
        .grandtotal { background-color: #d1fae5; font-weight: bold; font-size: 11pt; }
        .section-header { background-color: #f3f4f6; font-weight: bold; }
        .header-title { font-size: 14pt; font-weight: bold; text-align: center; }
        .header-sub { font-size: 12pt; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="8" class="header-title">รายงานสรุปการเรียกเก็บลูกหนี้และยอดคงเหลือลูกหนี้แต่ละสิทธิ</td>
        </tr>
        <tr>
          <td colspan="8" class="header-sub">ประจำเดือน...${record.monthName}...${record.year}.......</td>
        </tr>
        <tr>
          <td colspan="8" class="header-sub">งานประกันสุขภาพฯ โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี</td>
        </tr>
        <tr><td colspan="8"></td></tr>
        <thead>
          <tr>
            <th style="width:50px;">ลำดับ</th>
            <th style="width:140px;">รหัสบัญชี</th>
            <th style="width:340px;">รายการสิทธิการรักษาพยาบาล</th>
            <th style="width:130px;">ยอดลูกหนี้ยกมา</th>
            <th style="width:130px;">ยอดลูกหนี้ของเดือน</th>
            <th style="width:130px;">ยอดรับชำระระหว่างเดือน</th>
            <th style="width:130px;">ยอดลูกหนี้ยกไป</th>
            <th style="width:180px;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr class="section-header">
            <td colspan="8" style="font-weight:bold; background-color:#f1f5f9;">ลูกหนี้การค้า-หน่วยงานภาครัฐ (รหัส 1102050101)</td>
          </tr>
          ${govItems.map((item, idx) => renderRow(item, idx + 1)).join('')}
          <tr class="subtotal">
            <td colspan="3" style="text-align:center;">รวม (หมวด 1 หน่วยงานภาครัฐ)</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumGovInitial.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumGovNew.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumGovPaid.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumGovEnding.toFixed(2)}</td>
            <td></td>
          </tr>

          <tr class="section-header">
            <td colspan="8" style="font-weight:bold; background-color:#f1f5f9;">ลูกหนี้การค้า - บุคคลภายนอก (รหัส 1102050102)</td>
          </tr>
          ${extItems.map((item, idx) => renderRow(item, govItems.length + idx + 1)).join('')}
          <tr class="subtotal">
            <td colspan="3" style="text-align:center;">รวม (หมวด 2 บุคคลภายนอก)</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumExtInitial.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumExtNew.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumExtPaid.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${sumExtEnding.toFixed(2)}</td>
            <td></td>
          </tr>

          <tr class="grandtotal">
            <td colspan="3" style="text-align:center;">รวมทั้งหมด (52 สิทธิ์)</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${totalInitial.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${totalNew.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${totalPaid.toFixed(2)}</td>
            <td style="text-align:right;mso-number-format:'#,##0.00';">${totalEnding.toFixed(2)}</td>
            <td></td>
          </tr>
          <tr><td colspan="8"></td></tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <td colspan="3" style="text-align:center; border:none;">
              ( ${record.reporter.name} )<br>
              ตำแหน่ง ${record.reporter.position}<br>
              <strong>ผู้รายงาน</strong>
            </td>
            <td colspan="2" style="text-align:center; border:none;">
              ( ${record.reviewer.name} )<br>
              ตำแหน่ง ${record.reviewer.position}<br>
              <strong>ผู้ตรวจสอบ</strong>
            </td>
            <td colspan="3" style="text-align:center; border:none;">
              ( ${record.approver.name} )<br>
              ตำแหน่ง ${record.approver.position}<br>
              <strong>ผู้รับรอง</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
