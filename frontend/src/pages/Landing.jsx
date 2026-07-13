import { Link } from 'react-router-dom';
import { MapPin, Mic, Heart, ArrowLeft, Sparkles, MessageCircle, Users } from 'lucide-react';
import PageShell from '../components/layout/PageShell';

export default function Landing() {
  return (
    <PageShell className="!bg-sand">
      {/* ═══════════════════════════════════════════════════════════════════════
         HERO SECTION
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-espresso">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle cross pattern */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E8D1A7'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          {/* Gradient orbs */}
          <div className="absolute top-20 start-20 w-80 h-80 bg-wine/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 end-20 w-72 h-72 bg-sand/5 rounded-full blur-[90px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-wine/12 border border-wine/15 text-sand/70 text-xs font-semibold mb-8 animate-fade-in"
          >
            <Sparkles className="w-3.5 h-3.5 text-wine" />
            منصة حفظ التراث الشفوي بالذكاء الاصطناعي
          </div>

          {/* Title */}
          <h1
            className="text-7xl sm:text-8xl md:text-9xl font-extrabold text-sand mb-3 animate-fade-in"
            style={{ animationDelay: '0.15s' }}
          >
            حكاوي
          </h1>
          <p
            className="text-xl sm:text-2xl text-sand/45 font-light mb-2 animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            Hikawi
          </p>
          <p
            className="text-lg sm:text-xl text-sand/65 mb-12 max-w-md mx-auto leading-relaxed animate-fade-in"
            style={{ animationDelay: '0.45s' }}
          >
            صوت الماضي، حيّ في الحاضر
            <br />
            <span className="text-sand/35 text-base">The voice of the past, alive in the present</span>
          </p>

          {/* CTA */}
          <Link
            to="/map"
            className="group inline-flex items-center gap-3 bg-wine hover:bg-wine/90 text-sand px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-wine/25 animate-fade-in"
            style={{ animationDelay: '0.6s' }}
            id="hero-cta"
          >
            ابدأ الرحلة
            <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in"
            style={{ animationDelay: '1.2s' }}
          >
            <div className="w-6 h-10 border-2 border-sand/15 rounded-full flex justify-center pt-2">
              <div
                className="w-1.5 h-3 bg-sand/25 rounded-full"
                style={{ animation: 'scrollHint 2s ease-in-out infinite' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
         FOUR FEATURES
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-sand" id="features">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-espresso mb-3">
            مميزات المنصة
          </h2>
          <p className="text-olive text-center mb-16 max-w-lg mx-auto text-sm">
            أربعة محاور رئيسية لحفظ التراث الشفوي وإعادة إحيائه
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 stagger">
            {[
              {
                icon: Users,
                title: 'صوت شجرة العيلة',
                titleEn: 'Family Tree Voice',
                desc: 'خزنة ذكريات عائلية. نحفظ أصوات الأجداد ونبني نموذج شخصية يرسل لك رسائل صوتية في المناسبات ويتحدث معك بعد رحيلهم.',
              },
              {
                icon: MapPin,
                title: 'خريطة التراث',
                titleEn: 'Heritage Map',
                desc: 'خريطة تفاعلية لـ 27 محافظة. اضغط على أي مَعلَم ليظهر لك شخصية تراثية تروي حكايات المكان بلهجتها الأصلية.',
              },
              {
                icon: Sparkles,
                title: 'وضع اللغة الهيروغليفية',
                titleEn: 'Ancient Egyptian Mode',
                desc: 'زر تحويل في الخريطة يغير الراوي إلى شخصية فرعونية لتروي القصة باللغة المصرية القديمة المنطوقة مع ترجمة فورية.',
              },
              {
                icon: Heart,
                title: 'خصائص المحافظات',
                titleEn: 'Governorate Specials',
                desc: 'محتوى تفاعلي مخصص لكل محافظة يشمل الحرف اليدوية، الرقصات الشعبية، والأكلات التراثية المرتبطة بجذور المكان.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative bg-white/50 rounded-2xl p-6 md:p-8 text-center border border-brown/8 hover:border-wine/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl animate-fade-in-up flex flex-col"
              >
                <div className="w-16 h-16 bg-wine/8 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-wine/15 group-hover:scale-110 transition-all duration-500">
                  <item.icon className="w-7 h-7 text-wine" />
                </div>
                <h3 className="text-xl font-bold text-espresso mb-1">{item.title}</h3>
                <p className="text-[10px] text-olive/50 mb-3 font-semibold tracking-wider uppercase">
                  {item.titleEn}
                </p>
                <p className="text-olive text-sm leading-relaxed flex-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
         CHAT PREVIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-espresso/[0.04]" id="chat-preview">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-espresso mb-3">
              جرّب التجربة
            </h2>
            <p className="text-olive max-w-md mx-auto text-sm">
              تحدث مع شخصيات من التراث المصري واسمع حكاياتهم بأصواتهم الأصلية
            </p>
          </div>

          {/* Mock chat card */}
          <div className="max-w-lg mx-auto bg-espresso rounded-2xl overflow-hidden shadow-2xl border border-brown/15">
            {/* Header */}
            <div className="px-5 py-3 border-b border-sand/8 flex items-center gap-3">
              <div className="w-9 h-9 bg-wine/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-wine" />
              </div>
              <div>
                <p className="text-sand text-sm font-bold">عم عثمان — أسوان</p>
                <p className="text-sand/35 text-[11px] font-medium">ذكاء اصطناعي — ليس شخصًا حقيقيًا</p>
              </div>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-3">
              <div className="flex justify-start">
                <div className="bg-sand/12 text-sand rounded-2xl rounded-es-sm px-4 py-2.5 text-sm max-w-[82%]">
                  أهلاً يا ولدي! تعال احكيلك عن أسوان وتراثها النوبي العريق 🌅
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-wine text-sand rounded-2xl rounded-ee-sm px-4 py-2.5 text-sm max-w-[82%]">
                  احكيلي عن الأكل النوبي يا عم عثمان!
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-sand/12 text-sand rounded-2xl rounded-es-sm px-4 py-2.5 text-sm max-w-[82%] leading-relaxed">
                  يا سلام! الأكل النوبي له طعم تاني خالص. عندنا &quot;الفتة النوبي&quot;
                  و&quot;الكجيك&quot; و&quot;الملاح&quot; — كل أكلة وراها حكاية من
                  جداتنا...
                </div>
              </div>
            </div>

            {/* Fake input */}
            <div className="px-5 py-3 border-t border-sand/8">
              <div className="bg-sand/6 rounded-xl px-4 py-2.5">
                <span className="text-sand/20 text-sm">اكتب رسالتك...</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 text-wine font-bold text-sm hover:text-wine/80 transition-colors group"
              id="preview-cta"
            >
              جرّب المحادثة الكاملة
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="py-8 px-4 bg-espresso">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sand/35 text-sm">
            حكاوي — حفظ التراث الشفوي المصري بالذكاء الاصطناعي
          </p>
          <p className="text-sand/15 text-xs mt-1.5">
            Cairo University × AI Hackathon 2025
          </p>
        </div>
      </footer>
    </PageShell>
  );
}
