/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  className?: string;
}

export default function Logo({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className = '',
}: LogoProps) {
  const iconHeightClasses = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
    xl: 'h-14 w-14',
  };

  const titleSizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const subtitleSizeClasses = {
    sm: 'text-[7.5px]',
    md: 'text-[9.5px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const isDark = theme === 'dark';

  const renderText = () => (
    <div className="flex flex-col justify-center leading-none select-none">
      <div className={`font-black tracking-tight flex items-baseline ${titleSizeClasses[size]}`}>
        <span className={isDark ? 'text-white' : 'text-[#0141BC]'}>mireceta</span>
        <span className="text-[#1661E1]">.online</span>
      </div>
      <span
        className={`font-semibold tracking-tight mt-0.5 whitespace-nowrap ${subtitleSizeClasses[size]} ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        Tu portal de recetas médicas electrónicas
      </span>
    </div>
  );

  const renderIcon = () => (
    <img
      src="/assets/logo-icon.svg"
      alt="Mi Receta Online Icon"
      className={`${iconHeightClasses[size]} object-contain drop-shadow-xs transition-all shrink-0 ${
        isDark ? 'brightness-110 contrast-105' : ''
      }`}
    />
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        {renderIcon()}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        {renderText()}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {renderIcon()}
      {renderText()}
    </div>
  );
}

