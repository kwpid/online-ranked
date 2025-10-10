interface AdminBadgeProps {
  isAdmin: boolean;
  className?: string;
}

export function AdminBadge({ isAdmin, className = '' }: AdminBadgeProps) {
  if (!isAdmin) return null;

  return (
    <span 
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/50 ${className}`}
      data-testid="badge-admin"
    >
      ADMIN
    </span>
  );
}
