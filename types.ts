
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface User {
  id: string; // Unique Control ID
  name: string;
  email: string;
  specialty?: string;
  checkedIn?: boolean;
}

export enum AppState {
  REGISTERING,
  CONFIRMED,
  SOLD_OUT,
  ADMIN_LOGIN,
  ADMIN_SCANNER
}

export interface EventDetails {
  date: string;
  time: string;
  location: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const EVENT_INFO: EventDetails = {
  date: "29 de abril, 2026",
  time: "15:00 hrs",
  location: "CETRI - LICON",
  address: "Av. Industria Eléctrica de México 11, Xocoyahualco, 54080 Tlalnepantla, Méx.",
  coordinates: { lat: 19.5274, lng: -99.2089 }
};

export interface RegistrationResponse {
  success: boolean;
  message: string;
  ticketUrl?: string; 
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  guestName?: string;
  alreadyCheckedIn?: boolean;
}
