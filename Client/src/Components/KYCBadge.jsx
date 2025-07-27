import React from 'react';
import { Shield, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';

const KYCBadge = ({ kycStatus, size = 'sm', showText = true }) => {
  const getKYCConfig = (status) => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          text: 'KYC Verified',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'KYC Pending',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-200'
        };
      case 'rejected':
        return {
          icon: X,
          text: 'KYC Rejected',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200'
        };
      case 'not_submitted':
      default:
        return {
          icon: AlertTriangle,
          text: 'KYC Required',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getKYCConfig(kycStatus);
  const Icon = config.icon;
  
  const sizeClasses = {
    xs: {
      container: 'px-1.5 py-0.5 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1.5'
    },
    md: {
      container: 'px-2.5 py-1.5 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-2'
    },
    lg: {
      container: 'px-3 py-2 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2.5'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className={`
      inline-flex items-center rounded-full font-medium border
      ${config.bgColor} ${config.textColor} ${config.borderColor}
      ${currentSize.container} ${currentSize.gap}
    `}>
      <Icon className={`${config.iconColor} ${currentSize.icon} flex-shrink-0`} />
      {showText && (
        <span className="whitespace-nowrap">{config.text}</span>
      )}
    </div>
  );
};

export default KYCBadge;
