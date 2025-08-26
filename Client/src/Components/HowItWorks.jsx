import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';
import { 
  UserPlus, 
  FileText, 
  Search, 
  HandHeart, 
  CheckCircle, 
  DollarSign,
  Clock,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Star,
  Award
} from 'lucide-react';

const HowItWorks = () => {
  const { isDark } = useTheme();

  const borrowerSteps = [
    {
      step: "1",
      icon: <UserPlus className="w-8 h-8" />,
      title: "Sign Up & Verify",
      description: "Create your account and complete KYC verification with your educational documents."
    },
    {
      step: "2",
      icon: <FileText className="w-8 h-8" />,
      title: "Submit Loan Request",
      description: "Fill out your loan application with course details, amount needed, and repayment preferences."
    },
    {
      step: "3",
      icon: <Search className="w-8 h-8" />,
      title: "Get Matched",
      description: "Our AI system matches you with suitable lenders based on your profile and requirements."
    },
    {
      step: "4",
      icon: <HandHeart className="w-8 h-8" />,
      title: "Connect with Lenders",
      description: "Review lender profiles, negotiate terms, and choose the best offer for your needs."
    },
    {
      step: "5",
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Loan Approval",
      description: "Once terms are agreed, complete the final verification and receive your funds."
    }
  ];

  const lenderSteps = [
    {
      step: "1",
      icon: <UserPlus className="w-8 h-8" />,
      title: "Register as Lender",
      description: "Sign up with your investment preferences and complete financial verification."
    },
    {
      step: "2",
      icon: <Search className="w-8 h-8" />,
      title: "Browse Opportunities",
      description: "Explore student loan requests that match your investment criteria and risk appetite."
    },
    {
      step: "3",
      icon: <FileText className="w-8 h-8" />,
      title: "Review Applications",
      description: "Assess student profiles, academic records, and loan requirements in detail."
    },
    {
      step: "4",
      icon: <HandHeart className="w-8 h-8" />,
      title: "Make Offers",
      description: "Submit competitive offers with terms that work for both you and the student."
    },
    {
      step: "5",
      icon: <DollarSign className="w-8 h-8" />,
      title: "Earn Returns",
      description: "Receive regular repayments and track your investment performance through our platform."
    }
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Transactions",
      description: "Bank-grade security with encrypted data and secure payment processing."
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Quick Processing",
      description: "Fast approval process with most loans processed within 48-72 hours."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Competitive Rates",
      description: "Better interest rates than traditional banks through peer-to-peer lending."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Community Support",
      description: "Join a community of students and investors committed to educational success."
    }
  ];

  const benefits = {
    students: [
      "Lower interest rates compared to traditional loans",
      "Flexible repayment options",
      "Quick approval process",
      "No collateral required for most loans",
      "Direct communication with lenders",
      "Transparent fee structure"
    ],
    lenders: [
      "Higher returns than traditional investments",
      "Support student education and make social impact",
      "Diversify your investment portfolio",
      "Choose your investment criteria",
      "Regular monthly returns",
      "Platform handles all loan management"
    ]
  };

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
              How <span className="text-blue-600">BorrowEase</span> Works
            </h1>
            <p className={`text-xl max-w-3xl mx-auto leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Connecting students with lenders through a simple, transparent, and secure 
              peer-to-peer lending platform.
            </p>
          </div>
        </div>
      </div>

      {/* For Students */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className={`text-3xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>For Students</h2>
          <p className={`text-lg ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>Get the funding you need for your education in 5 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {borrowerSteps.map((step, index) => (
            <div key={index} className="relative">
              <div className={`rounded-xl p-6 h-full ${
                isDark ? 'bg-gray-800' : 'bg-white'
              } shadow-lg hover:shadow-xl transition-shadow`}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">{step.step}</span>
                  </div>
                  <div className="flex justify-center text-blue-600 mb-4">
                    {step.icon}
                  </div>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{step.title}</h3>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>{step.description}</p>
                </div>
              </div>
              {index < borrowerSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className={`w-6 h-6 ${
                    isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* For Lenders */}
      <div className={`py-16 ${
        isDark ? 'bg-gray-800' : 'bg-blue-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>For Lenders</h2>
            <p className={`text-lg ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>Invest in student success and earn attractive returns</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {lenderSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className={`rounded-xl p-6 h-full ${
                  isDark ? 'bg-gray-700' : 'bg-white'
                } shadow-lg hover:shadow-xl transition-shadow`}>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-green-600">{step.step}</span>
                    </div>
                    <div className="flex justify-center text-green-600 mb-4">
                      {step.icon}
                    </div>
                    <h3 className={`text-lg font-semibold mb-3 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>{step.title}</h3>
                    <p className={`text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>{step.description}</p>
                  </div>
                </div>
                {index < lenderSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className={`w-6 h-6 ${
                      isDark ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className={`text-3xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Why Choose Our Platform?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className={`text-center p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg hover:shadow-xl transition-shadow`}>
              <div className="flex justify-center text-blue-600 mb-4">
                {feature.icon}
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{feature.title}</h3>
              <p className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className={`py-16 ${
        isDark ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Student Benefits */}
            <div className={`rounded-2xl p-8 ${
              isDark ? 'bg-gray-700' : 'bg-white'
            } shadow-xl`}>
              <div className="flex items-center mb-6">
                <Star className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Student Benefits</h3>
              </div>
              <ul className="space-y-3">
                {benefits.students.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className={`${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lender Benefits */}
            <div className={`rounded-2xl p-8 ${
              isDark ? 'bg-gray-700' : 'bg-white'
            } shadow-xl`}>
              <div className="flex items-center mb-6">
                <Award className="w-8 h-8 text-green-600 mr-3" />
                <h3 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Lender Benefits</h3>
              </div>
              <ul className="space-y-3">
                {benefits.lenders.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className={`${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className={`rounded-2xl p-8 text-center ${
          isDark ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
        }`}>
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of students and lenders already using BorrowEase
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Apply for a Loan
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Become a Lender
            </button>
          </div>
        </div>
      </div> */}

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

export default HowItWorks;
