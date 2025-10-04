import { useState, useRef, useEffect } from "react";
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

  // Cloudinary configuration via env with sensible fallbacks for dev
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await API.get("/users/me");
        const user = res.data;
        setProfileData((prev) => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          location: user.location || "",
          bio: user.bio || "",
          university: user.university || "",
          graduationYear: user.graduationYear || "",
          role: user.role || "",
          joinDate: new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) || "",
          profilePicture: user.profilePicture || null,
        }));
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchUserStats = async () => {
      try {
        setIsLoadingStats(true);
  const res = await API.get("/users/stats");
  setUserStats(res.data);
      } catch (error) {
        console.error("Error fetching user stats:", error);
        // Set default values if API fails
        setUserStats({
          creditScore: 750,
          activeLoans: 0,
          totalBorrowed: 0,
          totalLent: 0,
          repaidLoans: 0,
          overdueLoans: 0
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchUserData();
    fetchUserStats();

    // Load persisted profile picture from localStorage
    const savedPhoto = localStorage.getItem("profilePicture");
    if (savedPhoto) {
      setProfileData((prev) => ({ ...prev, profilePicture: savedPhoto }));
    }
  }, []);

  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic client-side checks
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Please choose an image smaller than ${maxSizeMB}MB.`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      setIsUploadingPhoto(true);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Cloudinary upload failed");
      }

      const data = await res.json();
      const imageUrl = data.secure_url;

      await API.patch("/users/me", { profilePicture: imageUrl });

      setProfileData((prev) => ({
        ...prev,
        profilePicture: imageUrl,
      }));
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // reset input
    }
  };

  const handleSave = async () => {
    try {
      // Save updated profile data to API
      await API.patch("/users/me", {
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
        bio: profileData.bio,
        university: profileData.university,
        graduationYear: profileData.graduationYear,
      });
      
      console.log("Profile data saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile data:", error);
      alert("Failed to save profile data");
    }
  };

  const handleCancel = () => {
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Profile Information
                  </h3>
                  <div className="flex space-x-2">
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
    </div>
  );
}
