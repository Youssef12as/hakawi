import React, { useState, useCallback, useRef, useEffect, useMemo, Component } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Mic, Square, RotateCcw, Upload, Calendar, MessageCircle, ChevronLeft, Volume2, Clock, Sparkles, X, Loader2, Edit2, Check, Users } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import ConsentScreen from '../components/consent/ConsentScreen';
import CharacterStage from '../components/character/CharacterStage';
import CharacterCard from '../components/character/CharacterCard';
import ChatPanel from '../components/chat/ChatPanel';
import { useAppContext } from '../context/AppContext';
import { useChatApi } from '../hooks/useChatApi';
import { useCharacterState } from '../hooks/useCharacterState';
import { getAuthHeaders } from '../utils/apiAuth';

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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Sync with Backend
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch('/api/family-tree', {
          headers: await getAuthHeaders(),
        });
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
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
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

  // Chat State — same pattern as pages/map/MonumentChat
  const [chatHistory, setChatHistory] = useState([]);
  const [chatSessionId, setChatSessionId] = useState(null);
  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendTextMessage, sendAudioMessage, fetchTTS, fetchChatHistory, transcribeAudio, createSession, isLoading: chatLoading } = useChatApi();

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
        headers: await getAuthHeaders(),
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

  // ── Chat handlers — same pattern as pages/map/MonumentChat ──────────────
  const openChat = async (member) => {
    setSelectedMember(member);
    stopAudio();
    setView('chat');

    const histData = await fetchChatHistory({ familyMemberId: member.id });
    if (histData && histData.session_id && histData.messages?.length > 0) {
      setChatSessionId(histData.session_id);
      setChatHistory(histData.messages);
    } else {
      try {
        const created = await createSession({
          chat_mode: 'family_member',
          family_member_id: member.id,
          title: member.name,
        });
        setChatSessionId(created.session_id || uuidv4());
      } catch {
        setChatSessionId(uuidv4());
      }
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

  const familyMembers = useMemo(() => {
    const members = [];
    const visit = (node) => {
      node?.members?.forEach((member) => {
        if (!member.isAddNode) members.push(member);
      });
      node?.children?.forEach(visit);
    };
    visit(treeData);
    return members;
  }, [treeData]);

  const familyGenerations = useMemo(() => {
    const generations = [];
    const visit = (node, depth = 0) => {
      if (!node) return;
      if (!generations[depth]) generations[depth] = [];
      node.members?.forEach((member) => generations[depth].push(member));
      node.children?.forEach((child) => visit(child, depth + 1));
    };
    visit(treeData);
    return generations.filter((generation) => generation.length > 0);
  }, [treeData]);

  // ── Recursive Node Renderer ─────────────────────────────────────────
  const FamilyNode = ({ node }) => {
    return (
      <li>
        <div className="flex flex-col items-center">
          <div className="relative inline-flex items-start gap-8">
            {node.members.map((m, idx) => (
              <div key={m.id} className="relative flex w-28 flex-col items-center">
                {idx > 0 && (
                  <div className="absolute right-[calc(100%-0.1rem)] top-11 h-px w-8 bg-[#c4a06a]/70 shadow-[0_0_8px_rgba(196,160,106,0.35)]" aria-hidden="true" />
                )}

                {m.isAddNode ? (
                  <button
                    type="button"
                    aria-label={`إضافة ${m.role}`}
                    className="group relative z-10 flex min-h-11 w-28 flex-col items-center rounded-2xl px-2 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"
                    onClick={() => handleAddClick(m.role, m.id)}
                  >
                    <span className="mb-2 flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border border-dashed border-[#c4a06a]/55 bg-[#17130f]/90 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300 group-hover:scale-105 group-hover:border-[#e8bd72] group-hover:bg-[#c4a06a]/10">
                      <Plus className="h-6 w-6 text-[#d8ae68]" aria-hidden="true" />
                    </span>
                    <span className="text-[0.7rem] font-bold leading-5 text-[#bca782]">إضافة {m.role}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`عرض صفحة ${m.name}، ${m.role}`}
                    className="group relative z-10 flex min-h-11 w-28 flex-col items-center rounded-2xl px-1 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"
                    onClick={() => handleNodeClick(m)}
                  >
                    <span className={`relative mb-2 block h-[5.5rem] w-[5.5rem] rounded-full border bg-[#17130f] p-1 shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_35px_rgba(196,160,106,0.2)] ${m.isMe ? 'border-[#f1c778] ring-4 ring-[#c4a06a]/15' : 'border-[#c4a06a]/70'}`}>
                      <span className="block h-full w-full overflow-hidden rounded-full bg-[#211b15]">
                        {m.avatar ? (
                          <img src={m.avatar} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-3xl">{m.emoji || '👤'}</span>
                        )}
                      </span>
                      {m.status === 'preserved' && !m.isMe && (
                        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-[#c4a06a]/60 bg-[#15110d] shadow-lg">
                          <Sparkles className="h-2.5 w-2.5 text-[#e7bd75]" aria-hidden="true" />
                        </span>
                      )}
                      {m.status === 'processing' && (
                        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/60 bg-[#15110d] shadow-lg">
                          <Clock className="h-2.5 w-2.5 animate-pulse text-amber-300" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="mb-0.5 text-[0.68rem] font-semibold text-[#bca782]">{m.role}</span>
                    <span className={`max-w-full truncate font-bold leading-5 ${m.isMe ? 'text-base text-[#f2c978]' : 'text-sm text-[#f6e6c9]'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                      {m.name}
                    </span>
                  </button>
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
        <main className="relative min-h-[calc(100dvh-4rem)] overflow-x-hidden bg-[#0b0907] text-[#f3e3c5]" dir="rtl">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_18%,rgba(196,160,106,0.18),transparent_28%),radial-gradient(circle_at_82%_76%,rgba(112,63,25,0.18),transparent_32%)]" />

          <div className="relative z-10 flex min-h-[calc(100dvh-4rem)] flex-col lg:flex-row" dir="ltr">
            <aside className="order-1 border-b border-[#c4a06a]/15 bg-[#0a0807]/95 px-3 py-2 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-32 lg:shrink-0 lg:self-start lg:border-b-0 lg:border-r lg:px-3 lg:py-6" aria-label="أفراد العيلة" dir="rtl">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:h-[calc(100vh-10rem)] lg:flex-col lg:items-center lg:gap-4 lg:overflow-x-hidden lg:overflow-y-auto">
                {familyMembers.map((member) => {
                  const isActive = member.id === m.id;
                  return (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`group flex min-h-11 min-w-[4.65rem] flex-col items-center rounded-2xl px-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72] lg:w-full ${isActive ? 'bg-[#c4a06a]/12' : 'hover:bg-[#c4a06a]/7'}`}
                    >
                      <span className={`relative h-12 w-12 overflow-hidden rounded-full border-2 bg-[#1b1713] transition-transform group-hover:scale-105 ${isActive ? 'border-[#f1c778] shadow-[0_0_18px_rgba(196,160,106,0.35)]' : 'border-[#c4a06a]/35'}`}>
                        {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xl">{member.emoji || '👤'}</span>}
                      </span>
                      <span className={`mt-1 max-w-[4.5rem] truncate text-[0.68rem] font-bold ${isActive ? 'text-[#f2c978]' : 'text-[#bca782]'}`}>{member.name}</span>
                      <span className="max-w-[4.5rem] truncate text-[0.58rem] text-[#8f8068]">{member.role}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleAddClick()}
                  className="flex min-h-11 min-w-[4.65rem] flex-col items-center rounded-2xl px-1 py-1.5 text-[#bca782] transition-colors hover:bg-[#c4a06a]/8 hover:text-[#edc77e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72] lg:w-full"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[#c4a06a]/45"><Plus className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="mt-1 text-[0.65rem] font-bold">إضافة فرد</span>
                </button>
              </div>
            </aside>

            <section className="relative order-2 min-h-[calc(100dvh-10rem)] flex-1 bg-[#0b0907] lg:min-h-[calc(100dvh-4rem)]" dir="rtl">
              <div className="relative h-[52dvh] min-h-[22rem] overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:min-h-0 lg:w-[58%]">
                {m.avatar ? (
                  <img src={m.avatar} alt={`صورة ${m.name}`} className="h-full w-full object-cover object-[center_24%]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#18130f] text-[8rem]">{m.emoji || '👤'}</div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,4,0.03)_45%,#0b0907_100%)] lg:bg-[linear-gradient(90deg,#0b0907_0%,rgba(11,9,7,0.18)_32%,rgba(7,5,4,0.04)_100%),linear-gradient(180deg,rgba(7,5,4,0.06),rgba(7,5,4,0.35))]" />
              </div>

              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
                <button
                  type="button"
                  onClick={() => { setView('tree'); setSelectedMember(null); }}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-[#c4a06a]/35 bg-[#0b0907]/70 px-4 text-sm font-bold text-[#f0d6a8] backdrop-blur-md transition-colors hover:bg-[#c4a06a]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
                  شجرة العيلة
                </button>
                <span className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold backdrop-blur-md ${m.status === 'preserved' ? 'border-[#c4a06a]/35 bg-[#0b0907]/65 text-[#e8bd72]' : 'border-amber-400/30 bg-[#0b0907]/65 text-amber-300'}`}>
                  {m.status === 'preserved' ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <Clock className="h-4 w-4" aria-hidden="true" />}
                  {m.status === 'preserved' ? 'الصوت محفوظ' : 'الصوت بيتجهز'}
                </span>
              </div>

              <div className="relative z-10 -mt-12 w-full px-5 pb-10 sm:px-8 lg:mr-auto lg:mt-0 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:w-[48%] lg:flex-col lg:justify-center lg:px-12 lg:py-28 xl:px-16">
                <p className="mb-2 text-sm font-bold tracking-[0.12em] text-[#e4b96f]">{m.role}</p>
                <h1 className="font-amiri text-4xl font-bold leading-tight text-[#fff0d2] drop-shadow-lg sm:text-5xl xl:text-6xl">{m.name}</h1>
                <p className="mt-4 max-w-xl font-amiri text-xl leading-9 text-[#f2dfbd]/90 sm:text-2xl lg:text-xl xl:text-2xl">
                  صوت {m.name} وحكاياته محفوظين هنا، علشان يفضلوا قريبين من العيلة جيل بعد جيل.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
                  <div className="rounded-2xl border border-[#c4a06a]/18 bg-[#0b0907]/65 px-4 py-3 backdrop-blur-md">
                    <p className="text-2xl font-bold text-[#f5d69e]">{m.memories || 0}</p>
                    <p className="mt-0.5 text-xs text-[#bba888]">ذكرى محفوظة</p>
                  </div>
                  <div className="rounded-2xl border border-[#c4a06a]/18 bg-[#0b0907]/65 px-4 py-3 backdrop-blur-md">
                    <p className="text-2xl font-bold text-[#f5d69e]">{m.occasions?.length || 0}</p>
                    <p className="mt-0.5 text-xs text-[#bba888]">مناسبة عائلية</p>
                  </div>
                </div>

                {m.occasions?.length > 0 && (
                  <div className="mt-4 max-w-xl rounded-2xl border border-[#c4a06a]/15 bg-[#0b0907]/70 p-4 backdrop-blur-md">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#e9c47e]"><Calendar className="h-4 w-4" aria-hidden="true" /> من تقويم العيلة</div>
                    <div className="flex flex-wrap gap-2">
                      {m.occasions.map((occasion, index) => <span key={index} className="rounded-full bg-[#c4a06a]/10 px-3 py-1.5 text-xs text-[#ebd5b1]">{occasion}</span>)}
                    </div>
                  </div>
                )}

                {m.status === 'preserved' && (
                  <button
                    type="button"
                    onClick={() => openChat(m)}
                    className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#f0c778] px-6 py-3.5 text-base font-black text-[#21160b] shadow-[0_12px_35px_rgba(196,160,106,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#f6d493] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff0d2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0907] sm:w-auto sm:min-w-56"
                  >
                    <Mic className="h-5 w-5" aria-hidden="true" />
                    اتكلم مع {m.name}
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>
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
        <style>{`
        .tf-tree ul {
          padding-top: 46px;
          position: relative;
          display: flex;
          justify-content: center;
        }
        .tf-tree li {
          position: relative;
          padding: 46px 12px 0;
          text-align: center;
          list-style-type: none;
        }
        .tf-tree li::before, .tf-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          width: 50%;
          height: 46px;
          border-top: 1px solid rgba(214,174,105,0.62);
          box-shadow: 0 -1px 7px rgba(196,160,106,0.18);
        }
        .tf-tree li::before {
          left: 0;
          right: 50%;
        }
        .tf-tree li::after {
          left: 50%;
          right: 0;
          border-left: 1px solid rgba(214,174,105,0.62);
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
          border-right: 1px solid rgba(214,174,105,0.62);
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
          border-left: 1px solid rgba(214,174,105,0.62);
          width: 0;
          height: 46px;
        }
      `}</style>
        <main className="relative min-h-[calc(100dvh-4rem)] bg-[#0b0907] text-[#f2dfbd] lg:h-[calc(100dvh-4rem)] lg:min-h-[36rem] lg:overflow-hidden" dir="rtl">
          <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_50%_18%,rgba(160,103,39,0.18),transparent_32%),radial-gradient(circle_at_12%_70%,rgba(196,160,106,0.08),transparent_30%),linear-gradient(180deg,#0d0b08,#080706)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(115deg,transparent_0,transparent_42px,rgba(215,177,111,0.2)_43px,transparent_44px)]" />

          <header className="sticky top-0 z-30 border-b border-[#c4a06a]/12 bg-[#0b0907]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:absolute lg:inset-x-0" dir="rtl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="min-w-0">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(event) => setEditedTitle(event.target.value)}
                      className="min-w-0 max-w-56 border-b border-[#d9ae67] bg-transparent px-1 py-1 font-amiri text-xl font-bold text-[#fff0d2] outline-none sm:max-w-sm sm:text-2xl"
                      autoFocus
                    />
                    <button type="button" aria-label="حفظ اسم الشجرة" onClick={() => {
                      setIsEditingTitle(false);
                      updateTreeState({ ...treeData, title: editedTitle || 'شجرة العيلة' });
                    }} className="flex h-11 w-11 items-center justify-center rounded-full text-[#e9bd72] hover:bg-[#c4a06a]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"><Check className="h-5 w-5" /></button>
                    <button type="button" aria-label="إلغاء التعديل" onClick={() => setIsEditingTitle(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-[#bca782] hover:bg-[#c4a06a]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"><X className="h-5 w-5" /></button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#c4a06a]/25 bg-[#c4a06a]/8 text-[#e4b76d] sm:flex"><Users className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="truncate font-amiri text-xl font-bold text-[#fff0d2] sm:text-2xl">{treeData?.title || 'شجرة العيلة'}</h1>
                        <button type="button" aria-label="تعديل اسم الشجرة" onClick={() => { setEditedTitle(treeData?.title || 'شجرة العيلة'); setIsEditingTitle(true); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#9f8b6c] transition-colors hover:bg-[#c4a06a]/10 hover:text-[#dfb66f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"><Edit2 className="h-4 w-4" /></button>
                      </div>
                      <p className="hidden text-xs text-[#9f8b6c] sm:block">اضغط على أي صورة علشان تفتح حكاياتها</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleAddClick()}
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#e7bd74] px-4 text-sm font-black text-[#23180c] shadow-[0_8px_25px_rgba(196,160,106,0.2)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff0d2] sm:px-5"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">إضافة فرد</span>
                  <span className="sm:hidden">إضافة</span>
                </button>
              </div>
            </div>
          </header>

          <div className="relative z-10 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 lg:hidden" dir="rtl">
            <div className="mx-auto max-w-md">
              <div className="mb-7 rounded-3xl border border-[#c4a06a]/15 bg-[#15110d]/80 p-4 text-center shadow-[0_18px_45px_rgba(0,0,0,0.24)] backdrop-blur">
                <p className="font-amiri text-xl font-bold text-[#f7dfb5]">كل حكاية ليها مكان في العيلة</p>
                <p className="mt-1 text-sm leading-6 text-[#aa9676]">الأجيال مرتبة من الكبار للصغار—اختار أي شخص علشان تفتح حكايته.</p>
              </div>

              <div className="relative space-y-1 pb-4">
                <span className="pointer-events-none absolute bottom-12 right-1/2 top-8 w-px translate-x-1/2 bg-gradient-to-b from-transparent via-[#d5aa64]/45 to-transparent" aria-hidden="true" />
                {familyGenerations.map((generation, generationIndex) => (
                  <section key={generationIndex} className="relative pb-11">
                    <div className="relative z-10 mb-5 flex justify-center">
                      <h2 className="rounded-full border border-[#c4a06a]/25 bg-[#0b0907] px-4 py-1.5 text-xs font-bold text-[#d7b477] shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
                        {['الأجداد', 'الأبناء', 'الأحفاد', 'أبناء الأحفاد'][generationIndex] || `الجيل ${generationIndex + 1}`}
                      </h2>
                    </div>
                    <div className="relative z-10 flex flex-wrap justify-center gap-x-4 gap-y-6 rounded-[2rem] border border-[#c4a06a]/10 bg-[#100d0a]/72 px-3 py-5 shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-sm before:absolute before:-top-5 before:right-1/2 before:h-5 before:w-px before:translate-x-1/2 before:bg-[#d5aa64]/45">
                      {generation.map((member) => member.isAddNode ? (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => handleAddClick(member.role, member.id)}
                          className="flex min-h-28 w-28 flex-col items-center justify-center rounded-2xl text-[#b99f76] transition-colors active:bg-[#c4a06a]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"
                        >
                          <span className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border border-dashed border-[#c4a06a]/45 bg-[#0b0907] shadow-[0_10px_25px_rgba(0,0,0,0.32)]"><Plus className="h-5 w-5" aria-hidden="true" /></span>
                          <span className="mt-2 text-xs font-bold">إضافة {member.role}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => handleNodeClick(member)}
                          className="group flex min-h-28 w-28 flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition-colors active:bg-[#c4a06a]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bd72]"
                        >
                          <span className={`relative overflow-hidden rounded-full border-2 bg-[#211a13] p-0.5 shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition-transform duration-300 group-active:scale-95 ${member.isMe ? 'h-[5.75rem] w-[5.75rem] border-[#f0c777] ring-4 ring-[#c4a06a]/14' : 'h-[4.75rem] w-[4.75rem] border-[#c4a06a]/55'}`}>
                            {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-3xl">{member.emoji || '👤'}</span>}
                            {member.status === 'preserved' && <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-[#15110d] bg-[#e7bd74]" aria-hidden="true" />}
                          </span>
                          <span className="mt-2 text-[0.68rem] font-semibold text-[#b79c74]">{member.role}</span>
                          <span className="font-amiri text-lg font-bold text-[#f8e3bd]">{member.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden h-full overflow-auto overscroll-contain lg:block">
            <div className="flex min-h-full min-w-max items-start justify-center px-20 pb-24 pt-36" dir="ltr">
              {treeData ? (
                <div className="tf-tree animate-fade-in-up">
                  <ul><FamilyNode node={treeData} /></ul>
                </div>
              ) : (
                <div className="flex flex-col items-center text-[#c4a06a]" dir="rtl"><Loader2 className="mb-4 h-8 w-8 animate-spin" /> جاري تحميل شجرة العيلة...</div>
              )}
            </div>
          </div>
        </main>
      </PageShell>
    </ErrorBoundary>
  );
}
