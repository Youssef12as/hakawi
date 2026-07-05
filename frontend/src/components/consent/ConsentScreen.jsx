import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { ShieldCheck } from 'lucide-react';

export default function ConsentScreen({ isOpen, onConsent }) {
  const [checked, setChecked] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} showClose={false}>
      <div className="text-center" id="consent-screen">
        <div className="w-16 h-16 bg-wine/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-8 h-8 text-wine" />
        </div>
        <h2 className="text-xl font-bold text-espresso mb-2">موافقة مسبقة</h2>
        <p className="text-olive text-sm mb-6 leading-relaxed">
          لحماية خصوصيتك، نحتاج موافقتك قبل بدء التسجيل
        </p>

        <label className="flex items-start gap-3 p-4 rounded-xl bg-espresso/5 border border-brown/10 cursor-pointer group hover:border-wine/30 transition-colors mb-6 text-start">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-wine flex-shrink-0"
            id="consent-checkbox"
          />
          <span className="text-sm text-espresso leading-relaxed">
            أوافق على أن هذا التسجيل سيتم تخزينه محليًا واستخدامه لبناء نموذج ذكاء اصطناعي صوتي.
            لن يتم رفع أي بيانات إلى خوادم خارجية.
          </span>
        </label>

        <Button
          variant="primary"
          size="lg"
          disabled={!checked}
          onClick={onConsent}
          className="w-full"
          id="consent-accept-btn"
        >
          موافق — ابدأ التسجيل
        </Button>
      </div>
    </Modal>
  );
}
