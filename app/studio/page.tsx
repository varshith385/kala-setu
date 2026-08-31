"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function KalaStudio() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  // Restrict to artists only
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "artist") {
        router.push("/"); 
      }
    }
  }, [user, role, loading, router]);

  if (loading || role !== "artist" || !user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-yellow-500 font-display text-xl tracking-widest">Entering Studio...</p>
      </main>
    );
  }

  // Mock data for the hackathon demo
  const stats = [
    { label: "Total Revenue", value: "₹ 3,45,000", trend: "+12%" },
    { label: "Artworks Sold", value: "24", trend: "+3 this month" },
    { label: "Profile Views", value: "1,204", trend: "+18%" },
    { label: "Active Commissions", value: "3", trend: "Needs attention" },
  ];

  const chartData = [
    { month: "Jan", sales: 45000 },
    { month: "Feb", sales: 30000 },
    { month: "Mar", sales: 75000 },
    { month: "Apr", sales: 50000 },
    { month: "May", sales: 90000 },
    { month: "Jun", sales: 120000 },
  ];
  const maxSales = Math.max(...chartData.map((d) => d.sales));

  const recentOrders = [
    { id: "ORD-089", piece: "Golden Heritage", buyer: "Rahul K.", amount: "₹ 15,000", status: "Shipped" },
    { id: "ORD-090", piece: "Custom Portrait", buyer: "Anjali S.", amount: "₹ 22,000", status: "In Progress" },
    { id: "ORD-091", piece: "Sacred Flow", buyer: "Vikram M.", amount: "₹ 12,000", status: "Pending" },
  ];

  const handlePublish = () => {
    const artworkName = uploadTitle || "A New Masterpiece";
    const text = encodeURIComponent(
      `🎨 *New Artwork Uploaded!*\n\nArtist Email: ${user.email}\nArtwork: "${artworkName}"\n\nPlease review this new upload in the Kala Setu admin panel.`
    );
    
    // Open WhatsApp to the admin/support number
    window.open(`https://wa.me/918522847389?text=${text}`, "_blank");
    setShowUploadModal(false);
    setUploadTitle("");
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-5">
        <div>
          <p className="text-yellow-500/70 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Artist Authenticated
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-yellow-500">
            Kala Studio ✨
          </h1>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold rounded-lg transition shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)]"
        >
          + Upload New Artwork
        </button>
      </div>

      {/* Next Level WOW Feature: AI Insights Module */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-gradient-to-r from-neutral-900 to-black border border-yellow-500/40 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          <h3 className="text-yellow-500 font-display text-xl mb-2 flex items-center gap-2">
            🤖 AI Pricing Assistant
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Based on recent sales data across India, demand for <strong className="text-white">Abstract Acrylics</strong> is up 24% this month. 
            Our AI suggests pricing your next piece between <span className="text-yellow-400 font-semibold">₹ 18,000 - ₹ 22,000</span> for optimal conversion.
          </p>
        </div>

        <div className="bg-gradient-to-r from-neutral-900 to-black border border-yellow-500/20 p-6 rounded-xl relative overflow-hidden">
          <h3 className="text-yellow-500 font-display text-xl mb-2 flex items-center gap-2">
            🌍 Global Demand Heatmap
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Your portfolio is currently trending in <strong className="text-white">Mumbai</strong> and <strong className="text-white">London</strong>.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs border border-yellow-600/30 bg-yellow-600/10 px-3 py-1 rounded-full text-yellow-500">Mumbai: 45% Traffic</span>
            <span className="text-xs border border-yellow-600/30 bg-yellow-600/10 px-3 py-1 rounded-full text-yellow-500">London: 22% Traffic</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-neutral-900 border border-yellow-600/20 p-5 rounded-xl hover:border-yellow-500/50 transition duration-500">
            <p className="text-gray-400 text-xs md:text-sm mb-2">{stat.label}</p>
            <p className="text-2xl md:text-4xl font-semibold text-white mb-1">{stat.value}</p>
            <p className="text-yellow-500 text-[10px] md:text-xs">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-10">
        
        {/* Revenue Chart */}
        <div className="md:col-span-2 bg-neutral-900 border border-yellow-600/20 rounded-xl p-6 md:p-8">
          <h2 className="font-display text-xl text-yellow-500 mb-8">Revenue Trajectory</h2>
          
          <div className="flex items-end justify-between h-48 md:h-64 gap-2 border-b border-gray-800 pb-2">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <div className="w-full relative flex justify-center flex-1 items-end">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black border border-yellow-600 text-yellow-400 text-xs py-1 px-2 rounded transition pointer-events-none z-10 whitespace-nowrap">
                    ₹{(data.sales / 1000).toFixed(0)}k
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full max-w-[40px] bg-yellow-600/30 group-hover:bg-yellow-500 transition-all rounded-t-sm"
                    style={{ height: `${(data.sales / maxSales) * 100}%` }}
                  ></div>
                </div>
                <span className="text-gray-500 text-xs mt-3">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="bg-neutral-900 border border-yellow-600/20 rounded-xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-xl text-yellow-500">Recent Sales</h2>
            <Link href="/orders" className="text-xs text-gray-400 hover:text-yellow-500 transition">View All</Link>
          </div>

          <div className="space-y-5">
            {recentOrders.map((order, idx) => (
              <div key={idx} className="border-b border-yellow-600/10 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-white font-medium text-sm">{order.piece}</p>
                  <p className="text-yellow-400 text-sm">{order.amount}</p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <p className="text-gray-400">Buyer: {order.buyer}</p>
                  <span className={`px-2 py-0.5 rounded-full ${
                    order.status === 'Shipped' ? 'bg-green-500/10 text-green-400' :
                    order.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Upload Modal with WhatsApp Trigger */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-5 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-yellow-600/50 p-8 rounded-xl max-w-md w-full relative shadow-[0_0_40px_rgba(234,179,8,0.15)]">
            <h3 className="font-display text-2xl text-yellow-500 mb-2">Publish to Studio</h3>
            <p className="text-gray-400 text-sm mb-6">Upload your artwork. An admin will be notified instantly via WhatsApp.</p>
            
            <div className="mb-4">
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Artwork Title</label>
              <input 
                type="text"
                placeholder="e.g. Midnight Monsoon"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full bg-black border border-yellow-600/30 rounded-md px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="border-2 border-dashed border-yellow-600/30 bg-black rounded-lg p-10 flex flex-col items-center justify-center text-center mb-6 hover:border-yellow-500/70 transition cursor-pointer group">
              <span className="text-3xl mb-2 group-hover:scale-110 transition duration-300">📸</span>
              <p className="text-yellow-500 text-sm font-medium">Click to upload high-res image</p>
              <p className="text-gray-500 text-xs mt-1">PNG, JPG up to 20MB</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-md hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handlePublish}
                className="flex-1 bg-yellow-500 text-black font-semibold py-3 rounded-md hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              >
                Upload & Notify
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
