import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enDashboard from './locales/en/dashboard.json';
import enCampaign from './locales/en/campaign.json';
import enVehicle from './locales/en/vehicle.json';
import enTicket from './locales/en/ticket.json';
import enPayment from './locales/en/payment.json';
import enValidation from './locales/en/validation.json';
import enProfile from './locales/en/profile.json';

import amCommon from './locales/am/common.json';
import amAuth from './locales/am/auth.json';
import amNavigation from './locales/am/navigation.json';
import amDashboard from './locales/am/dashboard.json';
import amCampaign from './locales/am/campaign.json';
import amVehicle from './locales/am/vehicle.json';
import amTicket from './locales/am/ticket.json';
import amPayment from './locales/am/payment.json';
import amValidation from './locales/am/validation.json';
import amProfile from './locales/am/profile.json';

import omCommon from './locales/om/common.json';
import omAuth from './locales/om/auth.json';
import omNavigation from './locales/om/navigation.json';
import omDashboard from './locales/om/dashboard.json';
import omCampaign from './locales/om/campaign.json';
import omVehicle from './locales/om/vehicle.json';
import omTicket from './locales/om/ticket.json';
import omPayment from './locales/om/payment.json';
import omValidation from './locales/om/validation.json';
import omProfile from './locales/om/profile.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    dashboard: enDashboard,
    campaign: enCampaign,
    vehicle: enVehicle,
    ticket: enTicket,
    payment: enPayment,
    validation: enValidation,
    profile: enProfile,
  },
  am: {
    common: amCommon,
    auth: amAuth,
    navigation: amNavigation,
    dashboard: amDashboard,
    campaign: amCampaign,
    vehicle: amVehicle,
    ticket: amTicket,
    payment: amPayment,
    validation: amValidation,
    profile: amProfile,
  },
  om: {
    common: omCommon,
    auth: omAuth,
    navigation: omNavigation,
    dashboard: omDashboard,
    campaign: omCampaign,
    vehicle: omVehicle,
    ticket: omTicket,
    payment: omPayment,
    validation: omValidation,
    profile: omProfile,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'am', 'om'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
