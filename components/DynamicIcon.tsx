import Image from 'next/image';
import { useMemo } from 'react';
import { HelpCircle, Sparkles, Star, Zap, Shield, Smartphone, Laptop, Tv, Speaker, Headphones, Camera, Watch, Gamepad2, Mic, Music, Box, Grid } from 'lucide-react';

interface DynamicIconProps {
  name?: string;       // Название иконки Lucide (например "smartphone")
  imageUrl?: string;   // Ссылка на свою картинку
  className?: string;
}

export default function DynamicIcon({ name, imageUrl, className }: DynamicIconProps) {
  // 1. Если есть своя картинка — показываем её
  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={imageUrl}
          alt={name || 'icon'}
          fill
          className="object-contain"
          sizes="48px"
        />
      </div>
    );
  }

  // 2. Ограниченный маппинг популярных иконок, чтобы не вешать компилятор
  const IconMap: Record<string, any> = {
    'smartphone': Smartphone,
    'laptop': Laptop,
    'tv': Tv,
    'speaker': Speaker,
    'headphones': Headphones,
    'camera': Camera,
    'watch': Watch,
    'gamepad-2': Gamepad2,
    'mic': Mic,
    'music': Music,
    'box': Box,
    'grid': Grid,
    'sparkles': Sparkles,
    'star': Star,
    'zap': Zap,
    'shield': Shield
  };

  const IconComponent = useMemo(() => {
    if (!name) return null;
    return IconMap[name.toLowerCase()] || null;
  }, [name]);

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // 3. Заглушка, если ничего нет или иконка не найдена
  return <HelpCircle className={className} />;
}