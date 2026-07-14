import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  AiNetworkIcon,
  AiUserIcon,
  Activity02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Comment01Icon,
  DashboardSquare01Icon,
  DatabaseIcon,
  DatabaseExportIcon,
  DatabaseImportIcon,
  Delete02Icon,
  Edit02Icon,
  EyeIcon,
  File01Icon as FileDocument01Icon,
  FullScreenIcon,
  GlobeIcon,
  HardDriveIcon,
  LayoutGridIcon,
  Link01Icon,
  LockIcon,
  Logout03Icon,
  Location01Icon,
  Mail01Icon,
  MoonIcon,
  MinimizeScreenIcon,
  MonitorDotIcon,
  Route02Icon,
  Search01Icon,
  ServerStack01Icon,
  ShieldUserIcon,
  SparklesIcon,
  Sun03Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

type IconProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

function makeIcon(icon: any) {
  return function Icon({ className, size = 20, strokeWidth = 1.8 }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        className={className}
        size={size}
        strokeWidth={strokeWidth}
      />
    );
  };
}

export const DashboardIcon = makeIcon(DashboardSquare01Icon);
export const WorkspaceIcon = makeIcon(LayoutGridIcon);
export const ServerIcon = makeIcon(ServerStack01Icon);
export const VmIcon = makeIcon(MonitorDotIcon);
export const DiskIcon = makeIcon(HardDriveIcon);
export const NetworkIcon = makeIcon(AiNetworkIcon);
export const GlobeNetworkIcon = makeIcon(GlobeIcon);
export const UsersIcon = makeIcon(UserGroupIcon);
export const EyeViewIcon = makeIcon(EyeIcon);
export const LogoutIcon = makeIcon(Logout03Icon);
export const ShieldIcon = makeIcon(ShieldUserIcon);
export const LockSecureIcon = makeIcon(LockIcon);
export const SparkIcon = makeIcon(SparklesIcon);
export const LayersIcon = makeIcon(LayoutGridIcon);
export const ArrowRightIcon = makeIcon(ArrowRight01Icon);
export const PlusIcon = makeIcon(Add01Icon);
export const EditIcon = makeIcon(Edit02Icon);
export const DeleteIcon = makeIcon(Delete02Icon);
export const RouteIcon = makeIcon(Route02Icon);
export const SearchIcon = makeIcon(Search01Icon);
export const SunIcon = makeIcon(Sun03Icon);
export const MoonThemeIcon = makeIcon(MoonIcon);
export const CloseIcon = makeIcon(Cancel01Icon);
export const ActivityIcon = makeIcon(Activity02Icon);
export const File01Icon = makeIcon(FileDocument01Icon);
export const UserSingleIcon = makeIcon(AiUserIcon);
export const DatabaseStackIcon = makeIcon(DatabaseIcon);
export const DatabaseExportDataIcon = makeIcon(DatabaseExportIcon);
export const DatabaseImportDataIcon = makeIcon(DatabaseImportIcon);
export const LinkIcon = makeIcon(Link01Icon);
export const LocationPinIcon = makeIcon(Location01Icon);
export const MailIcon = makeIcon(Mail01Icon);
export const CommentIcon = makeIcon(Comment01Icon);
export const FullscreenIcon = makeIcon(FullScreenIcon);
export const ExitFullscreenIcon = makeIcon(MinimizeScreenIcon);
