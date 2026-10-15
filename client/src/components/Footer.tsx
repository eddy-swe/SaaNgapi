import React from 'react';
import { Calendar } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm">
            SaaNgapi
          </span>
          <span className="text-slate-400 text-xs">— Modern Full-Stack Scheduling Architecture</span>
        </div>
        <p className="text-xs text-slate-500">
          Built with React, Vite, Tailwind CSS, Node.js, Express, and Prisma ORM.
        </p>
      </div>
    </footer>
  );
};
