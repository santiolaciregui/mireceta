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
  // Dimension maps based on size and variant
  const iconHeightClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-11 w-11',
    xl: 'h-16 w-16',
  };

  const textHeightClasses = {
    sm: 'h-5',
    md: 'h-7',
    lg: 'h-9',
    xl: 'h-14',
  };

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/assets/logo-icon.svg"
          alt="Mi Receta Online Icon"
          className={`${iconHeightClasses[size]} object-contain drop-shadow-xs transition-all ${
            theme === 'dark' ? 'brightness-110 contrast-105' : ''
          }`}
        />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/assets/logo-text.svg"
          alt="Mi Receta Online - Tu Portal de Recetas Médicas"
          className={`${textHeightClasses[size]} object-contain drop-shadow-xs transition-all ${
            theme === 'dark' ? 'brightness-0 invert' : ''
          }`}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/assets/logo-icon.svg"
        alt="Mi Receta Online Icon"
        className={`${iconHeightClasses[size]} object-contain drop-shadow-xs transition-all ${
          theme === 'dark' ? 'brightness-110 contrast-105' : ''
        }`}
      />
      <img
        src="/assets/logo-text.svg"
        alt="Mi Receta Online"
        className={`${textHeightClasses[size]} object-contain drop-shadow-xs transition-all ${
          theme === 'dark' ? 'brightness-0 invert' : ''
        }`}
      />
    </div>
  );
}
