import { Stethoscope, HeartPulse, Sparkles, Baby, Flower2, Bone, Eye, Ear, Brain, MessageCircleHeart, Droplets, Soup, Smile, Activity, Microscope, Pill, Syringe, Thermometer } from 'lucide-react';

export const SPECIALTY_ICONS = { Stethoscope, HeartPulse, Sparkles, Baby, Flower2, Bone, Eye, Ear, Brain, MessageCircleHeart, Droplets, Soup, Smile, Activity, Microscope, Pill, Syringe, Thermometer };

export function SpecialtyIcon({ name, ...props }) {
  const Icon = SPECIALTY_ICONS[name] || Stethoscope;
  return <Icon aria-hidden {...props} />;
}
