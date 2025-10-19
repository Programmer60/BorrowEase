import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { API_ORIGIN } from '../config';

export default function LegalDocument() {
  const { documentType } = useParams(); // 'privacy-policy' or 'terms-of-service'
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the HTML content from the backend
        // Note: Legal routes are mounted at /legal (not /api/legal)
        const response = await fetch(`${API_ORIGIN}/legal/${documentType}`, {
          headers: {
            'Accept': 'text/html'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load document');
        }

        const html = await response.text();
        setContent(html);
      } catch (err) {
        console.error('Error fetching legal document:', err);
        setError('Failed to load the document. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentType]);

  const getTitle = () => {
    if (documentType === 'privacy-policy') return 'Privacy Policy';
    if (documentType === 'terms-of-service') return 'Terms of Service';
    return 'Legal Document';
  };

  const handleBack = () => {
    // If there's history, go back, otherwise go to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3" style={{ marginLeft: '12px', marginBottom: '20px' }}>
            <button
              onClick={handleBack}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <FileText className={`w-6 h-6 flex-shrink-0 ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`} />
            <h1 className={`text-xl sm:text-2xl font-bold ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {getTitle()}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className={`p-6 rounded-lg border ${
            isDark 
              ? 'bg-red-900/20 border-red-800 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <p className="text-center">{error}</p>
          </div>
        )}

        {!loading && !error && content && (
          <div className={`prose prose-sm sm:prose lg:prose-lg max-w-none ${
            isDark 
              ? 'prose-invert prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-200 prose-li:text-gray-300' 
              : 'prose-headings:text-gray-900 prose-p:text-gray-700'
          }`}>
            <div 
              dangerouslySetInnerHTML={{ __html: content }}
              className={`legal-document ${
                isDark ? 'legal-document-dark' : 'legal-document-light'
              }`}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t mt-12 ${
        isDark ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className={`text-center text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Custom styles for legal document */}
      <style>{`
        .legal-document h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .legal-document h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .legal-document h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .legal-document p {
          margin-bottom: 1rem;
          line-height: 1.75;
        }
        .legal-document ul, .legal-document ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .legal-document li {
          margin-bottom: 0.5rem;
        }
        .legal-document strong {
          font-weight: 600;
        }
        .legal-document-dark h1,
        .legal-document-dark h2,
        .legal-document-dark h3 {
          color: #e5e7eb;
        }
        .legal-document-dark p,
        .legal-document-dark li {
          color: #d1d5db;
        }
        .legal-document-light h1,
        .legal-document-light h2,
        .legal-document-light h3 {
          color: #111827;
        }
        .legal-document-light p,
        .legal-document-light li {
          color: #374151;
        }
      `}</style>
    </div>
  );
}
