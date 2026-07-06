import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === href : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 inline-block cursor-pointer ${
        isActive ? 'text-white bg-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'
      }`}>
        {children}
      </span>
    </Link>
  );
}
