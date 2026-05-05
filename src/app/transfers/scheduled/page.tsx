// src/app/transfers/scheduled/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./scheduled.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

interface ScheduledTransfer {
  id: string;
  name: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  nextDate: string;
  endDate?: string;
  status: "active" | "paused" | "completed";
  executedCount: number;
  totalTransferred: number;
}

export default function ScheduledTransferPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"manage" | "create">("manage");
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null);
  
  // Mock scheduled transfers
  const [transfers] = useState<ScheduledTransfer[]>([
    {
      id: "SCH001",
      name: "Monthly Savings",
      fromAccount: "Checking ****1234",
      toAccount: "Savings ****5678",
      amount: 500,
      frequency: "monthly",
      nextDate: "2026-06-01",
      status: "active",
      executedCount: 12,
      totalTransferred: 6000
    },
    {
      id: "SCH002",
      name: "Investment Fund",
      fromAccount: "Checking ****1234",
      toAccount: "Investment ****9012",
      amount: 1000,
      frequency: "biweekly",
      nextDate: "2026-05-30",
      status: "active",
      executedCount: 24,
      totalTransferred: 24000
    },
    {
      id: "SCH003",
      name: "Rent Payment",
      fromAccount: "Checking ****1234",
      toAccount: "External - Landlord",
      amount: 2500,
      frequency: "monthly",
      nextDate: "2026-06-01",
      endDate: "2027-12-01",
      status: "active",
      executedCount: 6,
      totalTransferred: 15000
    }
  ]);

  const [newTransfer, setNewTransfer] = useState({
    name: "",
    fromAccount: "",
    toAccount: "",
    amount: "",
    frequency: "monthly",
    startDate: "",
    endDate: "",
    memo: ""
  });

  const frequencyOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Every 2 Weeks" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return styles.statusActive;
      case "paused": return styles.statusPaused;
      case "completed": return styles.statusCompleted;
      default: return "";
    }
  };

  const handleCreateTransfer = () => {
    // Handle creation logic
    console.log("Creating transfer:", newTransfer);
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>Scheduled Transfers</h1>
            <p className={styles.pageSubtitle}>
              Automate your recurring transfers and never miss a payment
            </p>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            <button
              className={`${styles.tab} ${activeTab === "manage" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("manage")}
            >
              Manage Transfers
            </button>
            <button
              className={`${styles.tab} ${activeTab === "create" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create New
            </button>
          </div>
        </div>

        <div className={styles.container}>
          {activeTab === "manage" ? (
            /* Manage Transfers Tab */
            <div className={styles.manageContent}>
              {/* Summary Cards */}
              <div className={styles.summaryCards}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>📅</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Active Transfers</span>
                    <span className={styles.summaryValue}>
                      {transfers.filter(t => t.status === "active").length}
                    </span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>💰</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Monthly Total</span>
                    <span className={styles.summaryValue}>
                      ${transfers
                        .filter(t => t.status === "active")
                        .reduce((sum, t) => {
                          if (t.frequency === "monthly") return sum + t.amount;
                          if (t.frequency === "biweekly") return sum + (t.amount * 2);
                          if (t.frequency === "weekly") return sum + (t.amount * 4);
                          return sum;
                        }, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>📊</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Total Transferred</span>
                    <span className={styles.summaryValue}>
                      ${transfers.reduce((sum, t) => sum + t.totalTransferred, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>🔄</div>
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryLabel}>Next Transfer</span>
                    <span className={styles.summaryValue}>Tomorrow</span>
                  </div>
                </div>
              </div>

              {/* Transfers List */}
              <div className={styles.transfersList}>
                <h2 className={styles.sectionTitle}>Your Scheduled Transfers</h2>
                
                {transfers.map((transfer) => (
                  <motion.div
                    key={transfer.id}
                    className={styles.transferCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className={styles.transferHeader}>
                      <div className={styles.transferInfo}>
                        <h3 className={styles.transferName}>{transfer.name}</h3>
                        <span className={`${styles.transferStatus} ${getStatusColor(transfer.status)}`}>
                          {transfer.status}
                        </span>
                      </div>
                      <div className={styles.transferAmount}>
                        ${transfer.amount.toLocaleString()}
                        <span className={styles.frequency}>/{transfer.frequency}</span>
                      </div>
                    </div>

                    <div className={styles.transferDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>From:</span>
                        <span className={styles.detailValue}>{transfer.fromAccount}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>To:</span>
                        <span className={styles.detailValue}>{transfer.toAccount}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Next Date:</span>
                        <span className={styles.detailValue}>
                          {new Date(transfer.nextDate).toLocaleDateString()}
                        </span>
                      </div>
                      {transfer.endDate && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>End Date:</span>
                          <span className={styles.detailValue}>
                            {new Date(transfer.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={styles.transferStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Executed</span>
                        <span className={styles.statValue}>{transfer.executedCount} times</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Total Transferred</span>
                        <span className={styles.statValue}>
                          ${transfer.totalTransferred.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className={styles.transferActions}>
                      {transfer.status === "active" ? (
                        <button className={styles.btnPause}>Pause</button>
                      ) : (
                        <button className={styles.btnResume}>Resume</button>
                     )}
                     <button className={styles.btnEdit}>Edit</button>
                     <button className={styles.btnDelete}>Delete</button>
                   </div>
                 </motion.div>
               ))}
             </div>

             {/* Upcoming Transfers Calendar */}
             <div className={styles.upcomingSection}>
               <h2 className={styles.sectionTitle}>Upcoming Transfers This Month</h2>
               <div className={styles.calendar}>
                 <div className={styles.calendarHeader}>
                   <button className={styles.calendarNav}>←</button>
                   <span className={styles.calendarMonth}>January 2024</span>
                   <button className={styles.calendarNav}>→</button>
                 </div>
                 <div className={styles.calendarGrid}>
                   {/* Simple calendar representation */}
                   {Array.from({ length: 31 }, (_, i) => {
                     const day = i + 1;
                     const hasTransfer = [1, 15, 30].includes(day);
                     return (
                       <div 
                         key={day} 
                         className={`${styles.calendarDay} ${hasTransfer ? styles.hasTransfer : ''}`}
                       >
                         <span className={styles.dayNumber}>{day}</span>
                         {hasTransfer && (
                           <div className={styles.dayTransfers}>
                             <div className={styles.transferDot}></div>
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>
           </div>
         ) : (
           /* Create New Transfer Tab */
           <div className={styles.createContent}>
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className={styles.createForm}
             >
               <h2 className={styles.sectionTitle}>Create Scheduled Transfer</h2>
               
               <div className={styles.formSection}>
                 <h3>Transfer Details</h3>
                 <div className={styles.formGrid}>
                   <div className={styles.formField}>
                     <label>Transfer Name <span className={styles.required}>*</span></label>
                     <input
                       type="text"
                       value={newTransfer.name}
                       onChange={(e) => setNewTransfer({...newTransfer, name: e.target.value})}
                       placeholder="e.g., Monthly Savings"
                     />
                   </div>

                   <div className={styles.formField}>
                     <label>Amount <span className={styles.required}>*</span></label>
                     <div className={styles.amountInput}>
                       <span className={styles.currencySymbol}>$</span>
                       <input
                         type="number"
                         value={newTransfer.amount}
                         onChange={(e) => setNewTransfer({...newTransfer, amount: e.target.value})}
                         placeholder="0.00"
                       />
                     </div>
                   </div>

                   <div className={styles.formField}>
                     <label>From Account <span className={styles.required}>*</span></label>
                     <select
                       value={newTransfer.fromAccount}
                       onChange={(e) => setNewTransfer({...newTransfer, fromAccount: e.target.value})}
                     >
                       <option value="">Select Account</option>
                       <option value="checking">Checking ****1234 - $3,420.75</option>
                       <option value="savings">Savings ****5678 - $25,750.50</option>
                     </select>
                   </div>

                   <div className={styles.formField}>
                     <label>To Account <span className={styles.required}>*</span></label>
                     <select
                       value={newTransfer.toAccount}
                       onChange={(e) => setNewTransfer({...newTransfer, toAccount: e.target.value})}
                     >
                       <option value="">Select Account</option>
                       <option value="savings">Savings ****5678</option>
                       <option value="investment">Investment ****9012</option>
                       <option value="external">External Account</option>
                     </select>
                   </div>
                 </div>
               </div>

               <div className={styles.formSection}>
                 <h3>Schedule Settings</h3>
                 <div className={styles.formGrid}>
                   <div className={styles.formField}>
                     <label>Frequency <span className={styles.required}>*</span></label>
                     <select
                       value={newTransfer.frequency}
                       onChange={(e) => setNewTransfer({...newTransfer, frequency: e.target.value})}
                     >
                       {frequencyOptions.map(option => (
                         <option key={option.value} value={option.value}>
                           {option.label}
                         </option>
                       ))}
                     </select>
                   </div>

                   <div className={styles.formField}>
                     <label>Start Date <span className={styles.required}>*</span></label>
                     <input
                       type="date"
                       value={newTransfer.startDate}
                       onChange={(e) => setNewTransfer({...newTransfer, startDate: e.target.value})}
                       min={new Date().toISOString().split('T')[0]}
                     />
                   </div>

                   <div className={styles.formField}>
                     <label>End Date (Optional)</label>
                     <input
                       type="date"
                       value={newTransfer.endDate}
                       onChange={(e) => setNewTransfer({...newTransfer, endDate: e.target.value})}
                       min={newTransfer.startDate}
                     />
                     <span className={styles.fieldHelp}>Leave empty for ongoing transfers</span>
                   </div>

                   <div className={`${styles.formField} ${styles.fullWidth}`}>
                     <label>Memo (Optional)</label>
                     <textarea
                       value={newTransfer.memo}
                       onChange={(e) => setNewTransfer({...newTransfer, memo: e.target.value})}
                       placeholder="Add a note for this transfer"
                       rows={3}
                     />
                   </div>
                 </div>
               </div>

               <div className={styles.preview}>
                 <h3>Transfer Preview</h3>
                 <div className={styles.previewContent}>
                   <div className={styles.previewItem}>
                     <span>Transfer:</span>
                     <strong>{newTransfer.name || "Unnamed Transfer"}</strong>
                   </div>
                   <div className={styles.previewItem}>
                     <span>Amount:</span>
                     <strong>${newTransfer.amount || "0"}</strong>
                   </div>
                   <div className={styles.previewItem}>
                     <span>Frequency:</span>
                     <strong>{frequencyOptions.find(f => f.value === newTransfer.frequency)?.label}</strong>
                   </div>
                   <div className={styles.previewItem}>
                     <span>First Transfer:</span>
                     <strong>
                       {newTransfer.startDate ? 
                         new Date(newTransfer.startDate).toLocaleDateString() : 
                         "Not set"}
                     </strong>
                   </div>
                 </div>
               </div>

               <div className={styles.formActions}>
                 <button 
                   className={styles.btnSecondary}
                   onClick={() => setActiveTab("manage")}
                 >
                   Cancel
                 </button>
                 <button 
                   className={styles.btnPrimary}
                   onClick={handleCreateTransfer}
                 >
                   Create Scheduled Transfer
                 </button>
               </div>
             </motion.div>
           </div>
         )}
       </div>

       <Footer />
     </div>
   </div>
 );
}
