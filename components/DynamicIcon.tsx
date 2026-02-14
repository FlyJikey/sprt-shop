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
    // Приводим к правильному регистру: 'volleyball' -> 'Volleyball'
    // Lucide экспортирует компоненты с большой буквы
    const PascalName = name.charAt(0).toUpperCase() + name.slice(1);
    
    // @ts-ignore
    const IconComponent = Icons[PascalName] || Icons[name];

    if (IconComponent) {
      return <IconComponent className={className} />;
    }
  }

  // 3. Заглушка, если ничего нет
  return <Icons.HelpCircle className={className} />;
}