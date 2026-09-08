import {
  FaPaperclip, FaRss, FaCloud, FaCompactDisc, FaCompass, FaBookmark,
  FaFire, FaCode, FaImage, FaVideo, FaBookOpen, FaGamepad,
  FaScrewdriverWrench, FaGlobe, FaServer, FaHeart,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import type { ServiceIconName } from '@/lib/service-icons';

const icons: Record<ServiceIconName, IconType> = {
  link: FaPaperclip, blog: FaRss, cloud: FaCloud, music: FaCompactDisc,
  compass: FaCompass, bookmark: FaBookmark, fire: FaFire, code: FaCode,
  image: FaImage, video: FaVideo, book: FaBookOpen, game: FaGamepad,
  tools: FaScrewdriverWrench, globe: FaGlobe, server: FaServer, heart: FaHeart,
};

export default function ServiceIcon({ name }: { name: ServiceIconName }) {
  const Icon = Object.hasOwn(icons, name) ? icons[name] : FaPaperclip;
  return <Icon aria-hidden="true" data-service-icon={name} />;
}
