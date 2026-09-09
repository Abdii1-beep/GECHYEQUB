import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CampaignPage from "./pages/CampaignPage";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminDraws from "./pages/admin/AdminDraws";
import LiveDraw from "./pages/admin/LiveDraw";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminKYC from "./pages/admin/AdminKYC";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminWinners from "./pages/admin/AdminWinners";
import AdminFraud from "./pages/admin/AdminFraud";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import LiveDrawRoom from "./pages/LiveDrawRoom";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/login"       element={<Login />} />
      <Route path="/register"    element={<Register />} />

      {/* User */}
      <Route path="/campaign/:id" element={<CampaignPage />} />
      <Route path="/dashboard"    element={<Dashboard />} />
      <Route path="/profile"      element={<Profile />} />
      <Route path="/live/:campaignId" element={<LiveDrawRoom />} />
      <Route path="/draw/:campaignId" element={<LiveDrawRoom />} />

      {/* Admin */}
      <Route path="/admin"                  element={<AdminDashboard />} />
      <Route path="/admin/dashboard"        element={<AdminDashboard />} />
      <Route path="/admin/campaigns"        element={<AdminCampaigns />} />
      <Route path="/admin/draws"            element={<AdminDraws />} />
      <Route path="/admin/draw/:campaignId" element={<LiveDraw />} />
      <Route path="/admin/tickets"          element={<AdminTickets />} />
      <Route path="/admin/customers"        element={<AdminCustomers />} />
      <Route path="/admin/kyc"              element={<AdminKYC />} />
      <Route path="/admin/payments"         element={<AdminPayments />} />
      <Route path="/admin/winners"          element={<AdminWinners />} />
      <Route path="/admin/fraud"            element={<AdminFraud />} />
      <Route path="/admin/audit"            element={<AdminAudit />} />
      <Route path="/admin/settings"         element={<AdminSettings />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;