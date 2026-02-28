import Header from '@/components/Header';
import AddressContactCard from '@/components/AddressContactCard';
import { MapPin, Phone, Clock, Mail, CheckCircle2, Package } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600;

export const metadata = {
  title: 'О нас | Магазин Спартак',
  description: 'Информация о магазине Спартак.',
};

export default async function AboutPage() {
  const { data: settings } = await supabase
    .from('about_page_settings')
    .select('*')
    .single();

  const title = settings?.title || 'Магазин <span class="text-[#9C2730]">Спартак</span>';
  const description = settings?.description || 'Легендарный формат «1000 мелочей».';
  const imageUrl = settings?.image_url;

  // Данные контактов (или заглушки, если еще не заполнили)
  const address = settings?.address || 'г. Ростов-на-Дону, ул. Примерная, 123';
  const phone = settings?.phone || '+7 (999) 000-00-00';
  const email = settings?.email || 'info@spartak.shop';
  const scheduleWeekdays = settings?.schedule_weekdays || 'Пн-Сб: 09:00 - 19:00';
  const scheduleSunday = settings?.schedule_sunday || 'Вс: 09:00 - 17:00';

  return (
    <main className="min-h-screen bg-white font-sans text-gray-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

        <div className="max-w-3xl mb-16">
          <h1
            className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p className="text-xl md:text-2xl text-gray-500 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
          <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
            <p>
              Мы работаем на рынке уже много лет, предлагая нашим клиентам огромный ассортимент товаров. Наша философия проста — <strong className="text-black">честные цены и наличие товара</strong> здесь и сейчас.
            </p>
            <p>
              В отличие от маркетплейсов, где нужно ждать доставку, у нас вы можете прийти, посмотреть, проверить товар вживую и сразу забрать его.
            </p>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureItem text="Более 20 000 товаров" />
              <FeatureItem text="Работаем без выходных" />
              <FeatureItem text="Гарантия качества" />
              <FeatureItem text="Профессиональная консультация" />
            </div>
          </div>

          <div className="relative h-[400px] bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Магазин Спартак"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-sm text-gray-300">
                  <Package size={40} />
                </div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Фото магазина</p>
                <p className="text-gray-300 text-xs mt-2">Загрузите фото в разделе Дизайн</p>
              </div>
            )}
          </div>
        </div>

        {/* Контакты (Динамические) */}
        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-100">
          <h2 className="text-2xl font-black uppercase tracking-wide mb-8">Контакты</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <AddressContactCard address={address} />

            {/* Карточка с двойным графиком */}
            <div className="group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 shadow-sm mb-4 text-gray-900 group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Режим работы</h3>
              <div className="font-bold text-lg text-gray-900 leading-tight">
                <div>{scheduleWeekdays}</div>
                <div className="text-[#9C2730]">{scheduleSunday}</div>
              </div>
            </div>

            <ContactCard
              icon={Phone}
              title="Телефон"
              text={phone}
              href={`tel:${phone}`}
            />
            <ContactCard
              icon={Mail}
              title="Почта"
              text={email}
              href={`mailto:${email}`}
            />
          </div>
        </div>

        {/* Юридическая информация (Добавлено) */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 mt-12 shadow-sm">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-6">Правовая информация</h2>
          <div className="flex flex-col sm:flex-row gap-6 text-sm font-bold text-gray-500">
            <Link href="/about/privacy" className="hover:text-black transition-colors underline-offset-4 hover:underline">
              Политика конфиденциальности
            </Link>
            <Link href="/about/terms" className="hover:text-black transition-colors underline-offset-4 hover:underline">
              Пользовательское соглашение
            </Link>
            <Link href="/about/returns" className="hover:text-black transition-colors underline-offset-4 hover:underline">
              Условия возврата
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}

// --- Вспомогательные компоненты ---

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-[#9C2730] flex-shrink-0" />
      <span className="text-sm font-bold text-gray-800">{text}</span>
    </div>
  );
}

function ContactCard({ icon: Icon, title, text, href }: { icon: any, title: string, text: string, href?: string }) {
  const Content = (
    <>
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 shadow-sm mb-4 text-gray-900 group-hover:scale-110 transition-transform">
        <Icon size={20} />
      </div>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</h3>
      <p className="font-bold text-lg text-gray-900">{text}</p>
    </>
  );

  if (href) {
    return (
      <a href={href} className="block group hover:opacity-70 transition-opacity">
        {Content}
      </a>
    );
  }

  return <div className="group">{Content}</div>;
}