import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, ArrowLeft, Info } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import MonumentChat from './MonumentChat'; 

export default function AbuSimbelTour() {
  const [level, setLevel] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState("");
  const { govKey } = useParams();
  const navigate = useNavigate();

  const handleHotspotClick = (question) => {
    setActiveQuestion(question);
    setChatOpen(true);
  };

  const enterNextLevel = () => {
    if (level < 3) {
      setLevel(level + 1);
      setChatOpen(false);
    }
  };

  const goBack = () => {
    if (level > 1) {
      setLevel(level - 1);
      setChatOpen(false);
    } else {
      navigate(`/map/${govKey}`);
    }
  };

  // كومبوننت النقطة التفاعلية (بتعمل نبض شكلها شيك جداً)
  const Hotspot = ({ cx, cy, onClick, color = "amber" }) => {
    const isWhite = color === "white";
    const baseColor = isWhite ? "#ffffff" : "#f59e0b";
    return (
      <g onClick={onClick} className="cursor-pointer group">
        <circle cx={cx} cy={cy} r="25" fill={baseColor} className="animate-ping opacity-60" style={{ transformOrigin: `${cx}px ${cy}px` }} />
        <circle cx={cx} cy={cy} r="15" fill={baseColor} stroke="#ffffff" strokeWidth="3" className="group-hover:scale-125 transition-transform duration-300" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      </g>
    );
  };

  return (
    <div className="relative w-full h-screen bg-[#0e0b08] overflow-hidden flex font-sans text-white">
      
      {/* زرار الرجوع */}
      {!chatOpen && (
        <button 
          onClick={goBack}
          className="absolute top-6 left-6 z-40 flex items-center gap-2 px-4 py-2 bg-black/70 text-white rounded-full hover:bg-amber-600 transition-colors border border-amber-500/30 backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
          {level > 1 ? 'العودة للخلف' : 'الرجوع للخريطة'}
        </button>
      )}

      {/* الخريطة (هتاخد الشاشة كلها دايماً) */}
      <div className="w-full h-full">
        <TransformWrapper initialScale={1} minScale={1} maxScale={4} limitToBounds={true}>
          <TransformComponent wrapperClass="w-full h-full cursor-move" contentClass="w-full h-full">
            <svg viewBox="0 0 1920 1080" className="w-full h-full object-cover">
              
              {level === 1 && (
                <>
                  <image href="/images/abu_simbel_1_exterior.jpg" width="1920" height="1080" />
                  
                  {/* التمثال المكسور */}
                  <Hotspot cx="475" cy="500" onClick={() => handleHotspotClick("إيه قصة التمثال المكسور ده؟ وليه متصلحش؟")} />
                  
                  {/* التماثيل السليمة */}
                  <Hotspot cx="1350" cy="500" onClick={() => handleHotspotClick("ليه بنيت التماثيل العملاقة دي كلها لنفسك؟")} />

                  {/* الباب (نقطة بيضاء للدخول) */}
                  <Hotspot cx="925" cy="850" color="white" onClick={enterNextLevel} />
                </>
              )}

              {level === 2 && (
                <>
                  <image href="/images/abu_simbel_2_hall.jpg" width="1920" height="1080" />
                  
                  <Hotspot cx="525" cy="550" onClick={() => handleHotspotClick("ليه شكل التماثيل اللي جوه دي مختلف ومكتف إيده؟")} />
                  <Hotspot cx="250" cy="550" onClick={() => handleHotspotClick("احكيلي عن المعركة الطاحنة اللي مرسومة على الحيطة دي.")} />
                  
                  {/* الباب الداخلي */}
                  <Hotspot cx="955" cy="675" color="white" onClick={enterNextLevel} />
                </>
              )}

              {level === 3 && (
                <>
                  <image href="/images/abu_simbel_3_sanctuary.jpg" width="1920" height="1080" />
                  
                  <Hotspot cx="950" cy="625" onClick={() => handleHotspotClick("إيه السر ورا تعامد الشمس في الأوضة دي بالذات؟")} />
                  <Hotspot cx="1350" cy="500" onClick={() => handleHotspotClick("مين الآلهة اللي مرسومين معاك على الحيطة هنا؟")} />
                </>
              )}

            </svg>
          </TransformComponent>
        </TransformWrapper>
        
        {/* Helper Hint Text */}
        {!chatOpen && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center bg-black/70 px-6 py-3 rounded-full border border-amber-500/40 backdrop-blur-md pointer-events-none flex items-center gap-3 shadow-xl">
            <Info size={20} className="text-amber-400" />
            <p className="text-amber-50 text-sm md:text-base font-medium">
              {level === 1 && "اضغط على النقطة البيضاء للدخول، أو البرتقالية للسؤال"}
              {level === 2 && "استكشف جدران المعبد، واضغط للتقدم أو السؤال"}
              {level === 3 && "قدس الأقداس - اضغط على العلامات لمعرفة الأسرار"}
            </p>
          </div>
        )}
      </div>

      {/* الشات (هياخد الشاشة كاملة 100%) */}
      {chatOpen && (
        <div className="absolute inset-0 w-full h-full bg-[#0e0b08]/95 backdrop-blur-xl z-50 flex flex-col animate-fade-in">
          {/* هيدر الشات */}
          <div className="p-4 md:p-6 flex justify-between items-center border-b border-amber-900/50 bg-[#16120e] shadow-lg">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setChatOpen(false)} 
                className="p-2 bg-amber-600/20 rounded-full text-amber-500 hover:bg-amber-600 hover:text-white transition-colors"
                title="إغلاق الشات والعودة للمعبد"
              >
                <X size={24} />
              </button>
              <h2 className="text-amber-500 font-bold text-xl">حوار مع رمسيس الثاني</h2>
            </div>
            <span className="text-sand/50 text-sm hidden md:block">اضغط على علامة X للعودة للاستكشاف</span>
          </div>
          
          <div className="flex-1 w-full max-w-7xl mx-auto relative overflow-hidden">
             <div className="absolute inset-0">
               <MonumentChat 
                  overrideSlug="abu-simbel" 
                  initialContext={activeQuestion} 
                  isOverlay={true}
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
