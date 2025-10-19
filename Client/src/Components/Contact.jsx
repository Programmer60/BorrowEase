import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';
import API from '../api/api';
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
import toast from 'react-hot-toast';

const Contact = () => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [faqLogId, setFaqLogId] = useState(null);
  const [faqEscalatePending, setFaqEscalatePending] = useState(false);
  const [isDeflected, setIsDeflected] = useState(false); // NEW: marks resolved via FAQ
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitType, setSubmitType] = useState(''); // 'success' | 'error' | 'info'
  const [overrideFAQ, setOverrideFAQ] = useState(false);
  const [matchedFAQ, setMatchedFAQ] = useState(null);
  const [openCategories, setOpenCategories] = useState([]);
  const [openFAQ, setOpenFAQ] = useState({});
  const [faqSearch, setFaqSearch] = useState('');
  // Email verification MVP (frontend)
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMessageId, setVerificationMessageId] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState({ state: 'idle', error: '' }); // idle|verifying|success|error
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Added helper to log auto-resolve once per matched FAQ
  const logFaqAutoResolve = async (faq) => {
    if (faqLogId) return; // already logged
    try {
      const res = await fetch(`${API.defaults.baseURL}/contact/faq-auto-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: faq.q,
          category: faq.category || faq.categoryTitle || formData.category,
          keywordsMatched: faq.keywords || [],
          userEmail: formData.email || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setFaqLogId(data.id);
        console.log('📝 Logged FAQ auto-resolve id', data.id);
      }
    } catch (e) {
      console.warn('Failed to log faq auto resolve', e);
    }
  };

  // Modified handleSubmit to escalate if needed
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    setSubmitType('');
    
    // Basic validation
    if (!formData.name.trim()) {
      setSubmitMessage('Please enter your name');
      setSubmitType('error');
      setIsSubmitting(false);
      return;
    }
    
    if (!formData.email.trim() || !formData.email.includes('@') || !formData.email.includes('.')) {
      setSubmitMessage('Please enter a valid email address');
      setSubmitType('error');
      setIsSubmitting(false);
      return;
    }
    
    if (!formData.subject.trim()) {
      setSubmitMessage('Please enter a subject');
      setSubmitType('error');
      setIsSubmitting(false);
      return;
    }
    
    if (!formData.message.trim()) {
      setSubmitMessage('Please enter your message');
      setSubmitType('error');
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log('📧 Submitting contact form:', formData);
      // Intercept if FAQ matches and user hasn't chosen to override
      if (!overrideFAQ) {
        const match = findFAQMatch();
        if (match) {
          // Attach category title so logging has it
          const extended = { ...match, category: match.category || match.categoryTitle };
          setMatchedFAQ(extended);
          setSubmitMessage('We found an existing answer that may solve your issue.');
          setSubmitType('info');
          toast('Similar question detected', { icon: '💡' });
          // Log the deflection attempt immediately
          logFaqAutoResolve(extended);
          setIsSubmitting(false);
          return;
        }
      }
      // Send contact message to server
      const response = await API.post('/contact/submit', formData);
      
      if (response.data.success) {
        console.log('✅ Message submitted successfully:', response.data);
        
        setIsSubmitted(true);
        // If backend triggered verification (guest path) it will still say success but we need to show code modal.
        if (response.data.success && response.data.estimatedResponseTime && !response.data.autoResponseSent) {
          // Heuristic: backend currently does not return explicit flag; we can add later. For now always allow verify flow for guests.
        }
        // Capture messageId to support verification requests
        if (response.data.messageId) {
          setVerificationMessageId(response.data.messageId);
          // Assume guest path if not authenticated -> show verification modal (could refine if we pass a backend flag later)
          setPendingVerification(true);
          setSubmitMessage('Verification code sent to your email. Enter it below to unlock faster responses.');
          setSubmitType('info');
          toast.success('Verification code sent');
        } else {
          setSubmitMessage(response.data.message || 'Message sent successfully!');
          setSubmitType('success');
        }
        
        // If user chose to escalate after seeing FAQ, patch escalation
        if (faqEscalatePending && faqLogId) {
          try {
            await fetch(`${API.defaults.baseURL}/contact/faq-auto-resolve/${faqLogId}/escalate`, { method: 'PATCH' });
            console.log('↗️ Escalated FAQ log', faqLogId);
          } catch (err) {
            console.warn('Failed to escalate FAQ log', err);
          }
        }
        
        // Reset states
        setFaqLogId(null);
        setFaqEscalatePending(false);
        setOverrideFAQ(false);
        setMatchedFAQ(null);
        // Do NOT clear email/subject if awaiting verification so user can still see context
        if (!pendingVerification) {
          setFormData({
            name: '',
            email: '',
            subject: '',
            message: '',
            category: 'general'
          });
        }
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false);
          setSubmitMessage('');
          setSubmitType('');
        }, 5000);
      }
    } catch (error) {
      console.error('❌ Error submitting contact message:', error);
      
      let errorMessage = 'Failed to send message. Please try again.';
      
      // Handle different error scenarios
      if (error.response?.status === 403) {
        errorMessage = 'Message blocked due to security concerns. Please contact support if you believe this is an error.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many messages sent. Please wait before sending another message.';
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.missing) {
          errorMessage = 'Please fill in all required fields.';
        } else {
          errorMessage = errorData.error || 'Invalid message content. Please check your input.';
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setSubmitMessage(errorMessage);
      setSubmitType('error');
      
      // Auto-hide error message after 8 seconds
      setTimeout(() => {
        setSubmitMessage('');
        setSubmitType('');
      }, 8000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim() || verificationCode.length < 4) return;
    setVerifyStatus({ state: 'verifying', error: '' });
    try {
      const res = await fetch(`${API.defaults.baseURL}/contact/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: verificationMessageId, code: verificationCode.trim() })
      });
      const data = await res.json();
      if (!data.success) {
        if (data.expired) throw new Error('Code expired. Request a new one.');
        if (data.invalid) throw new Error(`Invalid code (attempts: ${data.attempts || 0})`);
        throw new Error(data.error || 'Verification failed');
      }
      setVerifyStatus({ state: 'success', error: '' });
      toast.success('Email verified!');
      setPendingVerification(false);
      // Reset form after verification success to avoid user confusion
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '', category: 'general' });
        setIsSubmitted(false);
        setVerificationCode('');
        setVerificationMessageId(null);
      }, 1800);
    } catch (err) {
      setVerifyStatus({ state: 'error', error: err.message });
      toast.error(err.message);
    }
  };

  const handleResendCode = async () => {
    if (!verificationMessageId || resendCooldown > 0) return;
    try {
      const res = await fetch(`${API.defaults.baseURL}/contact/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: verificationMessageId, email: formData.email })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Verification code resent');
        setResendCooldown(60);
      } else {
        toast.error(data.error || 'Failed to resend');
      }
    } catch (e) {
      toast.error('Network error resending code');
    }
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Us",
      details: "mishrashivam7465@gmail.com",
      subtext: "We'll respond within 24 hours"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Us",
      details: "+91 82181XXXXX",
      subtext: "Mon-Fri, 9 AM - 6 PM IST"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Visit Us",
      details: "Srinagar, Uttarakhand, India",
      subtext: "Schedule an appointment"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Business Hours",
      details: "Mon-Fri: 9 AM - 6 PM",
      subtext: "Weekend support via email"
    }
  ];

  // Unified support categories with embedded FAQs to reduce duplicate submissions.
  const supportCategories = [
    {
      key: 'general',
      icon: <HelpCircle className="w-8 h-8" />,
      title: 'General Support',
      description: 'Questions about our platform, how it works, or getting started',
      faqs: [
        { q: 'How do I get started?', a: 'Create an account, complete your profile, then submit a loan pre-assessment to begin.', keywords: ['get started','start','begin'] },
        { q: 'What documents are required?', a: 'Usually student ID, proof of enrollment, identity/KYC docs, and sometimes income projections.', keywords: ['documents','required','docs'] },
        { q: 'How long does the loan approval process take?', a: 'Most approvals finalize within 48–72 hours after verification.', keywords: ['approval','48','72','process take'] }
      ]
    },
    {
      key: 'account',
      icon: <Users className="w-8 h-8" />,
      title: 'Account Help',
      description: 'Issues with your account, login problems, or profile updates',
      faqs: [
        { q: 'I forgot my password. What do I do?', a: 'Use the “Forgot Password” link. If still locked out, contact support with your registered email.', keywords: ['forgot password','reset password'] },
        { q: 'Can I change my registered email?', a: 'No, you cannot change your registered email.', keywords: ["change email","update email","new email"] }
      ]
    },
    {
      key: 'security',
      icon: <Shield className="w-8 h-8" />,
      title: 'Security & Privacy',
      description: 'Data protection, security concerns, or privacy questions',
      faqs: [
        { q: 'Is my data secure?', a: 'We encrypt data at rest and in transit, enforce least privilege, and monitor continuously.', keywords: ['data secure','data security','secure'] },
        { q: 'How do I report suspicious activity?', a: 'Reset your password immediately and contact support with details (time, action noticed).', keywords: ['suspicious','unauthorized','hack'] }
      ]
    },
    {
      key: 'technical',
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'Technical Issues',
      description: 'Website bugs, payment problems, or app-related issues',
      faqs: [
        { q: 'Why is my payment failing?', a: 'Confirm payment method details and balance. Try another method or contact your bank if it persists.', keywords: ['payment failing','payment error','cannot pay'] },
        { q: 'I found a bug. How do I report it?', a: 'Provide steps to reproduce, browser/device, and screenshots for faster resolution.', keywords: ['bug','issue','error'] }
      ]
    }
  ];

  const allFAQs = useMemo(() => supportCategories.flatMap(cat => cat.faqs.map(f => ({ ...f, category: cat.title, key: cat.key }))), [supportCategories]);

  const filteredCategories = useMemo(() => {
    if (!faqSearch.trim()) return supportCategories;
    const term = faqSearch.toLowerCase();
    return supportCategories.map(cat => ({
      ...cat,
      faqs: cat.faqs.filter(f => f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term) || f.keywords?.some(k => k.includes(term)))
    })).filter(cat => cat.faqs.length > 0);
  }, [faqSearch, supportCategories]);

  const highlight = (text) => {
    if (!faqSearch.trim()) return text;
    const term = faqSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${term})`, 'ig');
    return text.split(regex).map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-300/60 dark:bg-yellow-600/60 px-0.5 rounded">{part}</mark> : part);
  };

  const toggleCategory = (title) => {
    setOpenCategories(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
  };
  const toggleFAQ = (catTitle, index) => {
    setOpenFAQ(prev => ({ ...prev, [catTitle]: prev[catTitle] === index ? null : index }));
  };
  const findFAQMatch = () => {
    const text = (formData.subject + ' ' + formData.message).toLowerCase();
    for (const faq of allFAQs) {
      const qLower = faq.q.toLowerCase();
      const keywordHit = faq.keywords?.some(k => text.includes(k));
      if (text.includes(qLower) || keywordHit) return faq;
    }
    return null;
  };

  // Add handlers for FAQ decision actions
  const handleFaqSolved = () => {
    if (matchedFAQ) logFaqAutoResolve(matchedFAQ);
    setIsDeflected(true);
    setSubmitMessage('Question resolved instantly via FAQ. No ticket created.');
    setSubmitType('success');
    toast.success('Marked as solved');
    setMatchedFAQ(null);
    setFaqEscalatePending(false);
    setOverrideFAQ(false);
  };
  const handleFaqNeedHelp = () => {
    setOverrideFAQ(true);
    setFaqEscalatePending(true);
    setIsDeflected(false);
    toast('FAQ acknowledged – you can submit now.', { icon: '📨' });
    setSubmitMessage('FAQ noted. Click Send again to contact support.');
    setSubmitType('info');
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
                {/* Status Message */}
                {submitMessage && (
                  <div className={`p-4 rounded-lg border ${
                    submitType === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    submitType === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {submitType === 'success' && <CheckCircle className="w-5 h-5" />}
                      {submitType === 'error' && <div className="w-5 h-5 text-red-500">⚠️</div>}
                      {submitType === 'info' && <div className="w-5 h-5 text-blue-500">💡</div>}
                      <div className="flex-1 text-sm">
                        <p className="font-medium mb-1 flex items-center gap-2">{submitMessage}
                          {isDeflected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wide">
                              Deflected
                            </span>
                          )}
                        </p>
                        {matchedFAQ && submitType === 'info' && (
                          <div className={`${isDark ? 'bg-gray-700 border-blue-400/30' : 'bg-white border-blue-200'} mt-2 rounded border p-3`}>
                            <p className="font-semibold mb-1">Suggested Answer:</p>
                            <p className={`${isDark ? 'text-blue-200' : 'text-blue-900'} mb-3`}>{matchedFAQ.a}</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={handleFaqSolved}
                                disabled={isDeflected}
                                className={`px-3 py-1 text-xs rounded text-white ${isDeflected ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                              >✅ Problem Solved</button>
                              <button
                                type="button"
                                onClick={handleFaqNeedHelp}
                                disabled={faqEscalatePending && overrideFAQ}
                                className={`px-3 py-1 text-xs rounded text-white ${faqEscalatePending && overrideFAQ ? 'bg-yellow-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                              >Still Need Help</button>
                              <button
                                type="button"
                                onClick={() => { setMatchedFAQ(null); setSubmitMessage(''); setSubmitType(''); setIsDeflected(false); setFaqEscalatePending(false); }}
                                className="px-3 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
                              >Dismiss</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                      onBlur={(e) => {
                        const email = e.target.value;
                        if (email && (!email.includes('@') || !email.includes('.'))) {
                          setSubmitMessage('Please enter a valid email address (e.g., user@example.com)');
                          setSubmitType('error');
                        } else if (submitType === 'error' && submitMessage.includes('email')) {
                          setSubmitMessage('');
                          setSubmitType('');
                        }
                      }}
                    />
                    {formData.email && (!formData.email.includes('@') || !formData.email.includes('.')) && (
                      <p className="text-red-500 text-sm mt-1">Please enter a complete email address</p>
                    )}
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
                  disabled={isDeflected || isSubmitting || !formData.name || !formData.email || !formData.subject || !formData.message}
                  className={`w-full py-3 px-6 rounded-lg transition-colors flex items-center justify-center font-medium ${
                    isDeflected || isSubmitting || !formData.name || !formData.email || !formData.subject || !formData.message
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isDeflected ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolved via FAQ
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
                
                {/* Form validation helper */}
                {(!formData.name || !formData.email || !formData.subject || !formData.message) && (
                  <p className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Please fill in all required fields to send your message
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Support Categories with embedded FAQ accordions */}
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Support Categories</h2>
            <div className="mb-4 relative">
              <input
                type="text"
                aria-label="Search FAQs"
                placeholder="Search FAQs..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              />
              {faqSearch && (
                <button
                  type="button"
                  onClick={() => setFaqSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                  aria-label="Clear FAQ search"
                >✕</button>
              )}
            </div>
            <div className="space-y-4">
              {filteredCategories.map((cat, idx) => {
                const expanded = openCategories.includes(cat.title);
                return (
                  <div key={idx} className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md`} role="region" aria-labelledby={`cat-${idx}`}> 
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.title)}
                      className={`w-full flex items-start justify-between text-left p-5 transition ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                      aria-expanded={expanded}
                      aria-controls={`cat-panel-${idx}`}
                      id={`cat-${idx}`}
                    >
                      <div className="flex items-start">
                        <div className="text-blue-600 mr-4 mt-1">{cat.icon}</div>
                        <div>
                          <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{highlight(cat.title)}</h3>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{highlight(cat.description)}</p>
                        </div>
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          id={`cat-panel-${idx}`}
                          role="region"
                          aria-label={`${cat.title} FAQs`}
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className={`px-6 pb-5 space-y-3 ${isDark ? 'bg-gray-750' : 'bg-white'}`}
                        >
                          {cat.faqs.map((faq, fIdx) => {
                            const open = openFAQ[cat.title] === fIdx;
                            return (
                              <div key={fIdx} className={`border rounded-lg ${isDark ? 'border-gray-600' : 'border-gray-200'} overflow-hidden`}>
                                <button
                                  type="button"
                                  onClick={() => toggleFAQ(cat.title, fIdx)}
                                  className={`w-full flex justify-between items-center px-4 py-3 text-left ${isDark ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-50 hover:bg-gray-100'} transition`}
                                  aria-expanded={open}
                                  aria-controls={`faq-${idx}-${fIdx}`}
                                  id={`faq-btn-${idx}-${fIdx}`}
                                >
                                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{highlight(faq.q)}</span>
                                  <span className="ml-4 text-xl text-blue-600">{open ? '−' : '+'}</span>
                                </button>
                                <AnimatePresence initial={false}>
                                  {open && (
                                    <motion.div
                                      key="panel"
                                      id={`faq-${idx}-${fIdx}`}
                                      role="region"
                                      aria-labelledby={`faq-btn-${idx}-${fIdx}`}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className={`px-4 py-3 text-sm ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
                                    >
                                      <p className="mb-3 leading-relaxed">{highlight(faq.a)}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {filteredCategories.length === 0 && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No FAQs matched your search.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Standalone FAQ section removed (now integrated above). */}

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

      {/* Email Verification Modal */}
      <AnimatePresence>
        {pendingVerification && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-xl p-6 shadow-2xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Verify Your Email</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                We sent a 6-digit verification code to <span className="font-medium">{formData.email}</span>. Enter it below to confirm ownership so our team can send a reply. This prevents someone from using another person’s email.
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className={`w-full tracking-widest text-center text-2xl font-mono py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  placeholder="──────"
                />
                {verifyStatus.state === 'error' && (
                  <p className="text-sm text-red-500">{verifyStatus.error}</p>
                )}
                {verifyStatus.state === 'success' && (
                  <p className="text-sm text-green-600">Verified! Enqueued any pending replies.</p>
                )}
                <div className="flex items-center justify-between">
                  <button type="button" onClick={handleResendCode} disabled={resendCooldown>0 || verifyStatus.state==='verifying'}
                    className={`text-sm font-medium ${resendCooldown>0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}
                  >{resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</button>
                  <div className="text-xs text-gray-500">Expires in 15 min</div>
                </div>
                <button type="submit" disabled={verificationCode.length < 6 || verifyStatus.state==='verifying'}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${verificationCode.length<6 || verifyStatus.state==='verifying' ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >{verifyStatus.state==='verifying' ? 'Verifying...' : 'Verify Email'}</button>
                <button type="button" onClick={() => { setPendingVerification(false); }}
                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 mt-1">Skip for now (reply will wait)</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Contact;
