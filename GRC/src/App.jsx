import React from "react";
import {Routes, Route, Navigate, useLocation   } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Politiques from "./pages/Politiques";
import Risques from "./pages/Risques";
import Conformité from "./pages/Conformite";
import AdminLayout from "./components/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import AccessPage from "./pages/admin/AccessPage";
import ActivatePage from "./pages/ActivatePage.jsx";
import MFAPAGE from "./pages/MFAPage.jsx";
import Frameworks from "./pages/admin/Frameworks.jsx";
import Logs from "./pages/admin/Logs.jsx";
import Exception from "./pages/Exception.jsx";
import AuthModal from "./components/AuthModal";
import Assets from "./pages/Assets.jsx";
import Business from "./pages/Business.jsx";
import LogsAuditor from "./pages/LogsAuditor.jsx";
import SettingsPage from "./pages/Settings.jsx";
import Reporting from "./pages/Reporting.jsx";
import About from "./pages/About.jsx"
import Contact from "./pages/Contact.jsx";
import Profile from "./pages/Profile.jsx";
import Settingsprofile from "./pages/Settingsprofile.jsx";




const App = () => {
  const isAdmin = true;
  const isAuditor =true;
  
  const location = useLocation();

  
  

  
   
  return (
    <>
      
      
       

      

      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthModal />} />
        <Route path="/forgot" element={<AuthModal />} />
        <Route path="/About" element={<About/>} />
        <Route path="/contact" element={<Contact/>} />

      
        

        
        
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/mfa" element={<MFAPAGE />} />
        <Route path="/reset-password/:token" element={<AuthModal />} />

        
        
        

        
        
        
       
   

        

        <Route path="/layout/*" element={isAuditor ? <Layout /> : <Navigate to="/" />}>
        <Route index element={<Dashboard />} />
        
        {/* Routes enfants supplémentaires */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settingsprofile" element={<Settingsprofile />} />
        
        <Route path="risques" element={<Risques />} />
          <Route path="assets" element={<Assets />} />
          <Route path="business" element={<Business />} />
        
        
        
        <Route path="conformite" element={<Conformité />} />
          <Route path="conformite/Politiques" element={<Politiques />} />
          <Route path="exception" element={<Exception />} />

        <Route path="logs" element={<LogsAuditor />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="reporting" element={<Reporting />} />
        

        
      
        </Route>
        
        <Route
        path="/admin/*"
        element={isAdmin ? <AdminLayout /> : <Navigate to="/" />}
      >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="access" element={<AccessPage />} />
          <Route path="frameworks" element={<Frameworks />} />
          <Route path="logs" element={<Logs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
      
      

        
        
      </Routes>
      
    </>
    
  );
};

export default App;