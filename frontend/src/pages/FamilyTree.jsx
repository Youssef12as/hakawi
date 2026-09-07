import React, { useState, useCallback, useRef, useEffect, Component } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Mic, Square, RotateCcw, Upload, Calendar, MessageCircle, ChevronLeft, Volume2, Clock, Sparkles, X, Loader2 } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import ConsentScreen from '../components/consent/ConsentScreen';
import CharacterStage from '../components/character/CharacterStage';
import CharacterCard from '../components/character/CharacterCard';
import ChatPanel from '../components/chat/ChatPanel';
import { useAppContext } from '../context/AppContext';
import { useChatApi } from '../hooks/useChatApi';
import { useCharacterState } from '../hooks/useCharacterState';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'black' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to convert WebM to WAV in browser so TTS server (librosa) can read it natively
async function convertWebMToWav(webmBlob) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioBuffer.length * numOfChan * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, audioBuffer.length * numOfChan * 2, true);

  const channels = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      let sample = Math.max(-1, Math.min(1, channels[channel][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export default function FamilyTree() {
  const { consentGiven, setConsentGiven } = useAppContext();
  const [view, setView] = useState('tree');
  const [selectedMember, setSelectedMember] = useState(null);

  // Tree Data State
  const [treeData, setTreeData] = useState(null);
  const [addingToNodeId, setAddingToNodeId] = useState(null);

  // Sync with Backend
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch('/api/family-tree');
        if (res.ok) {
          const data = await res.json();
          setTreeData(data);
        }
      } catch (err) {
        console.error("Failed to fetch family tree from backend", err);
      }
    };
    fetchTree();
  }, []);

  const updateTreeState = async (newTreeData) => {
    setTreeData(newTreeData);
    try {
      await fetch('/api/family-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTreeData)
      });
    } catch (err) {
      console.error("Failed to save family tree to backend", err);
    }
  };

  // Recording State (for Add Member flow)
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Form State
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [refText, setRefText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Chat State — original hooks identical to MapInteract
  const [chatHistory, setChatHistory] = useState([]);
  const [chatSessionId, setChatSessionId] = useState(null);
  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendTextMessage, sendAudioMessage, fetchTTS, fetchChatHistory, transcribeAudio, isLoading: chatLoading } = useChatApi();

  // Recording refs for Add Member
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const MAX_RECORD_SECONDS = 10;

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const wavBlob = await convertWebMToWav(webmBlob);
          setAudioBlob(wavBlob);
          setAudioUrl(URL.createObjectURL(wavBlob));
        } catch (err) {
          console.error("WAV conversion failed, falling back to original blob", err);
          setAudioBlob(webmBlob);
          setAudioUrl(URL.createObjectURL(webmBlob));
        }
        mediaStream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 10-second countdown timer with auto-stop
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          recorder.stop();
          setIsRecording(false);
          setRecordingTime(0);
        }
      }, 1000);
    } catch {
      alert('لم نتمكن من الوصول إلى الميكروفون');
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleRecording = () => (isRecording ? stopRecording() : startRecording());

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleAddMember = async () => {
    if (!newName.trim() || !refText.trim() || !audioBlob) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append('char_name', newName.trim());
      formData.append('ref_text', refText.trim());
      formData.append('audio_file', audioBlob, `${newName.trim().replace(/\s+/g, '_')}.mp3`);

      const res = await fetch('/api/characters/add', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `خطأ في السيرفر: ${res.status}`);
      }

      const data = await res.json();

      const newMember = {
        id: uuidv4(),
        name: newName.trim(),
        role: newRelation.trim() || 'فرد',
        characterName: data.character_name || newName.trim(),
        status: 'preserved',
        memories: 0,
        occasions: [],
        avatar: null,
      };

      // Recursive helper to insert the new member before the clicked add node
      const addMemberToTree = (node, targetId, newMem) => {
        const newMembers = [];
        let found = false;
        for (const m of node.members) {
          if (m.id === targetId) {
            newMembers.push(newMem);
            newMembers.push(m); // Keep the add node
            found = true;
          } else {
            newMembers.push(m);
          }
        }

        if (found) return { ...node, members: newMembers };

        if (node.children) {
          return {
            ...node,
            children: node.children.map(child => addMemberToTree(child, targetId, newMem))
          };
        }

        return node;
      };

      if (addingToNodeId) {
        const updatedTree = addMemberToTree(treeData, addingToNodeId, newMember);
        updateTreeState(updatedTree);
      } else {
        // Fallback: Add to root if no specific node was selected
        const updatedTree = { ...treeData, members: [...treeData.members, newMember] };
        updateTreeState(updatedTree);
      }

      // Reset form
      setNewName('');
      setNewRelation('');
      setRefText('');
      setAddingToNodeId(null);
      resetRecording();
      setView('tree');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedMember(node);
    if (node.status === 'new') {
      setNewName(node.name || '');
      setNewRelation(node.role || '');
      setRefText('');
      setSaveError(null);
      resetRecording();
      setView('add');
    } else {
      setView('detail');
    }
  };

  const handleAddClick = (relationHint = '', nodeId = null) => {
    setNewName('');
    setNewRelation(relationHint);
    setRefText('');
    setSaveError(null);
    setAddingToNodeId(nodeId);
    resetRecording();
    setView('add');
  };

  // ── Chat handlers — mirrored exactly from MapInteract ──────────────
  const openChat = async (member) => {
    setSelectedMember(member);
    stopAudio();
    setView('chat');

    const histData = await fetchChatHistory({ familyMemberId: member.id });
    if (histData && histData.session_id && histData.messages?.length > 0) {
      setChatSessionId(histData.session_id);
      setChatHistory(histData.messages);
    } else {
      setChatSessionId(uuidv4());
      setChatHistory([]);
    }
  };

  const handleChatSendText = useCallback(async (text) => {
    const m = selectedMember;
    setChatHistory(prev => [...prev, { sender: 'user', text, timestamp: Date.now() }]);

    try {
      const data = await sendTextMessage(text, chatSessionId, {
        member_id: m?.id,
        member_name: m?.name,
        persona: 'family_member',
        relation: m?.role,
      });
      setChatSessionId(data.session_id);

      const msgId = Date.now();
      setChatHistory(prev => [...prev, { id: msgId, sender: 'ai', text: data.response, timestamp: msgId }]);

      // TTS — use the member's own cloned voice, fallback to am-othman
      const voiceName = m?.characterName || m?.name || 'am-othman';
      const ttsBlob = await fetchTTS(data.response, voiceName);
      if (ttsBlob) {
        setChatHistory(prev => prev.map(msg => msg.id === msgId ? { ...msg, audioBlob: ttsBlob } : msg));
        await playResponseAudio(ttsBlob);
      }
    } catch {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.', timestamp: Date.now(), isError: true }]);
    }
  }, [selectedMember, chatSessionId, sendTextMessage, fetchTTS, playResponseAudio]);

  const handleChatSendAudio = useCallback(async (blob) => {
    const m = selectedMember;
    try {
      const data = await sendAudioMessage(blob, chatSessionId, {
        member_id: m?.id,
        member_name: m?.name,
        persona: 'family_member',
        relation: m?.role,
      });
      setChatSessionId(data.session_id);

      const msgId = Date.now();
      setChatHistory(prev => [
        ...prev,
        { sender: 'user', text: data.transcribed_text, timestamp: msgId - 1 },
        { id: msgId, sender: 'ai', text: data.response, timestamp: msgId },
      ]);

      // TTS — use the member's own cloned voice, fallback to am-othman
      const voiceName = m?.characterName || m?.name || 'am-othman';
      const ttsBlob = await fetchTTS(data.response, voiceName);
      if (ttsBlob) {
        setChatHistory(prev => prev.map(msg => msg.id === msgId ? { ...msg, audioBlob: ttsBlob } : msg));
        await playResponseAudio(ttsBlob);
      }
    } catch {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'عذرًا، لم نتمكن من فهم التسجيل. حاول مرة أخرى.', timestamp: Date.now(), isError: true }]);
    }
  }, [selectedMember, chatSessionId, sendAudioMessage, fetchTTS, playResponseAudio]);

  // ── Recursive Node Renderer ─────────────────────────────────────────
  const FamilyNode = ({ node }) => {
    return (
      <li>
        <div className="flex flex-col items-center">
          {/* Node Wrapper containing spouses/members */}
          <div className="relative inline-flex items-center gap-6">
            {node.members.map((m, idx) => (
              <div key={m.id} className="relative flex flex-col items-center">

                {/* Horizontal marriage line between members */}
                {idx > 0 && (
                  <div className="absolute top-[45px] right-[100%] w-6 h-[2px] bg-[#c4a06a] shadow-[0_0_5px_rgba(196,160,106,0.5)] -translate-y-1/2 z-0" />
                )}

                {/* Add Node or Person Card */}
                {m.isAddNode ? (
                  <div
                    className="w-32 flex flex-col items-center justify-center bg-gradient-to-br from-[#111010]/80 to-[#0b0a08]/80 backdrop-blur-md rounded-[20px] p-4 h-32 border border-dashed border-[#c4a06a]/40 hover:border-[#c4a06a] hover:bg-[#c4a06a]/5 transition-all duration-300 cursor-pointer z-10 group"
                    onClick={() => handleAddClick(m.role, m.id)}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1a1815] border border-[#c4a06a]/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(196,160,106,0.1)] group-hover:shadow-[0_0_20px_rgba(196,160,106,0.4)]">
                      <Plus className="w-6 h-6 text-[#c4a06a]" />
                    </div>
                    <p className="text-[#9d9167] text-[10px] font-bold text-center mt-1">إضافة<br />{m.role}</p>
                  </div>
                ) : (
                  <div
                    className={`w-32 flex flex-col items-center bg-gradient-to-br from-[#1a1815]/95 to-[#111010]/95 backdrop-blur-xl rounded-[20px] p-3 pb-4 shadow-xl z-10 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden ${m.isMe ? 'border-2 border-[#c4a06a] shadow-[0_0_20px_rgba(196,160,106,0.4)] hover:shadow-[0_0_30px_rgba(196,160,106,0.6)]' : 'border border-[#c4a06a]/30 hover:border-[#c4a06a]/60'}`}
                    onClick={() => handleNodeClick(m)}
                  >
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#c4a06a]/10 to-transparent pointer-events-none" />

                    <div className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner overflow-hidden ${m.isMe ? 'border-2 border-[#c4a06a]' : 'border-2 border-[#c4a06a]/50'}`}>
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="drop-shadow-md">{m.emoji}</span>
                      )}

                      {/* Status Badges */}
                      {m.status === 'preserved' && !m.isMe && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111010] border border-[#c4a06a]/50 flex items-center justify-center shadow-lg">
                          <Sparkles className="w-2.5 h-2.5 text-[#c4a06a]" />
                        </div>
                      )}
                      {m.status === 'processing' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111010] border border-yellow-500/50 flex items-center justify-center shadow-lg">
                          <Clock className="w-2.5 h-2.5 text-yellow-500 animate-pulse" />
                        </div>
                      )}
                    </div>

                    <p className="text-[#c4a06a] text-[9px] uppercase tracking-wider font-bold mb-1 z-10 leading-none h-3">{m.role}</p>
                    <p className={`font-bold z-10 leading-tight ${m.isMe ? 'text-[#c4a06a] text-lg' : 'text-[#f8ebd5] text-sm drop-shadow-md'}`} style={{ fontFamily: 'var(--font-heading)' }}>{m.name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Render Children Recursively */}
        {node.children && node.children.length > 0 && (
          <ul>
            {node.children.map(child => (
              <FamilyNode key={child.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  // ── Consent Gate ─────────────────────────────────────────────────
  if (!consentGiven) {
    return (
      <ErrorBoundary>
        <PageShell>
          <ConsentScreen isOpen={true} onConsent={() => setConsentGiven(true)} />
          <div className="flex items-center justify-center min-h-[60vh] bg-[#0b0a08]">
            <p className="text-[#c4a06a] text-lg" style={{ fontFamily: 'var(--font-heading)' }}>لازم توافق على الشروط الأول يا صديقي</p>
          </div>
        </PageShell>
      </ErrorBoundary>
    );
  }

  // ── Member Detail View ──────────────────────────────────────────
  if (view === 'detail' && selectedMember) {
    const m = selectedMember;
    return (
      <PageShell>
        <div className="min-h-screen bg-[#0b0a08] text-[#e8d1a7] py-12 px-4 relative overflow-hidden" dir="rtl">
          <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#1a1510] to-transparent opacity-80 pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#c4a06a] blur-[150px] opacity-[0.07] pointer-events-none rounded-full" />

          <div className="max-w-3xl mx-auto relative z-10 animate-fade-in-up">
            <button onClick={() => { setView('tree'); setSelectedMember(null); }} className="flex items-center gap-2 text-[#9d9167] hover:text-[#c4a06a] transition-colors mb-10 text-sm font-semibold tracking-wide">
              <ChevronLeft className="w-5 h-5 rotate-180" />
              ارجع لشجرة العيلة
            </button>

            {/* Hero Profile */}
            <div className="text-center mb-12">
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 bg-[#1a1815] rounded-full flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(196,160,106,0.15)] ring-2 ring-[#c4a06a] animate-float">
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">{m.emoji}</span>
                  )}
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-[#f8ebd5] mb-3 drop-shadow-md" style={{ fontFamily: 'var(--font-heading)' }}>{m.name}</h2>
              <p className="text-[#c4a06a]/80 text-lg tracking-wide">{m.role}</p>

              <div className="mt-6 inline-flex items-center justify-center">
                <span className={`flex items-center gap-2 text-sm px-4 py-1.5 rounded-full font-semibold border ${m.status === 'preserved' ? 'bg-[#c4a06a]/10 border-[#c4a06a]/30 text-[#c4a06a]' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                  }`}>
                  {m.status === 'preserved' ? <><Volume2 className="w-4 h-4" /> الصوت اتحفظ</> : <><Clock className="w-4 h-4" /> بيتعالج دلوقتي</>}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-[#111010]/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-[#c4a06a]/10 hover:border-[#c4a06a]/30 transition-all duration-300 shadow-lg">
                <p className="text-4xl font-bold text-[#f8ebd5] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{m.memories}</p>
                <p className="text-[#9d9167] text-sm uppercase tracking-widest font-semibold">ذكرى اتحفظت</p>
              </div>
              <div className="bg-[#111010]/80 backdrop-blur-xl rounded-2xl p-6 text-center border border-[#c4a06a]/10 hover:border-[#c4a06a]/30 transition-all duration-300 shadow-lg">
                <p className="text-4xl font-bold text-[#f8ebd5] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{m.occasions?.length || 0}</p>
                <p className="text-[#9d9167] text-sm uppercase tracking-widest font-semibold">مناسبة اتسجلت</p>
              </div>
            </div>

            {/* Occasions Timeline */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-[#f8ebd5] mb-6 flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
                <Calendar className="w-6 h-6 text-[#c4a06a]" />
                تقويم العيلة
              </h3>

              <div className="bg-[#111010]/60 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#c4a06a]/10">
                {!m.occasions || m.occasions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#9d9167] text-base">لسه محصلش أي مناسبة</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {m.occasions.map((occ, i) => (
                      <div key={i} className="group flex items-center gap-5 bg-[#1a1815]/80 hover:bg-[#c4a06a]/10 border border-[#c4a06a]/5 hover:border-[#c4a06a]/20 rounded-2xl px-6 py-4 transition-all duration-300">
                        <div className="w-12 h-12 rounded-full bg-[#0b0a08] border border-[#c4a06a]/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">✨</div>
                        <p className="text-[#e8d1a7] font-medium text-lg">{occ}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat CTA */}
            {m.status === 'preserved' && (
              <button
                onClick={() => openChat(m)}
                className="w-full relative overflow-hidden group rounded-full p-[1px] hover:scale-[1.02] transition-all duration-300"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#c4a06a] via-[#f8ebd5] to-[#c4a06a] opacity-70 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center gap-3 bg-[#111010] px-8 py-5 rounded-full group-hover:bg-[#1a1510] transition-all duration-300">
                  <MessageCircle className="w-6 h-6 text-[#c4a06a]" />
                  <span className="text-lg font-bold text-[#c4a06a]" style={{ fontFamily: 'var(--font-heading)' }}>
                    اتكلم مع {m.name}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Chat View — member avatar panel + original ChatPanel with voice ──
  if (view === 'chat' && selectedMember) {
    const m = selectedMember;
    return (
      <PageShell>
        <div
          className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative overflow-hidden"
          style={{ background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)' }}
        >
          {/* ── Member Avatar Panel (replaces CharacterStage) ── */}
          <div className="flex flex-col lg:w-[45%] border-b lg:border-b-0 lg:border-l border-[#c4a06a]/20">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4a06a]/20 flex-shrink-0 bg-[#050403]/80 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#c4a06a]/10 border border-[#c4a06a]/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#c4a06a]" />
                  <span className="text-[#c4a06a] text-xs font-bold tracking-wider">شجرة العيلة</span>
                </div>
                <span className="text-[#c4a06a]/60 text-sm font-medium">{m.role}</span>
              </div>
              <button
                onClick={() => { stopAudio(); setView('detail'); }}
                className="text-[#c4a06a]/50 hover:text-[#c4a06a] transition-colors p-2 hover:bg-[#c4a06a]/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar Hero */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 relative overflow-hidden">
              {/* Ambient glow behind avatar */}
              <div className={`absolute inset-0 transition-all duration-700 ${isSpeaking ? 'opacity-100' : 'opacity-40'}`}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#c4a06a] blur-[100px] opacity-20 rounded-full" />
              </div>

              {/* Avatar ring — pulses when speaking */}
              <div className={`relative mb-8 transition-all duration-500 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
                <div className={`absolute inset-0 rounded-full transition-all duration-700 ${isSpeaking
                    ? 'shadow-[0_0_60px_rgba(196,160,106,0.6)] ring-4 ring-[#c4a06a]/80 scale-110'
                    : 'shadow-[0_0_30px_rgba(196,160,106,0.2)] ring-2 ring-[#c4a06a]/30'
                  }`} />
                <div className="w-48 h-48 rounded-full overflow-hidden relative z-10">
                  {m.avatar
                    ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-[#1a1815] flex items-center justify-center text-7xl">{m.emoji || '👤'}</div>
                  }
                </div>
                {/* Speaking wave rings */}
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-[#c4a06a]/40 animate-ping" style={{ animationDuration: '1s' }} />
                    <div className="absolute inset-0 rounded-full border border-[#c4a06a]/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                  </>
                )}
              </div>

              <h2 className="text-3xl font-bold text-[#f8ebd5] mb-1 relative z-10" style={{ fontFamily: 'var(--font-heading)' }}>{m.name}</h2>
              <p className="text-[#c4a06a]/70 text-sm mb-6 relative z-10">{m.role}</p>

              {/* Status indicator */}
              <div className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold relative z-10 transition-all duration-500 border ${isSpeaking
                  ? 'bg-[#c4a06a]/20 border-[#c4a06a]/50 text-[#c4a06a]'
                  : 'bg-[#1a1815] border-[#c4a06a]/20 text-[#9d9167]'
                }`}>
                <span className={`w-2 h-2 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-[#c4a06a] animate-pulse' : 'bg-[#9d9167]'
                  }`} />
                {isSpeaking ? 'بيتكلم دلوقتي...' : 'استنى ردك...'}
              </div>

              {/* Suggested topics */}
              <div className="mt-8 w-full relative z-10">
                <p className="text-xs text-[#c4a06a]/50 uppercase tracking-widest mb-3 text-center">ابدأ بـ</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['حكايات زمان', 'ذكرياتك', 'نصيحة للناس'].map(topic => (
                    <button
                      key={topic}
                      onClick={() => handleChatSendText(`احكيلي عن ${topic}`)}
                      className="px-4 py-2 rounded-full border border-[#c4a06a]/20 text-[#c4a06a]/80 text-xs hover:bg-[#c4a06a]/10 transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Chat Side ── */}
          <div className="flex flex-col lg:w-[55%] min-h-0 bg-[#111010]">
            <ChatPanel
              chatHistory={chatHistory}
              onSendText={handleChatSendText}
              onSendAudio={handleChatSendAudio}
              onTranscribeAudio={transcribeAudio}
              isLoading={chatLoading}
              elderName={m.characterName || m.name}
            />
          </div>
        </div>
      </PageShell>
    );
  }


  if (view === 'add') {
    // Quick relations chips
    const commonRelations = ['أب', 'أم', 'أخ', 'أخت', 'زوج', 'زوجة', 'ابن', 'ابنة', 'جد', 'جدة', 'عم', 'عمة', 'خال', 'خالة'];

    return (
      <PageShell>
        <div className="min-h-screen bg-[#0b0a08] text-[#e8d1a7] py-12 px-4 relative overflow-hidden" dir="rtl">
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-[#c4a06a] blur-[150px] opacity-[0.05] pointer-events-none rounded-full" />

          <div className="max-w-2xl mx-auto relative z-10 animate-fade-in">
            <button onClick={() => setView('tree')} className="flex items-center gap-2 text-[#9d9167] hover:text-[#c4a06a] transition-colors mb-10 text-sm font-semibold">
              <ChevronLeft className="w-5 h-5 rotate-180" />
              إلغاء وارجع
            </button>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-[#f8ebd5] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>سجّل بصمة الصوت</h1>
              <p className="text-[#9d9167] text-lg max-w-lg mx-auto">خلّي صوت حبايبك يفضل حي، يحكي قصصهم للأجيال اللي جاية.</p>
            </div>

            <div className="bg-[#111010]/80 backdrop-blur-xl border border-[#c4a06a]/15 rounded-3xl p-6 md:p-10 shadow-2xl">
              <div className="space-y-8">
                {/* Inputs */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#c4a06a] tracking-wide">الاسم</label>
                    <input
                      type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      placeholder="اسمه إيه؟"
                      className="w-full px-5 py-4 rounded-xl bg-[#0b0a08] border border-[#c4a06a]/20 text-[#f8ebd5] focus:border-[#c4a06a] focus:ring-1 focus:ring-[#c4a06a] transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-[#c4a06a] tracking-wide">صلة القرابة</label>
                    <input
                      type="text" value={newRelation} onChange={(e) => setNewRelation(e.target.value)}
                      placeholder="مثلاً: أب، عم، زوجة..."
                      className="w-full px-5 py-4 rounded-xl bg-[#0b0a08] border border-[#c4a06a]/20 text-[#f8ebd5] focus:border-[#c4a06a] focus:ring-1 focus:ring-[#c4a06a] transition-all"
                    />
                    <div className="flex flex-wrap gap-2 pt-2">
                      {commonRelations.map(rel => (
                        <button
                          key={rel}
                          onClick={() => setNewRelation(rel)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${newRelation === rel ? 'bg-[#c4a06a] text-[#0b0a08]' : 'bg-[#1a1815] text-[#9d9167] hover:bg-[#c4a06a]/20 hover:text-[#c4a06a] border border-[#c4a06a]/10'}`}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reference Text */}
                <div className="pt-6 border-t border-[#c4a06a]/10">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#c4a06a] tracking-wide">النص المرجعي</label>
                    <p className="text-[#9d9167] text-xs mb-2">اكتب النص اللي هيتقال في التسجيل بالظبط</p>
                    <textarea
                      value={refText}
                      onChange={(e) => setRefText(e.target.value)}
                      placeholder="مثلاً: السلام عليكم، أنا فلان وده صوتي..."
                      rows={3}
                      className="w-full px-5 py-4 rounded-xl bg-[#0b0a08] border border-[#c4a06a]/20 text-[#f8ebd5] focus:border-[#c4a06a] focus:ring-1 focus:ring-[#c4a06a] transition-all resize-none"
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Voice Recording */}
                <div className="pt-6 border-t border-[#c4a06a]/10">
                  <label className="block text-center text-lg font-bold text-[#f8ebd5] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>سجّل الصوت دلوقتي</label>
                  <p className="text-center text-[#9d9167] text-sm mb-8">أقصى مدة ١٠ ثواني — اقرأ النص المرجعي اللي كتبته فوق</p>

                  <div className="flex flex-col items-center">
                    {/* Record button — disabled until ref text is typed */}
                    <button
                      onClick={toggleRecording}
                      disabled={!refText.trim() && !isRecording}
                      className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${!refText.trim() && !isRecording
                          ? 'bg-[#1a1815] text-[#9d9167]/40 border border-[#c4a06a]/10 cursor-not-allowed'
                          : isRecording
                            ? 'bg-red-500/10 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] border-2 border-red-500/50 animate-recording-pulse'
                            : 'bg-[#c4a06a]/10 text-[#c4a06a] border border-[#c4a06a]/30 hover:bg-[#c4a06a]/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(196,160,106,0.2)]'
                        }`}
                    >
                      {isRecording ? <Square className="w-10 h-10" fill="currentColor" /> : <Mic className="w-10 h-10" />}
                      {!isRecording && refText.trim() && <div className="absolute inset-0 rounded-full border border-[#c4a06a]/10 scale-125 pointer-events-none" />}
                    </button>

                    {/* Timer countdown */}
                    {isRecording && (
                      <div className="mt-4 text-2xl font-bold text-red-400 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                        {MAX_RECORD_SECONDS - recordingTime}s
                      </div>
                    )}

                    <p className={`mt-4 font-semibold tracking-wide transition-colors text-sm ${!refText.trim() && !isRecording ? 'text-[#9d9167]/50' : isRecording ? 'text-red-400' : 'text-[#c4a06a]'
                      }`}>
                      {!refText.trim() && !isRecording
                        ? 'اكتب النص المرجعي الأول ☝️'
                        : isRecording
                          ? 'بيتسجل... اضغط لما تخلص'
                          : 'اضغط وابدأ الكلام'
                      }
                    </p>

                    {isRecording && (
                      <div className="flex items-center gap-1.5 mt-4 h-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                          <div key={i} className="w-1.5 bg-red-400 rounded-full animate-soundwave-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {audioUrl && (
                    <div className="mt-8 bg-[#0b0a08] border border-[#c4a06a]/20 rounded-2xl p-5 flex flex-col items-center animate-scale-in">
                      <audio controls src={audioUrl} className="w-full max-w-md mb-4 h-10" />
                      <button onClick={resetRecording} className="text-sm text-[#9d9167] hover:text-red-400 font-semibold flex items-center gap-2 transition-colors">
                        <RotateCcw className="w-4 h-4" /> سجّل تاني
                      </button>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm text-center">
                    {saveError}
                  </div>
                )}

                <div className="pt-6">
                  <button
                    onClick={handleAddMember}
                    disabled={!newName.trim() || !refText.trim() || !audioBlob || isSaving}
                    className={`w-full flex items-center justify-center gap-3 py-5 rounded-xl font-bold text-lg transition-all duration-300 ${newName.trim() && refText.trim() && audioBlob && !isSaving
                        ? 'bg-[#c4a06a] text-[#0b0a08] hover:bg-[#d4b483] shadow-[0_4px_20px_rgba(196,160,106,0.3)] hover:-translate-y-1'
                        : 'bg-[#1a1815] text-[#9d9167] border border-[#c4a06a]/10 cursor-not-allowed'
                      }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isSaving ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> بيتحفظ...</>
                    ) : (
                      <><Upload className="w-5 h-5" /> تمام، احفظه</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── HORIZONTAL TOP-DOWN FAMILY TREE VIEW (ORG-CHART) ────────────────────────
  return (
    <ErrorBoundary>
      <PageShell>
        {/* 
        CRITICAL: We apply the CSS Tree rules here.
        Since we need absolute precision, we enforce LTR on the wrapper 
        so `left` and `right` CSS rules don't flip unpredictably. 
      */}
        <style>{`
        .tf-tree ul {
          padding-top: 40px;
          position: relative;
          display: flex;
          justify-content: center;
        }
        .tf-tree li {
          position: relative;
          padding: 40px 10px 0 10px;
          text-align: center;
          list-style-type: none;
        }
        .tf-tree li::before, .tf-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          width: 50%;
          height: 40px;
          border-top: 2px solid rgba(196,160,106,0.7);
          box-shadow: 0 -2px 5px rgba(196,160,106,0.2);
        }
        .tf-tree li::before {
          left: 0;
          right: 50%;
        }
        .tf-tree li::after {
          left: 50%;
          right: 0;
          border-left: 2px solid rgba(196,160,106,0.7);
        }
        .tf-tree li:only-child::after, .tf-tree li:only-child::before {
          display: none;
        }
        .tf-tree li:only-child {
          padding-top: 0;
        }
        .tf-tree li:first-child::before, .tf-tree li:last-child::after {
          border: 0 none;
        }
        .tf-tree li:last-child::before {
          border-right: 2px solid rgba(196,160,106,0.7);
          border-radius: 0 12px 0 0;
        }
        .tf-tree li:first-child::after {
          border-radius: 12px 0 0 0;
        }
        .tf-tree ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          border-left: 2px solid rgba(196,160,106,0.7);
          width: 0;
          height: 40px;
        }
      `}</style>

        <div className="min-h-screen bg-[#0b0a08] text-[#e8d1a7] py-16 px-4 relative overflow-x-auto" dir="ltr">
          {/* Huge Ambient Glows for maximum cinematic effect */}
          <div className="fixed top-[0%] left-[-20%] w-[80%] h-[80%] bg-[#c4a06a] blur-[250px] opacity-[0.05] pointer-events-none rounded-full mix-blend-screen" />
          <div className="fixed bottom-[-10%] right-[-20%] w-[70%] h-[70%] bg-[#8b4513] blur-[250px] opacity-[0.04] pointer-events-none rounded-full mix-blend-screen" />

          <div className="min-w-max mx-auto relative z-10 flex flex-col items-center pt-10 pb-32 px-10">

            {/* Header */}
            <div className="text-center mb-16 animate-fade-in-up relative w-full sticky left-0 right-0 max-w-4xl mx-auto" dir="rtl">
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f8ebd5] via-[#c4a06a] to-[#f8ebd5] mb-4 drop-shadow-[0_2px_10px_rgba(196,160,106,0.2)]" style={{ fontFamily: 'var(--font-heading)' }}>
                شجرة العيلة
              </h1>
              <p className="text-[#c4a06a]/90 text-sm md:text-base max-w-xl mx-auto leading-relaxed font-medium">
                صوّت حبايبك وذكرياتهم هتفضل حية، تحكي قصصهم لأجيال بعد أجيال.
              </p>
            </div>

            {/* ── THE CSS ORG CHART TREE ── */}
            <div className="tf-tree w-full animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <ul className="pt-[100px]"> {/* Extra padding top for the Great-grandparents overflowing above */}
                {treeData ? <FamilyNode node={treeData} /> : <div className="text-center w-full py-20 text-[#c4a06a]"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /> جاري تحميل شجرة العيلة...</div>}
              </ul>
            </div>

          </div>

          {/* Floating Add Member Button */}
          <button
            onClick={() => handleAddClick()}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-gradient-to-r from-[#c4a06a] to-[#d4b483] text-[#0b0a08] px-6 py-4 rounded-full shadow-[0_0_30px_rgba(196,160,106,0.3)] hover:scale-105 hover:shadow-[0_0_40px_rgba(196,160,106,0.5)] transition-all duration-300 font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Plus className="w-5 h-5" />
            ضيف فرد جديد
          </button>

        </div>
      </PageShell>
    </ErrorBoundary>
  );
}
