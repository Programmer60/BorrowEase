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
import API from "../api/api"; // Assuming this is your API import, adjust if needed

export default function ProfilePage() {
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
    creditScore: 0,
    totalLoans: 0,
    totalBorrowed: "",
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await API.get("/users/me");
        const user = res.data;
        setProfileData((prev) => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          role: user.role || "",
          joinDate: new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) || "",
          profilePicture: user.profilePicture || null, // <-- Add this line
          // Add more fields if available in user object, e.g.
          // phone: user.phone || '',
          // location: user.location || '',
          // etc.
        }));
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

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
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "borrowease_profile"); // Set this in Cloudinary dashboard

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dbvse3x8p/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      const imageUrl = data.secure_url;

      // Send this image URL to your backend to save in DB
      await API.patch("/users/me", { profilePicture: imageUrl });

      setProfileData((prev) => ({
        ...prev,
        profilePicture: imageUrl,
      }));
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed");
    }
  };

  const handleSave = () => {
    // Here you would typically save updated data to your API
    // For example: await API.put('/users/me', profileData);
    setProfileData((prev) => ({
      ...prev,
      role: profileData.role.toLowerCase(),
    }));
    console.log("Saving profile data:", profileData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data if needed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
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

              {/* Stats for Borrower */}
              {profileData.role === "borrower" && (
                <div className="px-6 py-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {profileData.totalLoans}
                      </div>
                      <div className="text-sm text-gray-600">Active Loans</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {profileData.creditScore}
                      </div>
                      <div className="text-sm text-gray-600">Credit Score</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-5 h-5 mr-3" />
                    <span className="text-sm">{profileData.email}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-5 h-5 mr-3" />
                    <span className="text-sm">{profileData.phone}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3" />
                    <span className="text-sm">{profileData.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
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
                          className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {profileData.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {profileData.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {profileData.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {profileData.location}
                      </p>
                    )}
                  </div>

                  {profileData.role === "borrower" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          University
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.university}
                            onChange={(e) =>
                              handleInputChange("university", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        ) : (
                          <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                            {profileData.university}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        ) : (
                          <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                            {profileData.graduationYear}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg min-h-[100px]">
                      {profileData.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Summary */}
            {profileData.role === "borrower" && (
              <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Account Summary
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {profileData.creditScore}
                      </div>
                      <div className="text-sm text-gray-600">Credit Score</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-3">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {profileData.totalLoans}
                      </div>
                      <div className="text-sm text-gray-600">Active Loans</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-lg mx-auto mb-3">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {profileData.totalBorrowed}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Borrowed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
