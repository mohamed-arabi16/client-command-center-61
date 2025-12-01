interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  const sizeMap = {
    sm: { container: 'h-8 w-8', icon: 24 },
    md: { container: 'h-12 w-12', icon: 32 },
    lg: { container: 'h-16 w-16', icon: 40 },
  };

  const { container, icon } = sizeMap[size];

  return (
    <div className={`${container} rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Mission Control Dashboard Icon */}
        <rect x="4" y="4" width="12" height="12" rx="2" fill="white" fillOpacity="0.9" />
        <rect x="4" y="20" width="12" height="12" rx="2" fill="white" fillOpacity="0.7" />
        <rect x="20" y="4" width="12" height="12" rx="2" fill="white" fillOpacity="0.7" />
        <rect x="20" y="20" width="12" height="12" rx="2" fill="white" fillOpacity="0.9" />
        
        {/* Connection nodes/lines for social aspect */}
        <circle cx="10" cy="10" r="2" fill="#E9F4F4" />
        <circle cx="26" cy="10" r="2" fill="#E9F4F4" />
        <circle cx="10" cy="26" r="2" fill="#E9F4F4" />
        <circle cx="26" cy="26" r="2" fill="#E9F4F4" />
        
        <line x1="10" y1="10" x2="26" y2="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="10" y1="10" x2="10" y2="26" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="26" y1="10" x2="26" y2="26" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="10" y1="26" x2="26" y2="26" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
      </svg>
    </div>
  );
};
