import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Clock, Info, X } from 'lucide-react';
import React, { useState } from 'react';

/**
 * One notice card for the whole platform.
 *
 * A glass card with a tinted icon tile that says what kind of notice it is (bought, sold, waiting,
 * done, info, warning, error), a short title, one line of detail and a thin countdown bar. It springs
 * in, slides out, pauses while the pointer is on it and can be swiped away. The card is drawn here;
 * the stack and the timing live in toaster.jsx.
 */

/** variant -> icon, tile tint, glow and countdown colour. "default" is a confirmation. */
export const TOAST_KINDS = {
	default: { Icon: Check, tile: 'bg-gain/15 text-gain ring-gain/25', glow: 'hsl(var(--gain))', bar: 'bg-gain' },
	success: { Icon: Check, tile: 'bg-gain/15 text-gain ring-gain/25', glow: 'hsl(var(--gain))', bar: 'bg-gain' },
	buy: { Icon: ArrowUpRight, tile: 'bg-gain/15 text-gain ring-gain/25', glow: 'hsl(var(--gain))', bar: 'bg-gain' },
	sell: { Icon: ArrowDownRight, tile: 'bg-loss/15 text-loss ring-loss/25', glow: 'hsl(var(--loss))', bar: 'bg-loss' },
	pending: { Icon: Clock, tile: 'bg-overlay-strong text-content ring-hairline', glow: 'hsl(var(--content-muted))', bar: 'bg-content-muted' },
	info: { Icon: Info, tile: 'bg-overlay-strong text-content ring-hairline', glow: 'hsl(var(--content-muted))', bar: 'bg-content-muted' },
	warning: { Icon: AlertTriangle, tile: 'bg-primary/15 text-primary ring-primary/25', glow: 'hsl(var(--primary))', bar: 'bg-primary' },
	destructive: { Icon: X, tile: 'bg-loss/15 text-loss ring-loss/25', glow: 'hsl(var(--loss))', bar: 'bg-loss' },
};

const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 };

/**
 * @param fromTop  the stack sits at the top of the screen (phones): enter from above
 * @param duration ms on screen; the countdown bar runs it down and calls onDismiss at the end
 */
export const ToastCard = React.forwardRef(
	({ title, description, action, variant, duration = 4000, fromTop = false, onDismiss, reduceMotion }, ref) => {
		const kind = TOAST_KINDS[variant] || TOAST_KINDS.default;
		const { Icon } = kind;
		const [paused, setPaused] = useState(false);
		const timed = Number.isFinite(duration) && duration > 0;
		const enterY = reduceMotion ? 0 : fromTop ? -28 : 28;

		return (
			<motion.li
				ref={ref}
				layout
				role={variant === 'destructive' ? 'alert' : 'status'}
				aria-live={variant === 'destructive' ? 'assertive' : 'polite'}
				initial={{ opacity: 0, y: enterY, scale: reduceMotion ? 1 : 0.94, filter: reduceMotion ? 'blur(0px)' : 'blur(8px)' }}
				animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
				exit={{ opacity: 0, x: reduceMotion ? 0 : 64, scale: reduceMotion ? 1 : 0.96, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
				transition={spring}
				drag="x"
				dragConstraints={{ left: 0, right: 0 }}
				dragElastic={{ left: 0.05, right: 0.6 }}
				onDragEnd={(_, info) => {
					if (info.offset.x > 90 || info.velocity.x > 600) onDismiss?.();
				}}
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
				className={cn(
					'group pointer-events-auto relative w-full cursor-grab touch-pan-y select-none overflow-hidden rounded-[18px] active:cursor-grabbing',
					'bg-surface-raised/80 backdrop-blur-2xl backdrop-saturate-150',
					'ring-1 ring-hairline shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_48px_-16px_rgba(0,0,0,0.55),0_4px_14px_-6px_rgba(0,0,0,0.35)]',
				)}
			>
				{/* soft glow of the notice's colour behind the icon */}
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-[0.16] blur-2xl"
					style={{ background: kind.glow }}
				/>

				<div className="relative flex items-center gap-3 py-3 pl-3 pr-10">
					<motion.span
						aria-hidden="true"
						initial={{ scale: reduceMotion ? 1 : 0.5, rotate: reduceMotion ? 0 : -12, opacity: 0 }}
						animate={{ scale: 1, rotate: 0, opacity: 1 }}
						transition={{ ...spring, delay: reduceMotion ? 0 : 0.06 }}
						className={cn('flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] ring-1', kind.tile)}
					>
						<Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
					</motion.span>

					<div className="min-w-0 flex-1">
						{title && (
							<p className="truncate text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-content">{title}</p>
						)}
						{description && (
							<p className="mt-[3px] text-[13px] leading-snug text-content-muted [font-variant-numeric:tabular-nums]">
								{description}
							</p>
						)}
					</div>

					{action}
				</div>

				<button
					type="button"
					onClick={onDismiss}
					aria-label="Close"
					className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-overlay text-content-muted opacity-0 transition-all duration-150 hover:bg-overlay-strong hover:text-content focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
				>
					<X className="h-3 w-3" strokeWidth={2.5} />
				</button>

				{/* countdown: runs the notice's time down, stops while the pointer is on it, closes it at the end */}
				{timed && (
					<span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-overlay">
						<span
							className={cn('block h-full origin-left opacity-70', kind.bar)}
							style={{
								animation: `toast-countdown ${duration}ms linear forwards`,
								animationPlayState: paused ? 'paused' : 'running',
							}}
							onAnimationEnd={onDismiss}
						/>
					</span>
				)}
			</motion.li>
		);
	},
);
ToastCard.displayName = 'ToastCard';
