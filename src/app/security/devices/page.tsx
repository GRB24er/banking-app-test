"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./devices.module.css";

interface Device {
  _id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastUsedAt: string;
  createdAt: string;
}

export default function DevicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    setRevoking(deviceId);
    try {
      const res = await fetch('/api/security/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.filter(d => d._id !== deviceId));
      }
    } catch (err) {
      console.error('Failed to revoke device:', err);
    } finally {
      setRevoking(null);
      setConfirmRevoke(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
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
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getDeviceIcon = (os: string) => {
    if (os.includes('Windows')) return '💻';
    if (os.includes('macOS') || os.includes('Mac')) return '🖥️';
    if (os.includes('iOS') || os.includes('iPhone')) return '📱';
    if (os.includes('Android')) return '📱';
    if (os.includes('Linux')) return '🐧';
    return '🌐';
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
              <h1>Trusted Devices</h1>
              <p>Manage devices that have accessed your account</p>
            </div>
            <div className={styles.deviceCount}>
              <span className={styles.countNumber}>{devices.length}</span>
              <span className={styles.countLabel}>Active Devices</span>
            </div>
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <div className={styles.infoIcon}>🔒</div>
            <div>
              <strong>Device Trust</strong>
              <p>Devices are automatically registered when you sign in. Revoking a device will require re-authentication on next login from that device.</p>
            </div>
          </div>

          {/* Device List */}
          <div className={styles.deviceList}>
            {loading ? (
              <div className={styles.loading}>Loading devices...</div>
            ) : devices.length === 0 ? (
              <div className={styles.empty}>No trusted devices found. Devices will appear here after you sign in.</div>
            ) : (
              devices.map((device, index) => (
                <div key={device._id} className={styles.deviceCard}>
                  <div className={styles.deviceIcon}>
                    {getDeviceIcon(device.os)}
                  </div>

                  <div className={styles.deviceInfo}>
                    <div className={styles.deviceHeader}>
                      <h3 className={styles.deviceName}>{device.deviceName}</h3>
                      {index === 0 && (
                        <span className={styles.currentBadge}>Current Device</span>
                      )}
                    </div>

                    <div className={styles.deviceMeta}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Browser:</span>
                        <span>{device.browser}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>OS:</span>
                        <span>{device.os}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>IP Address:</span>
                        <span>{device.ipAddress}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Location:</span>
                        <span>{device.location}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Last Active:</span>
                        <span>{getTimeAgo(device.lastUsedAt)}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>First Seen:</span>
                        <span>{formatDate(device.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.deviceActions}>
                    {confirmRevoke === device._id ? (
                      <div className={styles.confirmGroup}>
                        <span className={styles.confirmText}>Revoke this device?</span>
                        <button
                          className={styles.confirmBtn}
                          onClick={() => revokeDevice(device._id)}
                          disabled={revoking === device._id}
                        >
                          {revoking === device._id ? 'Revoking...' : 'Yes, Revoke'}
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => setConfirmRevoke(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.revokeBtn}
                        onClick={() => setConfirmRevoke(device._id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
