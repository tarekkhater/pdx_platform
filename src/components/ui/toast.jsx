import { cn } from '@/lib/utils';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { ArrowDownRight, ArrowUpRight, Check, Clock, Info, AlertTriangle, X } from 'lucide-react';
import React from 'react';

/**
 * One quiet card for every notice: a small tinted icon says what kind of notice it is (bought, sold,
 * waiting, done, warning, error), the title says what happened in a few words, and one line under it
 * carries the detail. No full-red cards, no emoji: the icon carries the meaning.
 */

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Viewport
		ref={ref}
		className={cn(
			'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-3 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col sm:p-4 md:max-w-[380px]',
			className,
		)}
		{...props}
	/>
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const TOAST_CLASS =
	'group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-hairline bg-surface-raised/95 py-3 pl-3 pr-9 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full data-[state=closed]:slide-out-to-right-full';

/** variant -> icon and its tint. "default" is a confirmation; "destructive" is kept for existing callers. */
const KINDS = {
	default: { Icon: Check, tone: 'bg-gain/15 text-gain' },
	success: { Icon: Check, tone: 'bg-gain/15 text-gain' },
	buy: { Icon: ArrowUpRight, tone: 'bg-gain/15 text-gain' },
	sell: { Icon: ArrowDownRight, tone: 'bg-loss/15 text-loss' },
	pending: { Icon: Clock, tone: 'bg-overlay text-content-muted' },
	info: { Icon: Info, tone: 'bg-overlay text-content-muted' },
	warning: { Icon: AlertTriangle, tone: 'bg-primary/15 text-primary' },
	destructive: { Icon: X, tone: 'bg-loss/15 text-loss' },
};

const ToastIcon = ({ variant }) => {
	const { Icon, tone } = KINDS[variant] || KINDS.default;
	return (
		<span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone)} aria-hidden="true">
			<Icon className="h-[17px] w-[17px]" strokeWidth={2.25} />
		</span>
	);
};

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => (
	<ToastPrimitives.Root ref={ref} className={cn(TOAST_CLASS, className)} {...props} />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Action
		ref={ref}
		className={cn(
			'inline-flex h-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-transparent px-3 text-xs font-medium text-content transition-colors hover:bg-overlay focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
			className,
		)}
		{...props}
	/>
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Close
		ref={ref}
		className={cn(
			'absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-content-faint opacity-0 transition-opacity hover:bg-overlay hover:text-content focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100',
			className,
		)}
		toast-close=""
		aria-label="Close"
		{...props}
	>
		<X className="h-3.5 w-3.5" />
	</ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Title
		ref={ref}
		className={cn('text-[14px] font-semibold leading-tight tracking-[-0.01em] text-content', className)}
		{...props}
	/>
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Description
		ref={ref}
		className={cn('mt-0.5 text-[13px] leading-snug text-content-muted [font-variant-numeric:tabular-nums]', className)}
		{...props}
	/>
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastIcon,
	ToastProvider,
	ToastTitle,
	ToastViewport,
};
