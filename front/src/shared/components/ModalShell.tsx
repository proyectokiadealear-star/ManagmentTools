/**
 * ModalShell — reusable animated modal wrapper.
 *
 * Renders a full-screen backdrop + a centered, animated panel.
 * Use it as the outer shell for any feature modal.
 *
 * Props:
 *   isOpen     — controls visibility (AnimatePresence gated)
 *   onClose    — called when backdrop is clicked
 *   maxWidth   — Tailwind max-width class for the panel (default: 'max-w-lg')
 *   maxHeight  — optional Tailwind max-height class (e.g. 'max-h-[90vh]')
 *   children   — modal content (header, body, footer)
 */
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  maxHeight?: string;
  children: ReactNode;
}

export function ModalShell({
  isOpen,
  onClose,
  maxWidth = 'max-w-lg',
  maxHeight,
  children,
}: ModalShellProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={[
              'w-full',
              maxWidth,
              maxHeight ?? '',
              'bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
