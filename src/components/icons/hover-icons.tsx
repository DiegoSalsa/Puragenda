"use client";

import {
  useEffect,
  useRef,
  type ComponentType,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";

import type { AnimatedIconHandle, AnimatedIconProps } from "./itshover/types";
import HoverAlarmClockPlus from "./itshover/alarm-clock-plus-icon";
import HoverAlignCenter from "./itshover/align-center-icon";
import HoverArrowBigDown from "./itshover/arrow-big-down-icon";
import HoverArrowBigLeft from "./itshover/arrow-big-left-icon";
import HoverArrowBigRight from "./itshover/arrow-big-right-icon";
import HoverArrowBigUp from "./itshover/arrow-big-up-icon";
import HoverArrowNarrowDown from "./itshover/arrow-narrow-down-icon";
import HoverArrowNarrowLeft from "./itshover/arrow-narrow-left-icon";
import HoverArrowNarrowRight from "./itshover/arrow-narrow-right-icon";
import HoverArrowNarrowUp from "./itshover/arrow-narrow-up-icon";
import HoverAtSign from "./itshover/at-sign-icon";
import HoverBatteryCharging from "./itshover/battery-charging-icon";
import HoverBook from "./itshover/book-icon";
import HoverBrightnessDown from "./itshover/brightness-down-icon";
import HoverCamera from "./itshover/camera-icon";
import HoverChartBar from "./itshover/chart-bar-icon";
import HoverChartLine from "./itshover/chart-line-icon";
import HoverChecked from "./itshover/checked-icon";
import HoverClock from "./itshover/clock-icon";
import HoverCode from "./itshover/code-icon";
import HoverCoffee from "./itshover/coffee-icon";
import HoverCoin from "./itshover/coin-bitcoin-icon";
import HoverCopy from "./itshover/copy-icon";
import HoverCreditCard from "./itshover/credit-card";
import HoverCpu from "./itshover/cpu-icon";
import HoverCurrencyDollar from "./itshover/currency-dollar-icon";
import HoverDotsHorizontal from "./itshover/dots-horizontal-icon";
import HoverDotsVertical from "./itshover/dots-vertical-icon";
import HoverDoubleCheck from "./itshover/double-check-icon";
import HoverDownload from "./itshover/download-icon";
import HoverExternalLink from "./itshover/external-link-icon";
import HoverEye from "./itshover/eye-icon";
import HoverEyeOff from "./itshover/eye-off-icon";
import HoverFileDescription from "./itshover/file-description-icon";
import HoverFilledBell from "./itshover/filled-bell-icon";
import HoverFilter from "./itshover/filter-icon";
import HoverFlame from "./itshover/flame-icon";
import HoverGear from "./itshover/gear-icon";
import HoverGlobe from "./itshover/globe-icon";
import HoverHashtag from "./itshover/hashtag-icon";
import HoverHeart from "./itshover/heart-icon";
import HoverHistoryCircle from "./itshover/history-circle-icon";
import HoverHotel from "./itshover/hotel-icon";
import HoverInfoCircle from "./itshover/info-circle-icon";
import HoverInstagram from "./itshover/instagram-icon";
import HoverLayers from "./itshover/layers-icon";
import HoverLayoutDashboard from "./itshover/layout-dashboard-icon";
import HoverLayoutSidebar from "./itshover/layout-sidebar-right-icon";
import HoverLibrary from "./itshover/library-icon";
import HoverLink from "./itshover/link-icon";
import HoverLocate from "./itshover/locate-icon";
import HoverLock from "./itshover/lock-icon";
import HoverLogout from "./itshover/logout-icon";
import HoverMagnifier from "./itshover/magnifier-icon";
import HoverMail from "./itshover/mail-filled-icon";
import HoverMapPin from "./itshover/map-pin-icon";
import HoverMoon from "./itshover/moon-icon";
import HoverMousePointer from "./itshover/mouse-pointer-2-icon";
import HoverPaint from "./itshover/paint-icon";
import HoverPartyPopper from "./itshover/party-popper-icon";
import HoverPassport from "./itshover/passport-icon";
import HoverPen from "./itshover/pen-icon";
import HoverPlayer from "./itshover/player-icon";
import HoverPlugConnected from "./itshover/plug-connected-icon";
import HoverQrCode from "./itshover/qrcode-icon";
import HoverRefresh from "./itshover/refresh-icon";
import HoverRosetteDiscount from "./itshover/rosette-discount-icon";
import HoverRocket from "./itshover/rocket-icon";
import HoverSave from "./itshover/save-icon";
import HoverSend from "./itshover/send-icon";
import HoverShieldCheck from "./itshover/shield-check";
import HoverSimpleChecked from "./itshover/simple-checked-icon";
import HoverSlidersHorizontal from "./itshover/sliders-horizontal-icon";
import HoverSparkles from "./itshover/sparkles-icon";
import HoverStack from "./itshover/stack-3-icon";
import HoverStar from "./itshover/star-icon";
import HoverTarget from "./itshover/target-icon";
import HoverTelephone from "./itshover/telephone-icon";
import HoverToggle from "./itshover/toggle-icon";
import HoverTrash from "./itshover/trash-icon";
import HoverTravelBag from "./itshover/travel-bag";
import HoverTriangleAlert from "./itshover/triangle-alert-icon";
import HoverTrophy from "./itshover/trophy-icon";
import HoverUnlink from "./itshover/unlink-icon";
import HoverUpload from "./itshover/upload-icon";
import HoverUser from "./itshover/user-icon";
import HoverUserCheck from "./itshover/user-check-icon";
import HoverUserPlus from "./itshover/user-plus-icon";
import HoverUsers from "./itshover/users-icon";
import HoverUsersGroup from "./itshover/users-group-icon";
import HoverWallet from "./itshover/wallet-icon";
import HoverWhatsapp from "./itshover/whatsapp-icon";
import HoverX from "./itshover/x-icon";

/**
 * Compatibility layer that preserves the project's existing icon export names.
 * Every export below renders an animated component from It’s Hover on pointer hover.
 */
export type LucideProps = AnimatedIconProps & { absoluteStrokeWidth?: boolean };
export type LucideIcon = ComponentType<LucideProps>;

type HoverSource = ForwardRefExoticComponent<
  AnimatedIconProps & RefAttributes<AnimatedIconHandle>
>;

function hoverIcon(Icon: HoverSource): LucideIcon {
  return function HoverIcon(props) {
    const iconRef = useRef<AnimatedIconHandle>(null);
    const containerRef = useRef<HTMLSpanElement>(null);
    const stopTimerRef = useRef<number | null>(null);
    const lastStartRef = useRef(0);

    useEffect(() => {
      const container = containerRef.current;
      const interactiveParent = container?.closest<HTMLElement>(
        "button, a, [role='button']",
      );
      if (!interactiveParent) return;

      function startFromInteraction() {
        const now = performance.now();
        if (now - lastStartRef.current < 100) return;
        lastStartRef.current = now;

        iconRef.current?.startAnimation();
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current);
        }
        stopTimerRef.current = window.setTimeout(() => {
          iconRef.current?.stopAnimation();
          stopTimerRef.current = null;
        }, 700);
      }

      function stopAfterPointerLeaves() {
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        iconRef.current?.stopAnimation();
      }

      interactiveParent.addEventListener("pointerdown", startFromInteraction);
      interactiveParent.addEventListener("click", startFromInteraction);
      interactiveParent.addEventListener("mouseenter", startFromInteraction);
      interactiveParent.addEventListener("mouseleave", stopAfterPointerLeaves);
      interactiveParent.addEventListener("focusin", startFromInteraction);

      return () => {
        interactiveParent.removeEventListener("pointerdown", startFromInteraction);
        interactiveParent.removeEventListener("click", startFromInteraction);
        interactiveParent.removeEventListener("mouseenter", startFromInteraction);
        interactiveParent.removeEventListener("mouseleave", stopAfterPointerLeaves);
        interactiveParent.removeEventListener("focusin", startFromInteraction);
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current);
        }
      };
    }, []);

    function handleDirectPointerDown() {
      iconRef.current?.startAnimation();

      if (stopTimerRef.current !== null) {
        window.clearTimeout(stopTimerRef.current);
      }
      stopTimerRef.current = window.setTimeout(() => {
        iconRef.current?.stopAnimation();
        stopTimerRef.current = null;
      }, 700);
    }

    return (
      <span
        ref={containerRef}
        className="contents"
        onPointerDown={handleDirectPointerDown}
      >
        <Icon ref={iconRef} {...props} />
      </span>
    );
  };
}

export const Activity = hoverIcon(HoverChartLine);
export const AlertCircle = hoverIcon(HoverTriangleAlert);
export const AlertTriangle = hoverIcon(HoverTriangleAlert);
export const AlignCenter = hoverIcon(HoverAlignCenter);
export const AlignLeft = hoverIcon(HoverAlignCenter);
export const AlignRight = hoverIcon(HoverAlignCenter);
export const Archive = hoverIcon(HoverLibrary);
export const ArrowDown = hoverIcon(HoverArrowNarrowDown);
export const ArrowLeft = hoverIcon(HoverArrowNarrowLeft);
export const ArrowRight = hoverIcon(HoverArrowNarrowRight);
export const ArrowUp = hoverIcon(HoverArrowNarrowUp);
export const ArrowUpRight = hoverIcon(HoverExternalLink);
export const AtSign = hoverIcon(HoverAtSign);
export const Award = hoverIcon(HoverTrophy);
export const BadgePercent = hoverIcon(HoverRosetteDiscount);
export const Ban = hoverIcon(HoverX);
export const Banknote = hoverIcon(HoverWallet);
export const BarChart3 = hoverIcon(HoverChartBar);
export const Bell = hoverIcon(HoverFilledBell);
export const BookOpen = hoverIcon(HoverBook);
export const Briefcase = hoverIcon(HoverTravelBag);
export const Building2 = hoverIcon(HoverHotel);
export const Calendar = hoverIcon(HoverClock);
export const CalendarCheck = hoverIcon(HoverSimpleChecked);
export const CalendarCheck2 = hoverIcon(HoverSimpleChecked);
export const CalendarClock = hoverIcon(HoverAlarmClockPlus);
export const CalendarDays = hoverIcon(HoverClock);
export const CalendarOff = hoverIcon(HoverClock);
export const CalendarPlus = hoverIcon(HoverAlarmClockPlus);
export const CalendarRange = hoverIcon(HoverClock);
export const Check = hoverIcon(HoverChecked);
export const CheckCircle = hoverIcon(HoverSimpleChecked);
export const CheckCircle2 = hoverIcon(HoverSimpleChecked);
export const CheckIcon = hoverIcon(HoverChecked);
export const ChevronDown = hoverIcon(HoverArrowBigDown);
export const ChevronDownIcon = hoverIcon(HoverArrowBigDown);
export const ChevronLeft = hoverIcon(HoverArrowBigLeft);
export const ChevronRight = hoverIcon(HoverArrowBigRight);
export const ChevronUp = hoverIcon(HoverArrowBigUp);
export const ChevronUpIcon = hoverIcon(HoverArrowBigUp);
export const CircleHelp = hoverIcon(HoverInfoCircle);
export const Clipboard = hoverIcon(HoverFileDescription);
export const Clock = hoverIcon(HoverClock);
export const Clock3 = hoverIcon(HoverClock);
export const Code2 = hoverIcon(HoverCode);
export const Coffee = hoverIcon(HoverCoffee);
export const Coins = hoverIcon(HoverCoin);
export const Contact = hoverIcon(HoverUser);
export const Cookie = hoverIcon(HoverPartyPopper);
export const Copy = hoverIcon(HoverCopy);
export const CreditCard = hoverIcon(HoverCreditCard);
export const Crown = hoverIcon(HoverTrophy);
export const Database = hoverIcon(HoverCpu);
export const DollarSign = hoverIcon(HoverCurrencyDollar);
export const Download = hoverIcon(HoverDownload);
export const Edit2 = hoverIcon(HoverPen);
export const ExternalLink = hoverIcon(HoverExternalLink);
export const Eye = hoverIcon(HoverEye);
export const EyeOff = hoverIcon(HoverEyeOff);
export const FileText = hoverIcon(HoverFileDescription);
export const Filter = hoverIcon(HoverFilter);
export const Flame = hoverIcon(HoverFlame);
export const Gem = hoverIcon(HoverTarget);
export const Gift = hoverIcon(HoverPartyPopper);
export const Globe2 = hoverIcon(HoverGlobe);
export const GripVertical = hoverIcon(HoverDotsVertical);
export const Hash = hoverIcon(HoverHashtag);
export const Headset = hoverIcon(HoverTelephone);
export const History = hoverIcon(HoverHistoryCircle);
export const IdCard = hoverIcon(HoverPassport);
export const ImageIcon = hoverIcon(HoverCamera);
export const ImagePlus = hoverIcon(HoverCamera);
export const Info = hoverIcon(HoverInfoCircle);
export const Instagram = hoverIcon(HoverInstagram);
export const Key = hoverIcon(HoverLock);
export const KeyRound = hoverIcon(HoverLock);
export const Layers = hoverIcon(HoverLayers);
export const Layers3 = hoverIcon(HoverStack);
export const LayoutDashboard = hoverIcon(HoverLayoutDashboard);
export const LayoutTemplate = hoverIcon(HoverLayoutSidebar);
export const LineChart = hoverIcon(HoverChartLine);
export const Link = hoverIcon(HoverLink);
export const Link2 = hoverIcon(HoverLink);
export const Loader2 = hoverIcon(HoverRefresh);
export const LocateFixed = hoverIcon(HoverLocate);
export const Lock = hoverIcon(HoverLock);
export const LogIn = hoverIcon(HoverArrowNarrowRight);
export const LogOut = hoverIcon(HoverLogout);
export const Mail = hoverIcon(HoverMail);
export const Map = hoverIcon(HoverMapPin);
export const MapPin = hoverIcon(HoverMapPin);
export const Menu = hoverIcon(HoverDotsHorizontal);
export const Minus = hoverIcon(HoverX);
export const Monitor = hoverIcon(HoverCpu);
export const Moon = hoverIcon(HoverMoon);
export const MoreHorizontal = hoverIcon(HoverDotsHorizontal);
export const MousePointerClick = hoverIcon(HoverMousePointer);
export const Package = hoverIcon(HoverTravelBag);
export const PackageCheck = hoverIcon(HoverDoubleCheck);
export const Paintbrush = hoverIcon(HoverPaint);
export const Palette = hoverIcon(HoverPaint);
export const PanelLeftClose = hoverIcon(HoverLayoutSidebar);
export const PanelLeftOpen = hoverIcon(HoverLayoutSidebar);
export const Pause = hoverIcon(HoverPlayer);
export const PauseCircle = hoverIcon(HoverPlayer);
export const Pencil = hoverIcon(HoverPen);
export const Percent = hoverIcon(HoverRosetteDiscount);
export const Phone = hoverIcon(HoverTelephone);
export const Play = hoverIcon(HoverPlayer);
export const PlayCircle = hoverIcon(HoverPlayer);
export const Plus = hoverIcon(HoverAlarmClockPlus);
export const Power = hoverIcon(HoverPlugConnected);
export const QrCode = hoverIcon(HoverQrCode);
export const RefreshCw = hoverIcon(HoverRefresh);
export const Rocket = hoverIcon(HoverRocket);
export const Save = hoverIcon(HoverSave);
export const Scissors = hoverIcon(HoverPen);
export const Search = hoverIcon(HoverMagnifier);
export const SearchCheck = hoverIcon(HoverMagnifier);
export const Send = hoverIcon(HoverSend);
export const Settings = hoverIcon(HoverGear);
export const Settings2 = hoverIcon(HoverGear);
export const Share2 = hoverIcon(HoverSend);
export const Shield = hoverIcon(HoverShieldCheck);
export const ShieldAlert = hoverIcon(HoverShieldCheck);
export const ShieldCheck = hoverIcon(HoverShieldCheck);
export const SlidersHorizontal = hoverIcon(HoverSlidersHorizontal);
export const Sparkles = hoverIcon(HoverSparkles);
export const Stamp = hoverIcon(HoverRosetteDiscount);
export const Star = hoverIcon(HoverStar);
export const Stethoscope = hoverIcon(HoverHeart);
export const StickyNote = hoverIcon(HoverFileDescription);
export const Store = hoverIcon(HoverTravelBag);
export const Sun = hoverIcon(HoverBrightnessDown);
export const Tag = hoverIcon(HoverRosetteDiscount);
export const ToggleLeft = hoverIcon(HoverToggle);
export const ToggleRight = hoverIcon(HoverToggle);
export const Trash2 = hoverIcon(HoverTrash);
export const TrendingDown = hoverIcon(HoverChartLine);
export const TrendingUp = hoverIcon(HoverChartLine);
export const Trophy = hoverIcon(HoverTrophy);
export const Type = hoverIcon(HoverAtSign);
export const Unlink = hoverIcon(HoverUnlink);
export const Upload = hoverIcon(HoverUpload);
export const User = hoverIcon(HoverUser);
export const UserCheck = hoverIcon(HoverUserCheck);
export const UserPlus = hoverIcon(HoverUserPlus);
export const UserRound = hoverIcon(HoverUser);
export const Users = hoverIcon(HoverUsers);
export const Users2 = hoverIcon(HoverUsersGroup);
export const UsersRound = hoverIcon(HoverUsers);
export const UserX = hoverIcon(HoverUser);
export const WandSparkles = hoverIcon(HoverSparkles);
export const Wrench = hoverIcon(HoverGear);
export const Whatsapp = hoverIcon(HoverWhatsapp);
export const X = hoverIcon(HoverX);
export const XCircle = hoverIcon(HoverX);
export const XIcon = hoverIcon(HoverX);
export const Zap = hoverIcon(HoverBatteryCharging);
