import { ChevronRight, CheckCircle2, XCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";

export type BreadcrumbStatus = "default" | "active" | "success" | "error";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  status?: BreadcrumbStatus;
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
}

function statusStyles(status: BreadcrumbStatus = "default"): string {
  switch (status) {
    case "success":
      return "bg-green-50 text-green-700 border-green-200";
    case "error":
      return "bg-red-50 text-red-700 border-red-200";
    case "active":
      return "bg-blue-50 text-blue-700 border-blue-200 font-medium";
    default:
      return "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
  }
}

function StatusIcon({ status }: { status?: BreadcrumbStatus }) {
  if (status === "success") return <CheckCircle2 size={14} className="text-green-600" />;
  if (status === "error") return <XCircle size={14} className="text-red-600" />;
  return null;
}

export default function Breadcrumb({ items, className = "" }: Props) {
  return (
    <nav aria-label="Breadcrumb" className={`w-full ${className}`}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {/* Home icon explicit first if not provided */}
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const status = item.status ?? (isLast ? "active" : "default");
          const content = (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors ${statusStyles(status)}`}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              {idx === 0 && !item.icon ? <Home size={12} className="opacity-60" /> : null}
              <span className="truncate max-w-[140px] sm:max-w-none">{item.label}</span>
              <StatusIcon status={item.status} />
            </span>
          );

          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:opacity-80 transition-opacity">
                  {content}
                </Link>
              ) : (
                content
              )}
              {!isLast && <ChevronRight size={14} className="text-gray-400 shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Helper untuk capture flow
export function buildCaptureBreadcrumb(
  step: number,
  isEditing: boolean,
  execution?: { status: "success" | "error"; message?: string },
): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [
    { label: "Beranda", href: "/", icon: <Home size={12} /> },
    { label: isEditing ? "Edit" : "Capture", href: "/capture" },
  ];

  if (execution) {
    if (execution.status === "success") {
      return [
        ...base,
        { label: step === 1 ? "Foto" : step === 2 ? "Profil" : "Kirim", href: "/capture" },
        { label: isEditing ? "Berhasil Diperbarui" : "Berhasil Dikirim", status: "success", icon: <CheckCircle2 size={12} /> },
      ];
    }
    return [
      ...base,
      { label: "Kirim", href: "/capture" },
      { label: "Gagal", status: "error", icon: <XCircle size={12} /> },
    ];
  }

  // normal stepper
  const stepItems: BreadcrumbItem[] = [
    { label: "Foto", status: step > 1 ? "success" : step === 1 ? "active" : "default" },
    { label: "Profil", status: step > 2 ? "success" : step === 2 ? "active" : "default" },
    { label: "Kirim", status: step === 3 ? "active" : "default" },
  ];

  return [...base, ...stepItems];
}
