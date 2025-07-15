"use client";
export default function ReportButton() {
  return (
    <button
      className="text-sm text-red-600 underline hover:text-red-800 transition"
      onClick={() => alert('Reported!')}
    >
      Report
    </button>
  );
} 