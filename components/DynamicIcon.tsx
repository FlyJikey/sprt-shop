import Image from 'next/image';
import { useMemo } from 'react';
import { icons } from 'lucide-react';
import { HelpCircle } from 'lucide-react';

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

  // 2. Достаем иконку через объект `icons`, что не ломает компилятор так сильно, как `dynamicIconImports`
  const IconComponent = useMemo(() => {
    if (!name) return null;

    // Преобразуем kebab-case в PascalCase (shopping-cart -> ShoppingCart)
    const pascalName = name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    return (icons as any)[pascalName] || null;
  }, [name]);

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // 3. Заглушка, если ничего нет или иконка не найдена
  return <HelpCircle className={className} />;
}
