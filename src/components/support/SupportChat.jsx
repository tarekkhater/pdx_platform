import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Send, Headphones, Wallet, Clock, AlertTriangle,
  ShieldCheck, TrendingUp, Receipt, Lock, Sparkles,
} from 'lucide-react';
import { TOPICS, SUGGESTED, AGENT_TOPIC, TYPING_MS } from '@/data/supportTopics';
import { BRAND } from '@/config/brand';

const ICONS = {
  wallet: Wallet, clock: Clock, alert: AlertTriangle,
  shield: ShieldCheck, trending: TrendingUp, receipt: Receipt, lock: Lock,
};

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

let seq = 0;
const nextId = () => `m${++seq}`;

/**
 * In-app support, modelled on the Revolut/Binance pattern: an assistant greets
 * you, offers the questions people actually arrive with, and hands off to a
 * human the moment the script runs out.
 */
const SupportChat = ({ isOpen, onBack, accountName = '' }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [chips, setChips] = useState([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [withAgent, setWithAgent] = useState(false);
  const scroller = useRef(null);
  const timers = useRef([]);

  const push = (msg) => setMessages((prev) => [...prev, { id: nextId(), at: now(), ...msg }]);

  // Every timeout is tracked so closing mid-conversation cannot fire a reply
  // into an unmounted component.
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Fresh conversation each time it opens, like a support widget rather than
  // a messaging app with history.
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      return undefined;
    }
    setMessages([]);
    setChips([]);
    setTyping(true);
    setWithAgent(false);
    setDraft('');

    later(() => {
      setTyping(false);
      push({ from: 'bot', text: t('support.greeting', { name: accountName || t('support.there') }) });
      later(() => {
        push({ from: 'bot', text: t('support.prompt') });
        setChips(SUGGESTED);
      }, 350);
    }, TYPING_MS);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, chips]);

  const answerTopic = (id) => {
    if (id === AGENT_TOPIC) return connectAgent();

    const topic = TOPICS[id];
    if (!topic) return undefined;

    push({ from: 'user', text: t(`support.topics.${id}`) });
    setChips([]);
    setTyping(true);

    return later(() => {
      setTyping(false);
      topic.answer.forEach((_, i) =>
        push({ from: 'bot', text: t(`support.answers.${id}.${i}`) })
      );
      setChips(topic.followUps);
    }, TYPING_MS);
  };

  const connectAgent = () => {
    push({ from: 'user', text: t('support.topics.agent') });
    setChips([]);
    setTyping(true);
    later(() => {
      setTyping(false);
      push({ from: 'system', text: t('support.connecting') });
      later(() => {
        setTyping(true);
        later(() => {
          setTyping(false);
          setWithAgent(true);
          push({ from: 'agent', text: t('support.agentJoined', { brand: BRAND.name }) });
        }, TYPING_MS);
      }, 1200);
    }, TYPING_MS);
  };

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    push({ from: 'user', text });
    setDraft('');
    setChips([]);
    setTyping(true);

    later(() => {
      setTyping(false);
      if (withAgent) {
        push({ from: 'agent', text: t('support.agentAck') });
      } else {
        // The script has no match — say so plainly and offer the human,
        // rather than inventing an answer about someone's money.
        push({ from: 'bot', text: t('support.noMatch') });
        setChips([AGENT_TOPIC]);
      }
    }, TYPING_MS);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[76] bg-surface flex flex-col"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-hairline bg-surface/95 backdrop-blur flex-shrink-0">
            <button
              onClick={onBack}
              className="w-8 h-8 -ml-1 flex items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="relative flex-shrink-0">
              <span className="w-9 h-9 rounded-full bg-yellow-500/15 flex items-center justify-center">
                {withAgent ? (
                  <Headphones className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-content leading-tight truncate">
                {withAgent ? t('support.agentName') : t('support.assistantName')}
              </p>
              <p className="text-[11px] text-content-faint truncate">
                {withAgent ? t('support.agentStatus') : t('support.assistantStatus')}
              </p>
            </div>
          </div>

          <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-4 space-y-2">
            {messages.map((m) => {
              if (m.from === 'system') {
                return (
                  <motion.p
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[11.5px] text-content-faint py-1"
                  >
                    {m.text}
                  </motion.p>
                );
              }
              const mine = m.from === 'user';
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3 py-2 text-[13px] leading-relaxed ${
                      mine
                        ? 'bg-yellow-500 text-black rounded-2xl rounded-br-md'
                        : 'bg-surface-raised border border-hairline text-content rounded-2xl rounded-bl-md'
                    }`}
                  >
                    {m.text}
                    <span className={`block text-[10px] mt-1 ${mine ? 'text-black/50' : 'text-content-faint'}`}>
                      {m.at}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-surface-raised border border-hairline rounded-2xl rounded-bl-md px-3 py-2.5 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                      className="w-1.5 h-1.5 rounded-full bg-content-faint"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {chips.length > 0 && !typing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-1.5 pt-1"
              >
                {chips.map((id) => {
                  const Icon = id === AGENT_TOPIC ? Headphones : ICONS[TOPICS[id]?.icon] || Sparkles;
                  return (
                    <button
                      key={id}
                      onClick={() => answerTopic(id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                        id === AGENT_TOPIC
                          ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/15'
                          : 'border-hairline bg-surface-raised text-content-muted hover:text-content hover:bg-overlay'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {t(`support.topics.${id}`)}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </div>

          <form
            onSubmit={send}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-hairline bg-surface pb-[max(0.625rem,env(safe-area-inset-bottom))]"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('support.inputPlaceholder')}
              className="flex-1 min-w-0 h-10 px-3 rounded-full bg-surface-raised border border-hairline text-[13px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500 transition-colors"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.92 }}
              disabled={!draft.trim()}
              className="w-10 h-10 flex-shrink-0 rounded-full bg-yellow-500 disabled:opacity-40 text-black flex items-center justify-center transition-opacity"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SupportChat;
