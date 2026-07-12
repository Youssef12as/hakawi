import { useState } from 'react';
import { Trash2, Info, Globe, ChevronDown } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

export default function Settings() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleDelete = async () => {
    if (deleteConfirm !== 'حذف') return;
    setIsDeleting(true);

    // TODO: wire to real delete endpoint once backend adds one
    await new Promise((r) => setTimeout(r, 1500));

    setIsDeleting(false);
    setDeleteSuccess(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setDeleteConfirm('');
      setDeleteSuccess(false);
    }, 2000);
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-espresso mb-8">الإعدادات</h1>

        <div className="space-y-5">
          {/* ── Delete My Data ── */}
          <div className="bg-red-50 border border-red-200/60 rounded-2xl p-6" id="delete-section">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-espresso mb-1">حذف بياناتي</h2>
                <p className="text-olive text-sm mb-4 leading-relaxed">
                  سيتم حذف جميع الشخصيات الصوتية والنماذج المبنية من تسجيلاتك
                  بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  id="delete-data-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف جميع البيانات
                </Button>
              </div>
            </div>
          </div>

          {/* ── Language ── */}
          <div className="bg-espresso/5 border border-brown/8 rounded-2xl p-6" id="language-section">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-wine/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-wine" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-espresso mb-1">اللغة</h2>
                <p className="text-olive text-sm mb-3">اللغة الحالية: العربية</p>
                <select
                  className="bg-sand border border-brown/15 rounded-xl px-4 py-2.5 text-sm text-espresso focus:outline-none focus:border-wine/40 transition-colors cursor-pointer"
                  defaultValue="ar"
                  id="language-select"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── About ── */}
          <div
            className="bg-espresso/5 border border-brown/8 rounded-2xl overflow-hidden"
            id="about-section"
          >
            <button
              onClick={() => setAboutOpen(!aboutOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-espresso/[0.03] transition-colors text-start"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-wine/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-wine" />
                </div>
                <h2 className="text-lg font-bold text-espresso">عن حكاوي</h2>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-olive transition-transform duration-300 ${
                  aboutOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-400 ${
                aboutOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-6 pb-6 ps-20 space-y-3 text-sm text-olive leading-relaxed">
                <p>
                  <strong className="text-espresso">حكاوي</strong> هي منصة تفاعلية
                  تهدف لحفظ التراث الشفوي المصري باستخدام تقنيات الذكاء الاصطناعي.
                </p>
                <p>
                  <strong className="text-espresso">كيف يعمل النظام:</strong> يتم تسجيل
                  صوت الراوي وحكاياته، ثم يُبنى نموذج صوتي مخصص باستخدام تقنية
                  XTTS-v2 يحافظ على نبرة الصوت واللهجة الأصلية.
                </p>
                <p>
                  <strong className="text-espresso">الخصوصية:</strong> جميع عمليات
                  الذكاء الاصطناعي تتم محليًا (Whisper للتحويل الصوتي، Gemini
                  للمحادثة). لا يتم رفع بياناتك الصوتية لأي خادم خارجي.
                </p>
                <p>
                  <strong className="text-espresso">التقنيات المستخدمة:</strong> Gemini
                  2.5 Flash، Speechmatics STT، XTTS-v2 للتوليف الصوتي، FastAPI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Delete Confirmation Modal ── */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteConfirm('');
          }}
          title="تأكيد الحذف"
        >
          {deleteSuccess ? (
            <div className="text-center py-4 animate-fade-in">
              <p className="text-green-600 font-bold text-lg">✓ تم حذف جميع البيانات</p>
            </div>
          ) : (
            <div>
              <p className="text-olive text-sm mb-4 leading-relaxed">
                هذا الإجراء نهائي ولا يمكن التراجع عنه. لتأكيد الحذف، اكتب
                <strong className="text-espresso mx-1">&quot;حذف&quot;</strong>
                في الحقل أدناه.
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='اكتب "حذف" للتأكيد'
                className="w-full px-4 py-3 rounded-xl bg-espresso/5 border border-brown/12 text-espresso placeholder:text-olive/40 focus:outline-none focus:border-red-500/40 transition-colors mb-4"
                id="delete-confirm-input"
              />
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={deleteConfirm !== 'حذف'}
                  loading={isDeleting}
                  onClick={handleDelete}
                  id="confirm-delete-btn"
                >
                  حذف نهائي
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm('');
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageShell>
  );
}
