import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  MessageSquare,
  HelpCircle,
  Shield,
  Users,
  CheckCircle
} from 'lucide-react';

const Contact = () => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
    }, 2000);
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Us",
      details: "support@borrowease.com",
      subtext: "We'll respond within 24 hours"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Us",
      details: "+91 1800-123-4567",
      subtext: "Mon-Fri, 9 AM - 6 PM IST"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Visit Us",
      details: "123 Education Hub, Mumbai, India",
      subtext: "Schedule an appointment"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Business Hours",
      details: "Mon-Fri: 9 AM - 6 PM",
      subtext: "Weekend support via email"
    }
  ];

  const supportCategories = [
    {
      icon: <HelpCircle className="w-8 h-8" />,
      title: "General Support",
      description: "Questions about our platform, how it works, or getting started"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Account Help",
      description: "Issues with your account, login problems, or profile updates"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Security & Privacy",
      description: "Data protection, security concerns, or privacy questions"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Technical Issues",
      description: "Website bugs, payment problems, or app-related issues"
    }
  ];

  const faqs = [
    {
      question: "How long does the loan approval process take?",
      answer: "Most loans are processed within 48-72 hours after all documents are submitted and verified."
    },
    {
      question: "What are the interest rates?",
      answer: "Interest rates vary based on loan amount, tenure, and borrower profile, typically ranging from 8-15% annually."
    },
    {
      question: "Is there a minimum credit score required?",
      answer: "We don't require a traditional credit score. We evaluate students based on academic performance and future earning potential."
    },
    {
      question: "Can I repay my loan early?",
      answer: "Yes, you can prepay your loan without any penalties. Early repayment may also reduce your total interest."
    }
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
              Get in <span className="text-blue-600">Touch</span>
            </h1>
            <p className={`text-xl max-w-3xl mx-auto leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Have questions? We're here to help. Reach out to our support team 
              and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {contactInfo.map((info, index) => (
            <div key={index} className={`text-center p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg hover:shadow-xl transition-shadow`}>
              <div className="flex justify-center text-blue-600 mb-4">
                {info.icon}
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{info.title}</h3>
              <p className={`font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>{info.details}</p>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{info.subtext}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form & Support Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className={`rounded-2xl p-8 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow-xl`}>
            <h2 className={`text-2xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Send us a Message</h2>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Message Sent!</h3>
                <p className={`${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Thank you for contacting us. We'll get back to you within 24 hours.</p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'border-gray-600 bg-gray-700 text-gray-100' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="general">General Support</option>
                    <option value="account">Account Help</option>
                    <option value="security">Security & Privacy</option>
                    <option value="technical">Technical Issues</option>
                    <option value="business">Business Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'border-gray-600 bg-gray-700 text-gray-100' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      isDark 
                        ? 'border-gray-600 bg-gray-700 text-gray-100' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="Please provide as much detail as possible..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Support Categories */}
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Support Categories</h2>
            <div className="space-y-4">
              {supportCategories.map((category, index) => (
                <div key={index} className={`p-6 rounded-xl ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                } shadow-lg hover:shadow-xl transition-shadow`}>
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-4 mt-1">
                      {category.icon}
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold mb-2 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>{category.title}</h3>
                      <p className={`${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>{category.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={`py-16 ${
        isDark ? 'bg-gray-800' : 'bg-blue-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Frequently Asked Questions</h2>
            <p className={`text-lg ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>Quick answers to common questions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className={`p-6 rounded-xl ${
                isDark ? 'bg-gray-700' : 'bg-white'
              } shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>{faq.question}</h3>
                <p className={`${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>{faq.answer}</p>
              </div>
            ))}
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

export default Contact;
