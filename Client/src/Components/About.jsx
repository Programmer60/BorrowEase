import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';
import { 
  Target, 
  Users, 
  Award, 
  Shield, 
  Heart, 
  TrendingUp,
  CheckCircle,
  Star,
  Globe
} from 'lucide-react';

const About = () => {
  const { isDark } = useTheme();

  const values = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Trust & Security",
      description: "We prioritize the security of your financial data and ensure transparent lending practices."
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Student-Centric",
      description: "Every decision we make is focused on helping students achieve their educational dreams."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Innovation",
      description: "We leverage cutting-edge technology to make lending more efficient and accessible."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Accessibility",
      description: "We believe quality education financing should be available to students everywhere."
    }
  ];

  const team = [
    {
      name: "Priya Sharma",
      role: "CEO & Founder",
      description: "Former banking executive with 15+ years in educational finance",
      image: "👩‍💼"
    },
    {
      name: "Amit Kumar",
      role: "CTO",
      description: "Tech entrepreneur focused on fintech innovation",
      image: "👨‍💻"
    },
    {
      name: "Ravi Patel",
      role: "Head of Operations",
      description: "Expert in operational excellence and customer experience",
      image: "👨‍💼"
    },
    {
      name: "Sneha Gupta",
      role: "Head of Risk",
      description: "Risk management specialist with expertise in student lending",
      image: "👩‍🔬"
    }
  ];

  const stats = [
    { number: "50,000+", label: "Students Funded" },
    { number: "₹500Cr+", label: "Loans Disbursed" },
    { number: "95%", label: "Approval Rate" },
    { number: "4.8/5", label: "Student Rating" }
  ];

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              About <span className="text-blue-600">BorrowEase</span>
            </h1>
            <p className={`text-xl max-w-3xl mx-auto leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              We're on a mission to democratize access to quality education by connecting 
              students with trusted lenders through our innovative peer-to-peer lending platform.
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className={`rounded-2xl p-8 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow-xl`}>
            <div className="flex items-center mb-6">
              <Target className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Our Mission</h2>
            </div>
            <p className={`text-lg leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              To bridge the gap between students who need financial support for their education 
              and individuals who want to invest in the future by providing transparent, 
              affordable, and accessible lending solutions.
            </p>
          </div>

          <div className={`rounded-2xl p-8 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow-xl`}>
            <div className="flex items-center mb-6">
              <Award className="w-8 h-8 text-purple-600 mr-3" />
              <h2 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Our Vision</h2>
            </div>
            <p className={`text-lg leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              To create a world where financial constraints never limit a student's 
              potential to pursue quality education and achieve their dreams.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className={`text-3xl font-bold text-center mb-12 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>Our Impact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className={`text-center p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <div className="text-3xl font-bold text-blue-600 mb-2">{stat.number}</div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className={`text-3xl font-bold text-center mb-12 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <div key={index} className={`text-center p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg hover:shadow-xl transition-shadow`}>
              <div className="flex justify-center text-blue-600 mb-4">
                {value.icon}
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{value.title}</h3>
              <p className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className={`text-3xl font-bold text-center mb-12 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>Meet Our Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <div key={index} className={`text-center p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg hover:shadow-xl transition-shadow`}>
              <div className="text-6xl mb-4">{member.image}</div>
              <h3 className={`text-xl font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{member.name}</h3>
              <p className="text-blue-600 font-medium mb-3">{member.role}</p>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{member.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className={`py-16 ${
        isDark ? 'bg-gray-800' : 'bg-blue-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-3xl font-bold text-center mb-12 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Why Choose BorrowEase?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Transparent Process</h3>
              <p className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>No hidden fees or surprise charges. Everything is clear and upfront.</p>
            </div>
            <div className="text-center">
              <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Student-First Approach</h3>
              <p className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>Every feature and policy is designed with student success in mind.</p>
            </div>
            <div className="text-center">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Community Driven</h3>
              <p className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>Building a community where students and lenders grow together.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-8 ${
        isDark ? 'bg-gray-900' : 'bg-gray-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 BorrowEase. All rights reserved. Empowering education, one loan at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
