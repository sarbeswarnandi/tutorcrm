"use client";

import React from "react";
import Link from "next/link";
import {
  HelpCircle,
  MessageCircle,
  QrCode,
  Users,
  Layers,
  Award,
  CalendarCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { TEACHER_CONFIG } from "@/lib/indiaFeatures";

export default function HelpSupportPage() {
  const faqs = [
    {
      question: "Are Grade/Class and School/Board mandatory when adding a student?",
      answer:
        "No! Grade and School/Board are completely optional. You only need to enter the Student Name, Parent Name, and 10-digit Mobile Number. You can enroll students immediately with zero friction.",
      icon: Users,
    },
    {
      question: "How does the Indian Timezone feature work?",
      answer:
        "TutorCRM automatically defaults all transaction times, attendance registers, and academic tests to Indian Standard Time (IST, UTC+05:30). If you are teaching abroad or in another country, you can switch timezones anytime in the Settings page, and all dates will adapt dynamically.",
      icon: Clock,
    },
    {
      question: "How do Instant UPI Scan & Pay QR Codes work?",
      answer:
        `When collecting fees, TutorCRM dynamically encodes your UPI ID (${TEACHER_CONFIG.upiId}) and the exact pending tuition amount into an NPCI-compliant UPI QR code. Parents can scan it with Google Pay, PhonePe, Paytm, Cred, or BHIM for direct zero-fee settlement.`,
      icon: QrCode,
    },
    {
      question: "Why does TutorCRM cost ₹0 for WhatsApp reminders?",
      answer:
        "TutorCRM uses native WhatsApp deep links (wa.me/...) instead of paid WhatsApp Business Cloud APIs or Twilio. Clicking 'Send WhatsApp Reminder' opens your WhatsApp with a pre-filled, professional receipt ready to send with 1 click.",
      icon: MessageCircle,
    },
    {
      question: "Can I manage TutorCRM on my mobile phone?",
      answer:
        "Yes! TutorCRM is a responsive progressive web app designed for mobile phones. The bottom navigation bar gives instant 1-thumb access to Students, Batches, Attendance, and Tests, and the top-right Account menu gives instant access to Settings and Support.",
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* WhatsApp Quick Assistance Banner */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Instant Help
            </span>
            <h3 className="text-lg font-bold">Have questions or need assistance?</h3>
            <p className="text-xs text-emerald-100 max-w-lg">
              Get instant help with setting up batches, syncing your UPI ID, or managing student records.
            </p>
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Hello, I need assistance with TutorCRM for ${TEACHER_CONFIG.name}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-xs hover:bg-emerald-50 transition cursor-pointer shrink-0"
          >
            <MessageCircle size={16} /> Contact via WhatsApp
          </a>
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
            Frequently Asked Questions
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const Icon = faq.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Icon size={15} />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                      {faq.question}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 pl-9 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Action Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/settings"
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-500 transition shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Configure Timezone & Profile
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Switch Indian time or update tutor name & UPI
              </p>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/students"
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-500 transition shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Manage Students & Batches
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Add students, assign batches, and view dues
              </p>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </div>
  );
}
