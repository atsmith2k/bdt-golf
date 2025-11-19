'use client';

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'default'
}: ConfirmModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--bdt-navy) / 0.6)] backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-bdt-royal-soft bg-white shadow-[0_24px_48px_rgb(var(--bdt-navy) / 0.2)] animate-in fade-in-0 zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-bdt-muted hover:bg-bdt-ice hover:text-bdt-navy transition"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="px-6 py-5 border-b border-bdt-royal-soft">
          <h2 className="text-xl font-semibold text-bdt-navy pr-8">
            {title}
          </h2>
        </div>
        
        <div className="px-6 py-5">
          <p className="text-sm text-[rgb(var(--bdt-navy) / 0.75)] leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-5 bg-bdt-ice border-t border-bdt-royal-soft rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 font-semibold"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              "flex-1 font-semibold shadow-lg",
              variant === 'danger' 
                ? "!bg-bdt-red !text-white hover:!bg-[rgb(227,34,55)] active:!bg-[rgb(200,28,45)] shadow-red-500/25" 
                : "!bg-bdt-royal !text-white hover:!bg-bdt-navy active:!bg-[rgb(2,34,84)] shadow-bdt-royal/25"
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
