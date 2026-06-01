import Link from 'next/link';

export function LegalSupportCard() {
  return (
    <div className="bg-accent-purple/10 border border-accent-purple/20 p-5 rounded-2xl mt-6">
      <h4 className="text-white font-bold text-sm mb-2">Need Help?</h4>
      <p className="text-text-secondary text-xs mb-4">
        Can't find what you're looking for? Reach out to our support team.
      </p>
      <Link 
        href="/contact"
        className="text-accent-purple hover:text-accent-purple-light font-semibold text-xs flex items-center gap-1 group transition-colors"
      >
        Contact Support
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </Link>
    </div>
  );
}
