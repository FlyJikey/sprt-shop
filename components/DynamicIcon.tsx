import * as Icons from 'lucide-react';
import Image from 'next/image';

interface DynamicIconProps {
  name?: string;       // Название иконки Lucide (например "Smartphone")
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
        />
      </div>
    );
  }

  // 2. Если имя иконки есть — ищем в Lucide
  if (name) {
    // Приводим к правильному регистру: 'fishing-hook' -> 'FishingHook'
    // Lucide экспортирует компоненты с большой буквы в формате PascalCase
    const PascalName = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

    // @ts-ignore
    const IconComponent = Icons[PascalName] || Icons[name];

    if (IconComponent) {
      return <IconComponent className={className} />;
    }
  }

  // 3. Заглушка, если ничего нет
  return <Icons.HelpCircle className={className} />;
}