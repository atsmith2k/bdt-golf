import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-100 px-6 py-12">
      <Link
        href="/login"
        className="mx-auto mb-10 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        {APP_NAME}
      </Link>
      <div className="mx-auto w-full max-w-md">{children}</div>
      <p className="mt-10 text-center text-xs text-slate-400">
        Private league access only.
      </p>
    </div>
  );
}

