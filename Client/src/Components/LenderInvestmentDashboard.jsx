import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  PieChart, 
  BarChart3, 
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Calculator,
  Zap
} from 'lucide-react';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

// Hook: prefers-reduced-motion
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handle = () => setReduced(mq.matches);
      handle();
      mq.addEventListener('change', handle);
      return () => mq.removeEventListener('change', handle);
    } catch {}
  }, []);
  return reduced;
};

const LenderInvestmentDashboard = () => {
  const { isDark } = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedAmount, setSelectedAmount] = useState(10000);
  const [recommendations, setRecommendations] = useState(null);
  const [interestTiers, setInterestTiers] = useState([]);
  const [marketInsights, setMarketInsights] = useState({
    averageReturn: 24.5,
    totalLoansIssued: 15432,
    defaultRate: 2.3,
    popularAmounts: [1000, 2500, 5000, 10000, 25000]
  });
  const [investmentScenarios, setInvestmentScenarios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterestTiers();
    fetchInvestmentRecommendations();
    generateInvestmentScenarios();
  }, [selectedAmount]);

  const fetchInterestTiers = async () => {
    try {
      const response = await API.get('/loans/interest-tiers');
      const tiers = response?.data?.tiers;
      if (Array.isArray(tiers)) {
        setInterestTiers(tiers);
      } else {
        console.warn('Unexpected interest tiers payload', response?.data);
        setInterestTiers([]);
      }
    } catch (error) {
      console.error('Error fetching interest tiers:', error);
    }
  };

  const fetchInvestmentRecommendations = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/loans/investment-recommendations/${selectedAmount}`);
      const rec = response?.data;
      if (rec && Array.isArray(rec.recommendations)) {
        setRecommendations(rec);
      } else {
        console.warn('Unexpected recommendations payload', response?.data);
        setRecommendations(null);
      }
    } catch (error) {
      console.error('Error fetching investment recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvestmentScenarios = () => {
    const scenarios = [
      {
        id: 1,
        name: "Conservative Portfolio",
        description: "Low-risk loans with guaranteed returns",
        allocation: [
          { range: "₹100-₹1,000", percentage: 40, expectedReturn: 15 },
          { range: "₹1,000-₹3,000", percentage: 60, expectedReturn: 18 }
        ],
        totalReturn: 16.8,
        riskLevel: "Low",
        minInvestment: 5000
      },
      {
        id: 2,
        name: "Balanced Portfolio",
        description: "Mix of small and medium loans for optimal returns",
        allocation: [
          { range: "₹100-₹1,000", percentage: 20, expectedReturn: 15 },
          { range: "₹1,000-₹3,000", percentage: 50, expectedReturn: 18 },
          { range: "₹3,000+", percentage: 30, expectedReturn: 24 }
        ],
        totalReturn: 20.4,
        riskLevel: "Medium",
        minInvestment: 10000
      },
      {
        id: 3,
        name: "Growth Portfolio",
        description: "Focus on larger loans for maximum returns",
        allocation: [
          { range: "₹1,000-₹3,000", percentage: 30, expectedReturn: 18 },
          { range: "₹3,000+", percentage: 70, expectedReturn: 24 }
        ],
        totalReturn: 22.2,
        riskLevel: "High",
        minInvestment: 25000
      }
    ];

    setInvestmentScenarios(scenarios.filter(s => selectedAmount >= s.minInvestment));
  };

  const calculatePotentialReturns = (amount, annualRate, months = 12) => {
    const monthlyRate = annualRate / 100 / 12;
    const totalReturn = amount * (1 + monthlyRate) ** months;
    return {
      principal: amount,
      returns: totalReturn - amount,
      total: totalReturn,
      monthlyReturn: (totalReturn - amount) / months
    };
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Theme tokens consolidated for reuse
  const T = React.useMemo(() => ({
    panelBase: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    panelShadow: 'shadow-lg',
    headingText: isDark ? 'text-gray-100' : 'text-gray-900',
    subText: isDark ? 'text-gray-400' : 'text-gray-600',
    subtleText: isDark ? 'text-gray-500' : 'text-gray-500',
    dividerBorder: isDark ? 'border-gray-700' : 'border-gray-200',
    neutralBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
    neutralBgHover: isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200',
    rangeTrack: isDark ? 'bg-gray-600' : 'bg-gray-200',
    focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' + (isDark ? 'focus-visible:ring-offset-gray-900' : 'focus-visible:ring-offset-white'),
  }), [isDark]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Inline style tag for custom range & skeleton shimmer */}
      <style>{`
        /* Range Slider Thumb */
        input[type=range] { --thumb-size: 16px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: var(--thumb-size); width: var(--thumb-size); border-radius: 9999px; background: linear-gradient(135deg,#2563eb,#7c3aed); border: 2px solid #fff; box-shadow: 0 0 0 2px rgba(124,58,237,0.4); cursor: pointer; }
        input[type=range]::-moz-range-thumb { height: var(--thumb-size); width: var(--thumb-size); border-radius: 9999px; background: linear-gradient(135deg,#2563eb,#7c3aed); border: 2px solid #fff; box-shadow: 0 0 0 2px rgba(124,58,237,0.4); cursor: pointer; }
        input[type=range]:focus-visible::-webkit-slider-thumb { outline: 2px solid #3b82f6; outline-offset: 2px; }
        /* Skeleton */
        .skeleton { position: relative; overflow: hidden; background: ${isDark ? '#374151' : '#e5e7eb'}; }
        .skeleton::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent); animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        ${prefersReducedMotion ? '.skeleton::after{animation:none;}' : ''}
      `}</style>
      {/* Header */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold flex items-center justify-center ${T.headingText}`}>
          <TrendingUp className="w-8 h-8 mr-3 text-green-600" />
          Lender Investment Dashboard
        </h1>
        <p className={`mt-2 ${T.subText}`}>Maximize your returns with intelligent loan investment strategies</p>
      </div>

      {/* Investment Amount Selector */}
      <div className={`rounded-xl ${T.panelShadow} p-6 ${T.panelBase}`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center ${T.headingText}`}>
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          Investment Amount
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${T.headingText}`}>
              Select Investment Amount: ₹{selectedAmount.toLocaleString()}
            </label>
            <input
              type="range"
              min="5000"
              max="500000"
              step="1000"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(parseInt(e.target.value))}
              className={`w-full h-3 rounded-lg appearance-none cursor-pointer ${T.rangeTrack}`}
            />
            <div className={`flex justify-between text-xs mt-1 ${T.subtleText}`}>
              <span>₹5,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[10000, 25000, 50000, 100000, 250000].map(amount => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedAmount === amount ? 'bg-blue-600 text-white' : `${T.neutralBg} ${isDark ? 'text-gray-200' : 'text-gray-700'} ${T.neutralBgHover}`} ${T.focusRing}`}
                tabIndex={0}
              >
                ₹{amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  <div className={`rounded-xl p-6 ${T.panelShadow} ${T.panelBase}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${T.subText}`}>Average Return</p>
              <p className="text-2xl font-bold text-green-500">{marketInsights.averageReturn}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
  <div className={`rounded-xl p-6 ${T.panelShadow} ${T.panelBase}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${T.subText}`}>Total Loans Issued</p>
              <p className="text-2xl font-bold text-blue-500">{marketInsights.totalLoansIssued.toLocaleString()}</p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>
  <div className={`rounded-xl p-6 ${T.panelShadow} ${T.panelBase}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${T.subText}`}>Default Rate</p>
              <p className="text-2xl font-bold text-red-500">{marketInsights.defaultRate}%</p>
            </div>
            <Shield className="w-8 h-8 text-red-600" />
          </div>
        </div>
  <div className={`rounded-xl p-6 ${T.panelShadow} ${T.panelBase}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${T.subText}`}>Your Investment</p>
              <p className="text-2xl font-bold text-purple-500">₹{selectedAmount.toLocaleString()}</p>
            </div>
            <Calculator className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Investment Scenarios */}
      <div className={`rounded-xl ${T.panelShadow} p-6 ${T.panelBase}`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center ${T.headingText}`}>
          <PieChart className="w-5 h-5 mr-2 text-purple-600" />
          Recommended Investment Portfolios
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {investmentScenarios.map(scenario => {
            const projectedReturns = calculatePotentialReturns(selectedAmount, scenario.totalReturn);
            
            return (
              <div key={scenario.id} className={`border rounded-xl p-6 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}> 
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${T.headingText}`}>{scenario.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(scenario.riskLevel)}`}>
                    {scenario.riskLevel} Risk
                  </span>
                </div>
                <p className={`text-sm mb-4 ${T.subText}`}>{scenario.description}</p>
                
                {/* Expected Returns */}
                <div className={`rounded-lg p-4 mb-4 ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}> 
                  <div className="text-center">
                    <p className={`text-sm ${T.subText}`}>Expected Annual Return</p>
                    <p className="text-2xl font-bold text-green-500">{scenario.totalReturn}%</p>
                    <p className={`text-sm mt-1 ${T.subText}`}>
                      ₹{projectedReturns.returns.toLocaleString()} returns on ₹{selectedAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Allocation Breakdown */}
                <div className="space-y-3">
                  <h4 className={`font-medium ${T.headingText}`}>Portfolio Allocation</h4>
                  {scenario.allocation.map((alloc, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className={`${T.subText}`}>{alloc.range}</span>
                          <span className="font-medium text-blue-500">{alloc.percentage}%</span>
                        </div>
                        <div className={`w-full rounded-full h-2 mt-1 ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{ width: `${alloc.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-4 text-sm text-green-500 font-medium">
                        {alloc.expectedReturn}%
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Monthly Projections */}
                <div className={`mt-4 pt-4 border-t ${T.dividerBorder}`}>
                  <div className="flex justify-between text-sm">
                    <span className={`${T.subText}`}>Monthly Returns:</span>
                    <span className="font-semibold text-green-500">₹{projectedReturns.monthlyReturn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className={`${T.subText}`}>Total After 1 Year:</span>
                    <span className={`font-semibold ${T.headingText}`}>₹{projectedReturns.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Recommendations */}
      {loading ? (
        <div className={`rounded-xl ${T.panelShadow} p-6 ${T.panelBase}`}>
          <div className="flex items-center justify-center py-8">
            {!prefersReducedMotion && <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>}
            {prefersReducedMotion && <div className="h-8 w-8 rounded-full border-2 border-blue-600/50" />}
            <span className={`ml-2 ${T.subText}`}>Loading recommendations...</span>
          </div>
        </div>
      ) : recommendations && (
        <div className={`rounded-xl ${T.panelShadow} p-6 ${T.panelBase}`}>
          <h2 className={`text-xl font-semibold mb-6 flex items-center ${T.headingText}`}>
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            Smart Investment Recommendations
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations?.recommendations?.map((rec, index) => (
              <div
                key={index}
                tabIndex={0}
                className={`border rounded-lg p-4 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'} ${T.focusRing}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className={`font-medium ${T.headingText}`}>{rec.strategy}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(rec.riskLevel)}`}>
                    {rec.riskLevel}
                  </span>
                </div>
                <p className={`text-sm mb-4 ${T.subText}`}>{rec.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${T.subText}`}>Expected Return:</span>
                    <span className="font-semibold text-green-500">{rec.expectedReturn}%</span>
                  </div>
                  
                  {rec.minimumAmount && (
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${T.subText}`}>Minimum Amount:</span>
                      <span className={`font-semibold ${T.headingText}`}>₹{rec.minimumAmount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {rec.diversificationTip && (
                    <div className={`mt-3 p-2 rounded text-xs ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                      <Info className="w-3 h-3 inline mr-1" />
                      {rec.diversificationTip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {recommendations.marketAnalysis && (
            <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
              <h4 className={`font-medium mb-2 flex items-center ${isDark ? 'text-yellow-300' : 'text-yellow-900'}`}>
                <AlertTriangle className="w-4 h-4 mr-1" />
                Market Analysis
              </h4>
              <p className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>{recommendations.marketAnalysis}</p>
            </div>
          )}
        </div>
      )}

      {/* Interest Rate Structure */}
      <div className={`rounded-xl ${T.panelShadow} p-6 ${T.panelBase}`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center ${T.headingText}`}>
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Current Interest Rate Structure
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interestTiers.map((tier, index) => (
            <div key={index} tabIndex={0} className={`border rounded-lg p-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} ${T.focusRing}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-medium ${T.headingText}`}>{tier.name}</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <div className={`text-sm ${T.subText}`}>
                  Amount Range: ₹{tier.minAmount.toLocaleString()} - {tier.maxAmount === 'No limit' ? 'Above' : `₹${tier.maxAmount.toLocaleString()}`}
                </div>
                {tier.type === 'flat' ? (
                  <div className={`rounded p-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <p className={`text-sm font-medium ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>Flat Fee Structure</p>
                    <p className="text-lg font-bold text-blue-500">₹{tier.flatFee} per loan</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{tier.description}</p>
                  </div>
                ) : (
                  <div className={`rounded p-3 ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                    <p className={`text-sm font-medium ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>Percentage Structure</p>
                    <p className="text-lg font-bold text-purple-500">{tier.annualRate}% p.a.</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{tier.description}</p>
                  </div>
                )}
                <div className={`pt-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-100'}`}>
                  <p className={`text-xs ${T.subtleText}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    Average loan duration: 1-6 months
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Tips */}
      <div className={`rounded-xl p-6 text-white bg-gradient-to-r from-blue-600 to-purple-600 ${isDark ? 'shadow-lg shadow-purple-900/20' : 'shadow-lg'}`}>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Investment Tips for Success
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Diversify Your Portfolio</h4>
                <p className="text-sm opacity-90">Spread investments across different loan amounts and risk levels</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Start with Conservative Approach</h4>
                <p className="text-sm opacity-90">Begin with smaller amounts to understand the platform</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Monitor Your Returns</h4>
                <p className="text-sm opacity-90">Track performance and adjust strategy accordingly</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Reinvest Returns</h4>
                <p className="text-sm opacity-90">Compound your earnings by reinvesting profits</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LenderInvestmentDashboard;
