// app/transfers/wire/page.tsx — slim wrapper around the shared form
"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WireTransferForm from "@/components/WireTransferForm";

export default function WirePage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 280 }}>
        <Header />
        <WireTransferForm mode="domestic" />
        <Footer />
      </div>
    </div>
  );
}
