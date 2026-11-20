// India-Specific Zero-Budget Features
export const TEACHER_CONFIG = {
  name: process.env.NEXT_PUBLIC_TEACHER_NAME || "Nandi Tutorials",
  upiId: process.env.NEXT_PUBLIC_TEACHER_UPI_ID || "sarbeswarnandi-2@okaxis",
};

/**
 * Generates an NPCI-compliant UPI URI for instant QR scan-and-pay
 * Supported by Google Pay, PhonePe, Paytm, BHIM, Cred, etc.
 */
export function generateUpiUri(params: {
  payeeUpi: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}): string {
  const { payeeUpi, payeeName, amount, transactionNote } = params;
  return `upi://pay?pa=${payeeUpi}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
}

/**
 * Generates an instant WhatsApp Deep Link targeting the native app
 * Bypasses WhatsApp Cloud API & Twilio costs completely.
 */
export function generateWhatsAppFeeReminderLink(params: {
  phone: string;
  parentName: string;
  studentName: string;
  batchNames: string;
  pendingDue: number;
}): string {
  const { phone, parentName, studentName, batchNames, pendingDue } = params;
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  const message =
    `Namaste ${parentName} Ji,

This is a gentle reminder from *${TEACHER_CONFIG.name}*.
Tuition fee for *${studentName}* (${batchNames}) is pending.

*Total Pending Dues:* ₹${pendingDue.toLocaleString("en-IN")}

You can pay directly via UPI:
UPI ID: \`${TEACHER_CONFIG.upiId}\`

Please reply with the payment screenshot or UTR once paid.
Thank you!`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an instant WhatsApp Payment Receipt Deep Link
 * Teachers can send this with 1-click right after collecting fee.
 */
export function generateWhatsAppReceiptLink(params: {
  phone: string;
  parentName: string;
  studentName: string;
  amountPaid: number;
  paymentMode: string;
  referenceId?: string | null;
  monthFor?: string | null;
  receiptId?: string;
}): string {
  const { phone, parentName, studentName, amountPaid, paymentMode, referenceId, monthFor, receiptId } = params;
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const message =
    `🧾 *FEE PAYMENT RECEIPT* - ${TEACHER_CONFIG.name}
━━━━━━━━━━━━━━━━━━
*Receipt No:* #${receiptId || Math.floor(100000 + Math.random() * 900000)}
*Date:* ${dateStr}

*Student:* ${studentName}
*Parent:* ${parentName} Ji
*Month / Purpose:* ${monthFor || "Tuition Fee"}
*Amount Received:* ₹${amountPaid.toLocaleString("en-IN")}
*Mode:* ${paymentMode} ${referenceId ? `(Ref: ${referenceId})` : ""}

✅ *Status: PAYMENT RECEIVED WITH THANKS*
━━━━━━━━━━━━━━━━━━
Thank you for supporting your child's education!
- *${TEACHER_CONFIG.name}*`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an instant WhatsApp Absent Alert Deep Link
 */
export function generateWhatsAppAbsentAlert(params: {
  phone: string;
  parentName: string;
  studentName: string;
  batchName: string;
  dateStr?: string;
}): string {
  const { phone, parentName, studentName, batchName, dateStr } = params;
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const todayStr = dateStr || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const message =
    `⚠️ *ATTENDANCE ALERT* - ${TEACHER_CONFIG.name}
━━━━━━━━━━━━━━━━━━
Namaste ${parentName} Ji,

This is to inform you that *${studentName}* was marked *ABSENT* today (${todayStr}) in batch:
*${batchName}*

Kindly let us know if there is any reason or if you were aware of this absence.
Thank you!
- *${TEACHER_CONFIG.name}*`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const generateWhatsAppAbsentLink = generateWhatsAppAbsentAlert;

/**
 * Generates an instant WhatsApp Student Scorecard Deep Link
 * Formats: marks, percentage, class rank, highest and average scores.
 */
export function generateWhatsAppScorecardLink(params: {
  phone: string;
  parentName: string;
  studentName: string;
  batchName: string;
  testTitle: string;
  subject?: string;
  marksObtained: number;
  maxMarks: number;
  rank?: number | null;
  totalStudents?: number;
  highestScore?: number | null;
  averageScore?: number | null;
  isAbsent?: boolean;
  remarks?: string | null;
}): string {
  const {
    phone,
    parentName,
    studentName,
    batchName,
    testTitle,
    subject,
    marksObtained,
    maxMarks,
    rank,
    totalStudents,
    highestScore,
    averageScore,
    isAbsent,
    remarks,
  } = params;

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const percentage = maxMarks > 0 ? ((marksObtained / maxMarks) * 100).toFixed(1) : "0.0";

  let scoreLine = `🎯 *Score:* *${marksObtained} / ${maxMarks}* (${percentage}%)`;
  if (isAbsent) {
    scoreLine = `⚠️ *Status:* *ABSENT FOR TEST*`;
  }

  const rankLine = rank && !isAbsent ? `\n🏆 *Batch Rank:* *#${rank}* ${totalStudents ? `(out of ${totalStudents})` : ""}` : "";
  const statsLine = !isAbsent && highestScore !== null && highestScore !== undefined
    ? `\n📈 *Batch Highest:* ${highestScore}/${maxMarks} | *Average:* ${averageScore ?? "N/A"}/${maxMarks}`
    : "";
  const remarksLine = remarks ? `\n💬 *Coach Notes:* "${remarks}"` : "";

  const message =
    `📊 *ACADEMIC TEST REPORT* - ${TEACHER_CONFIG.name}
━━━━━━━━━━━━━━━━━━
Namaste ${parentName} Ji,

Academic evaluation update for *${studentName}*:

📝 *Test:* *${testTitle}* ${subject ? `(${subject})` : ""}
👥 *Batch:* ${batchName}
${scoreLine}${rankLine}${statsLine}${remarksLine}

━━━━━━━━━━━━━━━━━━
Every test is a step forward. Keep encouraging consistent practice!
- *${TEACHER_CONFIG.name}*`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an instant WhatsApp Batch Announcement Deep Link
 * Supports class rescheduling, test dates, emergency holidays, or general notes.
 */
export function generateBatchAnnouncementLink(params: {
  phone: string;
  parentName: string;
  studentName: string;
  batchName: string;
  announcementType: "CLASS_RESCHEDULE" | "TEST_ANNOUNCEMENT" | "EMERGENCY_HOLIDAY" | "GENERAL";
  details: string;
  dateOrTime?: string;
}): string {
  const { phone, parentName, studentName, batchName, announcementType, details, dateOrTime } = params;
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  const typeHeaders: Record<string, string> = {
    CLASS_RESCHEDULE: "⏰ *CLASS TIMING UPDATE*",
    TEST_ANNOUNCEMENT: "📝 *UPCOMING TEST ANNOUNCEMENT*",
    EMERGENCY_HOLIDAY: "🚨 *CLASS CANCELLED / HOLIDAY NOTICE*",
    GENERAL: "📢 *IMPORTANT BATCH NOTICE*",
  };

  const header = typeHeaders[announcementType] || "📢 *BATCH NOTICE*";

  const message =
    `${header} - ${TEACHER_CONFIG.name}
━━━━━━━━━━━━━━━━━━
Namaste ${parentName} Ji,

Important notice for *${studentName}* in batch:
*${batchName}*

${dateOrTime ? `🗓️ *Schedule:* ${dateOrTime}\n` : ""}
${details}

━━━━━━━━━━━━━━━━━━
Kindly acknowledge receipt.
- *${TEACHER_CONFIG.name}*`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

