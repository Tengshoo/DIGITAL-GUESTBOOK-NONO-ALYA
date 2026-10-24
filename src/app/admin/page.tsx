'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle,
  EyeOff,
  Eye,
  Trash2,
  Download,
  RefreshCw,
  Search,
  Filter,
  Image as ImageIcon,
  Volume2,
  Calendar,
  Sparkles,
  ArrowUpDown,
  FolderOpen,
} from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import Link from 'next/link';
import {
  getAllEntriesForAdmin,
  updateEntryApproval,
  deleteGuestEntry,
} from '@/lib/supabase';
import { getGoogleDriveFolderUrl } from '@/lib/googleDrive';
import { EVENT_CONFIG } from '@/config/eventConfig';

interface AdminEntry {
  id: number;
  name: string;
  message: string;
  photo_url?: string | null;
  signature_svg?: string | null;
  audio_url?: string | null;
  is_approved: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [pin, setPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'hidden'>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Check sessionStorage for existing authenticated PIN
  useEffect(() => {
    const savedPin = sessionStorage.getItem('admin_guestbook_pin');
    if (savedPin) {
      setPin(savedPin);
      fetchAdminEntries(savedPin);
    }
  }, []);

  const fetchAdminEntries = useCallback(async (currentPin: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const correctPin =
        process.env.NEXT_PUBLIC_ADMIN_PIN || EVENT_CONFIG.adminPin || '1234';
      if (currentPin !== correctPin) {
        throw new Error('PIN keselamatan tidak sah.');
      }

      const data = await getAllEntriesForAdmin();
      setEntries(data);
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_guestbook_pin', currentPin);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PIN keselamatan tidak sah';
      setLoginError(msg);
      setIsAuthenticated(false);
      sessionStorage.removeItem('admin_guestbook_pin');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPin.trim()) return;
    setPin(enteredPin.trim());
    fetchAdminEntries(enteredPin.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_guestbook_pin');
    setIsAuthenticated(false);
    setPin('');
    setEnteredPin('');
    setEntries([]);
  };

  const toggleApproval = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const res = await updateEntryApproval(id, newStatus);
      if (!res.success) {
        throw new Error(res.error || 'Gagal mengemaskini status entri.');
      }

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_approved: newStatus } : e))
      );
      showFlashMessage(`Entri #${id} kini ${newStatus === 1 ? 'Dipaparkan' : 'Disembunyikan'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kemaskini gagal';
      alert(msg);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmDelete = window.confirm(
      `Adakah anda pasti mahu memadamkan ucapan daripada "${name}" (#${id})?`
    );
    if (!confirmDelete) return;

    try {
      const res = await deleteGuestEntry(id);
      if (!res.success) {
        throw new Error(res.error || 'Gagal memadamkan entri');
      }

      setEntries((prev) => prev.filter((e) => e.id !== id));
      showFlashMessage(`Entri #${id} daripada "${name}" berjaya dipadam.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pemadaman gagal';
      alert(msg);
    }
  };

  const showFlashMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Export functions (JSON & CSV)
  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `guestbook_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsCsv = () => {
    const headers = ['ID', 'Name', 'Message', 'Approved', 'Has Photo', 'Has Audio', 'Created At'];
    const rows = entries.map((e) => [
      e.id,
      `"${e.name.replace(/"/g, '""')}"`,
      `"${e.message.replace(/"/g, '""')}"`,
      e.is_approved === 1 ? 'Yes' : 'No',
      e.photo_url ? 'Yes' : 'No',
      e.audio_url ? 'Yes' : 'No',
      `"${e.created_at}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `guestbook_entries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'approved'
        ? e.is_approved === 1
        : e.is_approved === 0;
    return matchesSearch && matchesStatus;
  });

  const totalCount = entries.length;
  const approvedCount = entries.filter((e) => e.is_approved === 1).length;
  const hiddenCount = entries.filter((e) => e.is_approved === 0).length;
  const photoCount = entries.filter((e) => !!e.photo_url).length;
  const audioCount = entries.filter((e) => !!e.audio_url).length;

  // Unauthenticated PIN Form View
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-[100dvh] flex items-center justify-center max-w-md mx-auto px-4 py-16 sm:py-24 animate-fade-up">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 border border-champagne-200/80 shadow-polaroid text-center w-full">
          <div className="w-16 h-16 rounded-full bg-champagne-100 mx-auto mb-4 flex items-center justify-center text-champagne-700 shadow-champagne">
            <Lock className="w-8 h-8" />
          </div>

          <h1 className="font-serif text-3xl font-bold text-warm-900 mb-1">
            Host Moderation
          </h1>
          <p className="text-xs text-warm-600 mb-6">
            Enter the event host PIN to moderate entries and export memories.
          </p>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="Enter 4-digit PIN (default: 1234)"
                autoFocus
                className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 rounded-2xl border border-warm-200 bg-warm-50/50 text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-champagne-400 focus:bg-white transition"
              />
              <span className="text-[11px] text-warm-400 mt-1 block">
                Default event PIN is <code className="font-bold text-champagne-700">1234</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !enteredPin}
              className="w-full py-3.5 px-6 rounded-2xl bg-champagne-600 hover:bg-champagne-700 text-white font-medium text-sm transition shadow-champagne active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Verifying PIN...</span>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard View
  return (
    <div className="w-full min-h-[100dvh] max-w-7xl mx-auto px-4 py-8 sm:py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] animate-fade-in">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-warm-900 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-fade-up">
          <Sparkles className="w-4 h-4 text-champagne-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>Host Authenticated</span>
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-warm-900 mt-1">
            Guestbook Moderation
          </h1>
          <p className="text-xs sm:text-sm text-warm-600">
            Review guest submissions, curate the live projector feed, and backup engagement celebration notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchAdminEntries(pin)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-warm-50 border border-warm-200 text-warm-700 text-xs font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-champagne-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            {getGoogleDriveFolderUrl() && (
              <a
                href={getGoogleDriveFolderUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition shadow-sm"
                title="Buka Folder Google Drive"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Drive</span>
              </a>
            )}
            <button
              onClick={exportAsCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-champagne-100/80 hover:bg-champagne-200/80 text-champagne-900 border border-champagne-300/80 text-xs font-medium transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-champagne-700" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportAsJson}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-champagne-50 hover:bg-champagne-100 text-champagne-800 border border-champagne-200 text-xs font-medium transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-champagne-600" />
              <span>JSON Backup</span>
            </button>
          </div>

          <Link
            href="/"
            className="px-3 py-2 rounded-xl bg-white hover:bg-warm-50 border border-warm-200 text-warm-700 text-xs font-medium transition shadow-sm"
          >
            ← Front Page
          </Link>
          <Link
            href="/wall"
            className="px-3 py-2 rounded-xl bg-champagne-50 hover:bg-champagne-100 border border-champagne-200 text-champagne-800 text-xs font-medium transition shadow-sm"
          >
            Live Wall
          </Link>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-warm-200/60 hover:bg-rose-100 text-warm-700 hover:text-rose-800 text-xs font-medium transition"
          >
            Lock
          </button>
        </div>
      </div>

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
        <div className="bg-white/80 p-4 rounded-2xl border border-warm-200/80 shadow-soft">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-warm-500">
            Total Notes
          </span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-warm-900 mt-1">
            {totalCount}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-2xl border border-warm-200/80 shadow-soft">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-600">
            Live on Screen
          </span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
            {approvedCount}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-2xl border border-warm-200/80 shadow-soft">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-warm-500">
            Hidden / Flagged
          </span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-warm-700 mt-1">
            {hiddenCount}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-2xl border border-warm-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-champagne-700">
              Photo Uploads
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                photoCount >= (EVENT_CONFIG.photoUploadLimit || 500)
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-champagne-100 text-champagne-800'
              }`}
            >
              Limit: {EVENT_CONFIG.photoUploadLimit || 500}
            </span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-champagne-800 mt-1 flex items-baseline gap-1">
            <span>{photoCount}</span>
            <span className="text-xs font-sans text-warm-500 font-normal">
              / {EVENT_CONFIG.photoUploadLimit || 500}
            </span>
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-2xl border border-warm-200/80 shadow-soft col-span-2 sm:col-span-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-600">
            Voice Wishes
          </span>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-rose-700 mt-1">
            {audioCount}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/80 p-4 rounded-2xl border border-warm-200/80 shadow-soft mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-warm-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or message..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-warm-200 bg-warm-50/40 text-[16px] sm:text-xs text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-champagne-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-champagne-600 text-white shadow-sm'
                : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('hidden')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'hidden'
                ? 'bg-warm-800 text-white shadow-sm'
                : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            Hidden ({hiddenCount})
          </button>
        </div>
      </div>

      {/* Entries Table / Card List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white/80 rounded-3xl p-12 text-center border border-warm-200 shadow-soft">
          <Filter className="w-10 h-10 text-warm-300 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-warm-800">
            No entries found
          </h3>
          <p className="text-xs text-warm-500 mt-1">
            {searchQuery
              ? `No messages matched the search "${searchQuery}".`
              : 'There are no entries under this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white/90 rounded-3xl border border-warm-200/80 shadow-polaroid overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100/60 text-warm-600 uppercase font-semibold border-b border-warm-200 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Message</th>
                  <th className="py-3.5 px-4 text-center">Photo</th>
                  <th className="py-3.5 px-4 text-center">Audio</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 text-warm-800">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-warm-50/80 transition ${
                      entry.is_approved === 0 ? 'bg-warm-50/40 opacity-75' : ''
                    }`}
                  >
                    {/* ID */}
                    <td className="py-3.5 px-4 text-center font-mono text-warm-400">
                      {entry.id}
                    </td>

                    {/* Guest Name & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-serif font-bold text-sm text-warm-900">
                        {entry.name}
                      </div>
                      <div className="text-[10px] text-warm-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(entry.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </td>

                    {/* Message snippet */}
                    <td className="py-3.5 px-4">
                      <p className="font-serif italic text-warm-800 line-clamp-3 text-xs leading-relaxed">
                        &ldquo;{entry.message}&rdquo;
                      </p>
                    </td>

                    {/* Photo thumbnail */}
                    <td className="py-3.5 px-4 text-center">
                      {entry.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(entry.photo_url || null)}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-warm-200 mx-auto block hover:scale-110 transition shadow-sm group relative"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.photo_url}
                            alt={`Photo by ${entry.name}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-warm-300 font-mono">-</span>
                      )}
                    </td>

                    {/* Audio Note */}
                    <td className="py-3.5 px-4 text-center">
                      {entry.audio_url ? (
                        <AudioPlayer src={entry.audio_url} compact />
                      ) : (
                        <span className="text-warm-300 font-mono">-</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 text-center">
                      {entry.is_approved === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-warm-200 text-warm-700">
                          <EyeOff className="w-3 h-3 text-warm-500" />
                          <span>Hidden</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleApproval(entry.id, entry.is_approved)}
                          title={entry.is_approved === 1 ? 'Hide from live wall' : 'Approve for live wall'}
                          className={`p-1.5 rounded-lg border transition ${
                            entry.is_approved === 1
                              ? 'text-warm-600 hover:text-warm-900 border-warm-200 hover:bg-warm-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {entry.is_approved === 1 ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id, entry.name)}
                          title="Delete note"
                          className="p-1.5 rounded-lg text-warm-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo / Signature Full Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90dvh] bg-white rounded-3xl p-3 shadow-2xl border-2 border-champagne-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition shadow-lg"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Enlarged preview"
              className="max-h-[80dvh] w-auto mx-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
