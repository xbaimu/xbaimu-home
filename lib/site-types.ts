import type { ServiceIconName } from './service-icons';

export interface SiteSettings {
  title: string;
  description: string;
  name: string;
  domain: string;
  tagline: string;
  email: string;
  registration: string;
  police_registration: string;
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

export interface WeatherSettings {
  apiHost: string;
  projectId: string;
  developerId: string;
  credentialId: string;
  privateKey?: string;
  hasPrivateKey?: boolean;
  clearPrivateKey?: boolean;
}

export interface AdminContent extends HomeContent {
  weather: WeatherSettings;
}

export type WeatherResult =
  | { status: 'unconfigured' | 'unavailable' }
  | { status: 'ok'; condition: string; temperature: string; humidity: string; fetchedAt: string };
