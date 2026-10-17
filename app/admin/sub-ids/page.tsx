'use client';
import Link from 'next/link';
import SubIdManager from '@/components/sub-id-manager';
export default function WorkerReportsPage() {
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-7xl"><Link href="/admin" className="font-semibold text-blue-600">← Admin Dashboard</Link><SubIdManager admin/></div></main>;
}