import dynamic from 'next/dynamic';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import Image from 'next/image';
import { HelpCircle } from 'lucide-react';
import { useMemo } from 'react';

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

  // 2. Динамический импорт иконки Lucide (без бандлинга всей библиотеки)
  const IconComponent = useMemo(() => {
    if (!name) return null;

    // Приводим к kebab-case (например, ShoppingCart -> shopping-cart)
    const normalizedName = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // Проверяем, существует ли такая иконка в словаре
    if (normalizedName in dynamicIconImports) {
      return dynamic(dynamicIconImports[normalizedName as keyof typeof dynamicIconImports], {
        loading: () => <div className={`animate-pulse bg-gray-200 rounded-md ${className || 'w-6 h-6'}`} />,
      });
    }
    return null;
  }, [name]);


  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // 3. Заглушка, если ничего нет или иконка не найдена
  return <HelpCircle className={className} />;
}