import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-bdt-ice px-6 py-12">
      <Link
        href="/login"
        className="mx-auto mb-10 flex flex-col items-center gap-3 text-center"
      >
        <Image
          src="/bdt-transparent-logo.png"
          alt="BDT Tour crest"
          width={84}
          height={120}
          className="h-20 w-auto drop-shadow-xl"
          priority
        />
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-bdt-red">
          BDT Tour
        </span>
        <span className="text-sm font-semibold text-bdt-royal">{APP_NAME}</span>
      </Link>
      <div className="mx-auto w-full max-w-md">{children}</div>
      <p className="mt-10 text-center text-xs text-[rgb(var(--bdt-navy) / 0.55)]">
        Private league access only.
      </p>
    </div>
  );
}
