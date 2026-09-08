import type { ServiceIconName } from './service-icons';

export interface SiteSettings {
  name: string;
  domain: string;
  tagline: string;
  email: string;
  registration: string;
  location: string;
  areacode: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ServiceIconName;
  color: string;
  category: 'personal' | 'tools';
  sort_order: number;
  enabled: boolean;
}

export interface Quote {
  id: number;
  text: string;
  author: string;
  sort_order: number;
  enabled: boolean;
}

export interface HomeContent {
  site: SiteSettings;
  services: Service[];
  quotes: Quote[];
}
