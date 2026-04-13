"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./login-history.module.css";

interface LoginEntry {
  _id: string;
  status: 'success' | 'failed';
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  isNewDevice: boolean;
  failureReason?: string;
  createdAt: string;
}

export default function LoginHistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [filter, page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (filter !== 'all') params.set('status', filter);

      const res = await fetch(`/api/security/login-history?${params}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch login history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />

        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <button className={styles.backBtn} onClick={() => router.push('/security')}>
                &larr; Back to Security Center
              </button>
              <h1>Login History</h1>
              <p>Monitor all sign-in activity on your account</p>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => { setFilter('all'); setPage(1); }}
            >
              All Activity
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'success' ? styles.active : ''}`}
              onClick={() => { setFilter('success'); setPage(1); }}
            >
              Successful
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'failed' ? styles.active : ''}`}
              onClick={() => { setFilter('failed'); setPage(1); }}
            >
              Failed Attempts
            </button>
          </div>

          {/* History List */}
          <div className={styles.historyList}>
            {loading ? (
              <div className={styles.loading}>Loading login history...</div>
            ) : history.length === 0 ? (
              <div className={styles.empty}>No login activity found.</div>
            ) : (
              history.map((entry) => (
                <div key={entry._id} className={`${styles.historyItem} ${entry.status === 'failed' ? styles.failedItem : ''}`}>
                  <div className={styles.statusIndicator}>
                    <div className={`${styles.statusDot} ${entry.status === 'success' ? styles.successDot : styles.failedDot}`} />
                  </div>

                  <div className={styles.entryDetails}>
                    <div className={styles.entryHeader}>
                      <span className={styles.entryAction}>
                        {entry.status === 'success' ? 'Successful Login' : 'Failed Login Attempt'}
                      </span>
                      {entry.isNewDevice && (
                        <span className={styles.newDeviceBadge}>New Device</span>
                      )}
                      <span className={`${styles.statusBadge} ${entry.status === 'success' ? styles.successBadge : styles.failedBadge}`}>
                        {entry.status}
                      </span>
                    </div>

                    <div className={styles.entryMeta}>
                      <span>{entry.browser} on {entry.os}</span>
                      <span className={styles.separator}>|</span>
                      <span>{entry.device}</span>
                      <span className={styles.separator}>|</span>
                      <span>{entry.ipAddress}</span>
                      <span className={styles.separator}>|</span>
                      <span>{entry.location}</span>
                    </div>

                    {entry.failureReason && (
                      <div className={styles.failureReason}>
                        Reason: {entry.failureReason}
                      </div>
                    )}
                  </div>

                  <div className={styles.entryTime}>
                    <div className={styles.timeAgo}>{getTimeAgo(entry.createdAt)}</div>
                    <div className={styles.timeExact}>{formatDate(entry.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
