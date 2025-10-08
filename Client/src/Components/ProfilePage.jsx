import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Shield,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { isDark } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    role: "",
    joinDate: "",
    profilePicture: null,
    bio: "",
    university: "",
    graduationYear: "",
  });

  // Add separate state for real-time statistics
  const [userStats, setUserStats] = useState({
    creditScore: 0,
    successRate: 0,
    activeLoans: 0,
    totalBorrowed: 0,
    totalLent: 0,
    repaidLoans: 0,
    overdueLoans: 0,
    borrowerActiveLoans: 0,
    borrowerRepaidLoans: 0,
    borrowerOverdueLoans: 0,
    lenderActiveLoans: 0,
    lenderRepaidLoans: 0,
    lenderOverdueLoans: 0,
    loansFunded: 0
  });

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Cloudinary configuration: prefer signed uploads via backend signature
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dbvse3x8p";
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "borrowease_profile"; // still used if you keep unsigned
  const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY; // optional, only for signed client request

  // Cache-busted fetchers to avoid any intermediary cache
  const fetchUserData = useCallback(async () => {
    try {
      console.log('🔄 Fetching user data...');
      const res = await API.get(`/users/me`, { params: { t: Date.now() } });
      const user = res.data;
      console.log('📥 Received user data:', user);
      console.log('📥 Phone field specifically:', user.phone, 'Type:', typeof user.phone);
      
      const newData = {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        bio: user.bio || "",
        university: user.university || "",
        graduationYear: user.graduationYear || "",
        role: user.role || "",
        joinDate: user?.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
          : "",
        profilePicture: user.profilePicture || null,
      };
      
      console.log('📝 Setting profile data:', newData);
      console.log('📝 Phone in newData:', newData.phone, 'Length:', newData.phone?.length);
      setProfileData(newData);
      
      // Only use localStorage fallback if backend has no picture yet
      const savedPhoto = localStorage.getItem("profilePicture");
      if (!user.profilePicture && savedPhoto) {
        setProfileData((prev) => ({ ...prev, profilePicture: savedPhoto }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const [statsRes, creditRes] = await Promise.all([
        API.get(`/users/stats`, { params: { t: Date.now() } }),
        API.get(`/credit/score`, { params: { t: Date.now() } }).catch(() => null)
      ]);

      const stats = statsRes?.data || {};
      const credit = creditRes?.data || {};

      setUserStats({
        // Prefer computed credit score from dedicated endpoint; fallback to stats' creditScore
        creditScore: typeof credit.score === 'number' ? credit.score : (stats.creditScore ?? 0),
        successRate: stats.successRate ?? 0,
        activeLoans: stats.activeLoans ?? 0,
        totalBorrowed: stats.totalBorrowed ?? 0,
        totalLent: stats.totalLent ?? 0,
        repaidLoans: stats.repaidLoans ?? 0,
        overdueLoans: stats.overdueLoans ?? 0,
        borrowerActiveLoans: stats.borrowerActiveLoans ?? 0,
        borrowerRepaidLoans: stats.borrowerRepaidLoans ?? 0,
        borrowerOverdueLoans: stats.borrowerOverdueLoans ?? 0,
        lenderActiveLoans: stats.lenderActiveLoans ?? 0,
        lenderRepaidLoans: stats.lenderRepaidLoans ?? 0,
        lenderOverdueLoans: stats.lenderOverdueLoans ?? 0,
        loansFunded: stats.loansFunded ?? 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      setUserStats({
        creditScore: 0,
        successRate: 0,
        activeLoans: 0,
        totalBorrowed: 0,
        totalLent: 0,
        repaidLoans: 0,
        overdueLoans: 0,
        borrowerActiveLoans: 0,
        borrowerRepaidLoans: 0,
        borrowerOverdueLoans: 0,
        lenderActiveLoans: 0,
        lenderRepaidLoans: 0,
        lenderOverdueLoans: 0,
        loansFunded: 0,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUserData();
    fetchUserStats();
  }, [fetchUserData, fetchUserStats]);

  // Re-fetch on tab focus or when visibility changes back to visible
  useEffect(() => {
    const onFocus = () => {
      fetchUserData();
      fetchUserStats();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchUserData, fetchUserStats]);

  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!CLOUDINARY_CLOUD_NAME) {
      toast.error('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME');
      return;
    }

    // Basic client-side checks
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Please choose an image smaller than ${maxSizeMB}MB.`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const toastId = toast.loading('Uploading photo...');
      // Request a signature from backend for signed upload
      const sigRes = await API.post('/sign-upload-profile');
      const { timestamp, signature, folder } = sigRes.data || {};

      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', String(timestamp));
      if (folder) formData.append('folder', folder);
      if (CLOUDINARY_API_KEY) formData.append('api_key', CLOUDINARY_API_KEY);
      if (signature) formData.append('signature', signature);
      // Note: no upload_preset for signed direct upload when signature is present

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let message = "Cloudinary upload failed";
        try {
          const errJson = await res.json();
          message = errJson?.error?.message || message;
        } catch {
          const errText = await res.text();
          if (errText) message = errText;
        }
        // Common misconfig: unsigned preset not whitelisted
        if (message.toLowerCase().includes("preset") && message.toLowerCase().includes("whitelist")) {
          message = "Upload preset is not whitelisted for unsigned uploads. In Cloudinary → Settings → Upload → Upload presets → borrowease_profile: set Signing mode to Unsigned and add your domains (vercel app + localhost) to Allowed origins.";
        }
        toast.dismiss(toastId);
        throw new Error(message);
      }

      const data = await res.json();
      const imageUrl = data.secure_url;

      await API.patch("/users/me", { profilePicture: imageUrl });

      setProfileData((prev) => ({
        ...prev,
        profilePicture: imageUrl,
      }));
      // Persist the latest photo locally for faster first paint, but only as cache
      try { localStorage.setItem('profilePicture', imageUrl); } catch {}
      // Re-fetch fresh user data for consistency
      fetchUserData();
      toast.success('Profile photo updated');
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error(typeof error?.message === 'string' ? error.message : 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // reset input
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading('Saving profile...');
    try {
      // Build payload with only changed/defined fields; guard undefined safely
      const safeTrim = (v) => {
        if (v === null || v === undefined) return undefined;
        const s = String(v).trim();
        return s.length ? s : undefined;
      };

      const payload = {
        name: safeTrim(profileData.name),
        phone: safeTrim(profileData.phone),
        location: safeTrim(profileData.location),
        bio: safeTrim(profileData.bio),
        university: safeTrim(profileData.university),
        graduationYear: safeTrim(profileData.graduationYear),
      };
      Object.keys(payload).forEach(k => (payload[k] === undefined) && delete payload[k]);

      console.log('💾 Saving profile with payload:', payload);

      // Ensure we have a fresh auth token before the request
      let headers = {};
      try {
        const { auth } = await import('../firebase');
        const fbUser = auth.currentUser;
        if (!fbUser) {
          throw new Error('Not authenticated. Please log in again.');
        }
        // Force a fresh token to avoid 401
        const token = await fbUser.getIdToken(true);
        headers = { Authorization: `Bearer ${token}` };
        console.log('🔑 Got fresh token for save request');
      } catch (authError) {
        toast.dismiss(toastId);
        toast.error('Authentication error. Please log in again.');
        console.error('Auth error:', authError);
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      const res = await API.patch('/users/me', payload, { headers });
      console.log('✅ Profile save response:', res.data);

      // Re-fetch to ensure full sync (including stats recalcs)
      // Do this BEFORE updating local state to ensure we get fresh data
      console.log('🔄 Re-fetching user data after save...');
      await Promise.all([fetchUserData(), fetchUserStats()]);
      console.log('✅ Data re-fetch complete');
      
      // Switch to view mode and show success AFTER all fetches complete
      setIsEditing(false);
      toast.success('Profile saved');
    } catch (error) {
      console.error('Error saving profile data:', error);
      
      // Handle specific error types
      if (error?.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        const message = error?.response?.data?.error || error?.message || 'Failed to save profile data';
        toast.error(message);
      }
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleCancel = async () => {
    // Re-fetch to reset any unsaved changes
    await fetchUserData();
    setIsEditing(false);
  };

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900' 
        : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'
    }`}>
      {/* Header */}
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden">
                      {profileData.profilePicture ? (
                        <img
                          src={profileData.profilePicture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-purple-600" />
                      )}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    {/* Change/Upload photo button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 rounded-full shadow bg-white text-purple-600 hover:bg-purple-50 border border-purple-200"
                      title="Change profile photo"
                      aria-label="Change profile photo"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-4">
                    {profileData.name}
                  </h2>
                  <p className="text-purple-100 capitalize">
                    {profileData.role}
                  </p>
                  <div className="flex items-center justify-center mt-2 text-purple-100">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span className="text-sm">
                      Joined {profileData.joinDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Stats */}
              <div className={`px-6 py-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                {isLoadingStats ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading stats...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {userStats.activeLoans}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profileData.role === 'borrower' ? 'Active Loans' : 'Loans Funded'}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(userStats.creditScore)}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profileData.role === 'borrower' ? 'Credit Score' : 'Success Rate'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Mail className="w-5 h-5 mr-3" />
                    <span className="text-sm">{profileData.email}</span>
                  </div>
                  <div className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Phone className="w-5 h-5 mr-3" />
                    <span className="text-sm">{profileData.phone || 'Not provided'}</span>
                  </div>
                  <div className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <MapPin className="w-5 h-5 mr-3" />
                    <span className="text-sm">{profileData.location || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Profile Information
                  </h3>
                  <div className="flex flex-wrap gap-2 md:space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            isDark 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                          isDark 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`px-3 py-2 rounded-lg ${
                        isDark 
                          ? 'text-white bg-gray-700' 
                          : 'text-gray-900 bg-gray-50'
                      }`}>
                        {profileData.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email 
                    </label>
                    <p className={`px-3 py-2 rounded-lg ${
                      isDark 
                        ? 'text-white bg-gray-700 opacity-80' 
                        : 'text-gray-900 bg-gray-50 opacity-80'
                    }`} title="Email cannot be changed">
                      {profileData.email}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                          isDark 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`px-3 py-2 rounded-lg ${
                        isDark 
                          ? 'text-white bg-gray-700' 
                          : 'text-gray-900 bg-gray-50'
                      }`}>
                        {profileData.phone || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                          isDark 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`px-3 py-2 rounded-lg ${
                        isDark 
                          ? 'text-white bg-gray-700' 
                          : 'text-gray-900 bg-gray-50'
                      }`}>
                        {profileData.location || 'Not provided'}
                      </p>
                    )}
                  </div>

                  {profileData.role === "borrower" && (
                    <>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          University
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.university}
                            onChange={(e) =>
                              handleInputChange("university", e.target.value)
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                              isDark 
                                ? 'border-gray-600 bg-gray-700 text-white' 
                                : 'border-gray-300 bg-white text-gray-900'
                            }`}
                          />
                        ) : (
                          <p className={`px-3 py-2 rounded-lg ${
                            isDark 
                              ? 'text-white bg-gray-700' 
                              : 'text-gray-900 bg-gray-50'
                          }`}>
                            {profileData.university || 'Not provided'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Graduation Year
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.graduationYear}
                            onChange={(e) =>
                              handleInputChange(
                                "graduationYear",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                              isDark 
                                ? 'border-gray-600 bg-gray-700 text-white' 
                                : 'border-gray-300 bg-white text-gray-900'
                            }`}
                          />
                        ) : (
                          <p className={`px-3 py-2 rounded-lg ${
                            isDark 
                              ? 'text-white bg-gray-700' 
                              : 'text-gray-900 bg-gray-50'
                          }`}>
                            {profileData.graduationYear || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                        isDark 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className={`px-3 py-2 rounded-lg min-h-[100px] ${
                      isDark 
                        ? 'text-white bg-gray-700' 
                        : 'text-gray-900 bg-gray-50'
                    }`}>
                      {profileData.bio || 'No bio provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Account Summary with Real-time Data */}
            <div className={`mt-8 rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Account Summary
                </h3>
              </div>
              <div className="p-6">
                {isLoadingStats ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className={`ml-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading account summary...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`text-center p-4 rounded-lg ${
                      isDark ? 'bg-purple-900/30' : 'bg-purple-50'
                    }`}>
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(userStats.creditScore)}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profileData.role === 'borrower' ? 'Credit Score' : 'Success Rate'}
                      </div>
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          userStats.creditScore >= 750 ? 'bg-green-100 text-green-800' :
                          userStats.creditScore >= 650 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {userStats.creditScore >= 750 ? 'Excellent' :
                           userStats.creditScore >= 650 ? 'Good' : 'Fair'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`text-center p-4 rounded-lg ${
                      isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                    }`}>
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-3">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {profileData.role === 'borrower' ? userStats.borrowerActiveLoans : userStats.lenderActiveLoans}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Active Loans
                      </div>
                      {(profileData.role === 'borrower' ? userStats.borrowerOverdueLoans : userStats.lenderOverdueLoans) > 0 && (
                        <div className="mt-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                            {(profileData.role === 'borrower' ? userStats.borrowerOverdueLoans : userStats.lenderOverdueLoans)} Overdue
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`relative overflow-hidden text-center p-4 rounded-lg ${
                      isDark ? 'bg-green-900/30 ring-1 ring-green-700/30' : 'bg-green-50 ring-1 ring-green-200'
                    }`}>
                      <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-lg mx-auto mb-3 shadow-inner">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-green-600 tracking-tight">
                        ₹{(profileData.role === 'borrower' ? userStats.totalBorrowed : userStats.totalLent).toLocaleString()}
                      </div>
                      <div className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profileData.role === 'borrower' ? 'Total Borrowed' : 'Total Lent'}
                      </div>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isDark ? 'bg-green-800/40 text-green-300' : 'bg-green-100 text-green-700'
                        }`}>
                          {(profileData.role === 'borrower' ? userStats.borrowerRepaidLoans : userStats.lenderRepaidLoans)} Completed
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating edit button when not editing */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="fixed md:hidden bottom-20 right-5 z-40 rounded-full bg-purple-600 text-white shadow-lg w-14 h-14 flex items-center justify-center hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          aria-label="Edit profile"
        >
          <Edit2 className="w-6 h-6" />
        </button>
      )}

      {/* Sticky bottom action bar on mobile when editing */}
      {isEditing && (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 safe-bottom border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        } px-4 py-3 flex items-center justify-between z-40`}
        >
          <button
            onClick={handleCancel}
            className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'} px-4 py-2 rounded-lg`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-purple-600 text-white px-5 py-2 rounded-lg shadow hover:bg-purple-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
