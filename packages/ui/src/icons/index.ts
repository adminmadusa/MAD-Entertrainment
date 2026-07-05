/**
 * @mad/ui icon barrel
 *
 * This is the ONLY authorised entry point for icons in all applications.
 *
 * ✅ Correct:
 *   import { ArrowRight, Calendar } from '@mad/ui/icons';
 *   import { ArrowRight } from '@mad/ui'; // via root barrel
 *
 * ❌ Prohibited (future lint rule will enforce):
 *   import { ArrowRight } from 'lucide-react';
 *
 * Applications never depend on lucide-react directly. This abstraction
 * allows the icon library to be swapped without touching application code.
 *
 * Backward-compatible aliases preserve existing named exports:
 *   CalendarIcon (was hand-rolled SVG) → Calendar from lucide-react
 *   SearchIcon   (was hand-rolled SVG) → Search from lucide-react
 */

// Navigation
export {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// Actions
export {
  X,
  Check,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Copy,
  Download,
  Upload,
  Share2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

// Interface
export {
  Search,
  Filter,
  SlidersHorizontal,
  Menu,
  MoreVertical,
  MoreHorizontal,
  Eye,
  EyeOff,
  Settings,
  Bell,
  BellOff,
} from 'lucide-react';

// Status & Feedback
export {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Loader2,
} from 'lucide-react';

// Time & Date
export {
  Calendar,
  Clock,
  CalendarDays,
} from 'lucide-react';

// User & Auth
export {
  User,
  Users,
  UserCheck,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';

// Content
export {
  FileText,
  Image,
  Music,
  Video,
  MapPin,
  Globe,
  Link,
  Tag,
  Ticket,
  Star,
  Heart,
} from 'lucide-react';

// Business / MAD-specific domains
export {
  CreditCard,
  Receipt,
  Banknote,
  QrCode,
  Scan,
  BarChart2,
  TrendingUp,
  Package,
} from 'lucide-react';

// ─── Backward-compatible aliases ───────────────────────────────────────────────
// These preserve imports that existed before the icon library migration.
// Do not remove until Phase 2.5 adoption is complete and all consumers updated.

export { Calendar as CalendarIcon } from 'lucide-react';
export { Search as SearchIcon } from 'lucide-react';
