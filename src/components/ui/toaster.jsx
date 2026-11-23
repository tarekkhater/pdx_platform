import { ToastCard } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import React from 'react';

const DEFAULT_DURATION = 4000;

/**
 * The notice stack: bottom right on desktop (newest at the bottom), top of the screen on phones
 * (newest on top). Up to three at once; the others glide into place when one comes or goes.
 */
export function Toaster() {
	const { toasts } = useToast();
	const isDesktop = useMediaQuery('(min-width: 640px)');
	const reduceMotion = useReducedMotion();
	const fromTop = !isDesktop;
	const ordered = fromTop ? toasts : [...toasts].reverse();

	return (
		<ol
			className={
				fromTop
					? 'pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col gap-2 p-3'
					: 'pointer-events-none fixed bottom-0 right-0 z-[100] flex w-[400px] max-w-full flex-col gap-2.5 p-5'
			}
		>
			<AnimatePresence initial={false} mode="popLayout">
				{ordered.map(({ id, title, description, action, variant, duration, dismiss }) => (
					<ToastCard
						key={id}
						title={title}
						description={description}
						action={action}
						variant={variant}
						duration={duration ?? DEFAULT_DURATION}
						fromTop={fromTop}
						reduceMotion={reduceMotion}
						onDismiss={dismiss}
					/>
				))}
			</AnimatePresence>
		</ol>
	);
}
