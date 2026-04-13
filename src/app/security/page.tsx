"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./security.module.css";

interface LoginEntry {
  _id: string;
  status: 'success' | 'failed';
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  isNewDevice: boolean;
  createdAt: string;
}

export default function SecurityPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [recentActivity, setRecentActivity] = useState<LoginEntry[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const securityScore = 85;

  useEffect(() => {
    fetchRecentActivity();
    fetchDeviceCount();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const res = await fetch('/api/security/login-history?limit=5');
      const data = await res.json();
      if (data.success) {
        setRecentActivity(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchDeviceCount = async () => {
    try {
      const res = await fetch('/api/security/devices');
      const data = await res.json();
      if (data.success) {
        setDeviceCount(data.devices.length);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
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
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1>Security Center</h1>
              <p>Protect your account and monitor security settings</p>
            </div>
            <div className={styles.securityScoreCard}>
              <div className={styles.scoreLabel}>Security Score</div>
              <div className={styles.scoreValue}>{securityScore}%</div>
              <div className={styles.scoreStatus}>Strong</div>
            </div>
          </div>

          {/* Security Status Cards */}
          <div className={styles.statusCards}>
            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ background: '#dcfce7' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
              </div>
              <div className={styles.statusContent}>
                <h3>Two-Factor Authentication</h3>
                <p>Enabled - SMS to ****4567</p>
              </div>
              <button className={styles.manageBtn}>Manage</button>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ background: '#dcfce7' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
              </div>
              <div className={styles.statusContent}>
                <h3>Login Alerts</h3>
                <p>Active - Email alerts on new devices</p>
              </div>
              <button className={styles.manageBtn} onClick={() => router.push('/security/login-history')}>View History</button>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ background: '#fef3c7' }}>
                <span style={{ color: '#f59e0b' }}>!</span>
              </div>
              <div className={styles.statusContent}>
                <h3>Password Strength</h3>
                <p>Last changed 45 days ago</p>
              </div>
              <button className={styles.updateBtn}>Update</button>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIcon} style={{ background: '#dcfce7' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
              </div>
              <div className={styles.statusContent}>
                <h3>Device Management</h3>
                <p>{deviceCount} trusted device{deviceCount !== 1 ? 's' : ''}</p>
              </div>
              <button className={styles.manageBtn} onClick={() => router.push('/security/devices')}>View Devices</button>
            </div>
          </div>

          {/* Security Features */}
          <div className={styles.featuresSection}>
            <h2>Security Features</h2>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>🔐 Biometric Authentication</h3>
                  <label className={styles.switch}>
                    <input type="checkbox" defaultChecked />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p>Use fingerprint or face recognition for quick and secure access</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>📱 Device Trust</h3>
                  <label className={styles.switch}>
                    <input type="checkbox" defaultChecked />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p>Remember trusted devices for 30 days</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>🌍 Location Security</h3>
                  <label className={styles.switch}>
                    <input type="checkbox" />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p>Block access from unusual locations</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <h3>⏰ Session Timeout</h3>
                  <select className={styles.timeoutSelect}>
                    <option>5 minutes</option>
                    <option selected>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                  </select>
                </div>
                <p>Automatically log out after inactivity</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.activitySection}>
            <div className={styles.activityHeader}>
              <h2>Recent Security Activity</h2>
              <button className={styles.viewAllBtn} onClick={() => router.push('/security/login-history')}>View All</button>
            </div>
            <div className={styles.activityList}>
              {loadingActivity ? (
                <div className={styles.activityItem}>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityAction}>Loading activity...</div>
                  </div>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className={styles.activityItem}>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityAction}>No recent activity</div>
                    <div className={styles.activityMeta}>Login events will appear here after you sign in.</div>
                  </div>
                </div>
              ) : (
                recentActivity.map(activity => (
                  <div key={activity._id} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      {activity.status === 'success' ? '✓' : '⚠️'}
                    </div>
                    <div className={styles.activityDetails}>
                      <div className={styles.activityAction}>
                        {activity.status === 'success' ? 'Successful Login' : 'Failed Login Attempt'}
                        {activity.isNewDevice && ' (New Device)'}
                      </div>
                      <div className={styles.activityMeta}>
                        {activity.browser} on {activity.os} &bull; {activity.location} &bull; {getTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                    <div className={`${styles.activityStatus} ${activity.status === 'success' ? styles.success : styles.failed}`}>
                      {activity.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}