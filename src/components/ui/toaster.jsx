import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastIcon,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider duration={4000}>
			{toasts.map(({ id, title, description, action, variant, dismiss, ...props }) => (
				<Toast key={id} variant={variant} onOpenChange={(open) => !open && dismiss?.()} {...props}>
					<ToastIcon variant={variant} />
					<div className="min-w-0 flex-1">
						{title && <ToastTitle>{title}</ToastTitle>}
						{description && <ToastDescription>{description}</ToastDescription>}
					</div>
					{action}
					<ToastClose />
				</Toast>
			))}
			<ToastViewport />
		</ToastProvider>
	);
}
