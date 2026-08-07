import React from 'react';

interface MercadoPagoIconProps {
  className?: string;
  variant?: 'badge' | 'circle' | 'symbol';
}

/**
 * Official Mercado Pago Handshake Logo Icon
 */
export default function MercadoPagoIcon({ 
  className = "h-4 w-4", 
  variant = 'badge' 
}: MercadoPagoIconProps) {
  if (variant === 'symbol') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${className} shrink-0`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15.82 8.7a1.99 1.99 0 0 0-2.82 0l-4.77 4.77a.8.8 0 0 1-1.13 0l-1.13-1.13a1.99 1.99 0 0 0-2.82 0 1.99 1.99 0 0 0 0 2.82l2.26 2.26c.78.78 2.05.78 2.83 0l5.94-5.94a1.99 1.99 0 0 0 0-2.78z" />
        <path d="M17.18 10.07a1.99 1.99 0 0 0-2.82 0l-1.13 1.13a.8.8 0 0 1-1.13 0l-4.77-4.77a1.99 1.99 0 0 0-2.82 0 1.99 1.99 0 0 0 0 2.82l5.94 5.94c.78.78 2.05.78 2.83 0l2.26-2.26a1.99 1.99 0 0 0 0-2.86z" opacity=".85" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {variant === 'circle' ? (
        <circle cx="12" cy="12" r="11" fill="#009EE3" />
      ) : (
        <rect width="24" height="24" rx="6" fill="#009EE3" />
      )}
      <path
        d="M15.82 8.7a1.99 1.99 0 0 0-2.82 0l-4.77 4.77a.8.8 0 0 1-1.13 0l-1.13-1.13a1.99 1.99 0 0 0-2.82 0 1.99 1.99 0 0 0 0 2.82l2.26 2.26c.78.78 2.05.78 2.83 0l5.94-5.94a1.99 1.99 0 0 0 0-2.78z"
        fill="#FFFFFF"
      />
      <path
        d="M17.18 10.07a1.99 1.99 0 0 0-2.82 0l-1.13 1.13a.8.8 0 0 1-1.13 0l-4.77-4.77a1.99 1.99 0 0 0-2.82 0 1.99 1.99 0 0 0 0 2.82l5.94 5.94c.78.78 2.05.78 2.83 0l2.26-2.26a1.99 1.99 0 0 0 0-2.86z"
        fill="#FFFFFF"
        opacity=".85"
      />
    </svg>
  );
}
