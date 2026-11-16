import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';
import iframeRouteRestorationPlugin from './plugins/vite-plugin-iframe-route-restoration.js';

const isDev = process.env.NODE_ENV !== 'production';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;

/**
 * Content Security Policy for the built app.
 *
 * Injected at build time only. In development Vite serves inline scripts and
 * talks to an HMR websocket, both of which a policy this tight would block.
 *
 * script-src has no 'unsafe-inline': after the editor scripts below stopped
 * shipping, the production page runs no inline JavaScript at all. Styles do
 * need it — React and framer-motion write style attributes on every animated
 * element. frame-ancestors is absent because a <meta> policy cannot carry it;
 * it is served as a real header instead, see public/_headers.
 */
/**
 * The API origin the built site is allowed to talk to. Derived from the same
 * variable the app itself uses, minus the /api path — a CSP source is an
 * origin and silently matches nothing if a path is left on it.
 */
const API_ORIGIN = (() => {
	try {
		return new URL(process.env.VITE_API_BASE_URL || 'https://backend.hitomorrow.app/api').origin;
	} catch {
		return 'https://backend.hitomorrow.app';
	}
})();

const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"script-src 'self' https://s3.tradingview.com https://widgets.tradingview-widget.com https://accounts.google.com",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' data: https://fonts.gstatic.com",
	// The API host is listed explicitly: img-src allows https: wholesale, but
	// connect-src must not, or an injected script could exfiltrate anywhere.
	// wss://*.pusher.com is the price feed; without it every quote is blocked.
	`connect-src 'self' ${API_ORIGIN} wss://*.pusher.com https://*.pusher.com https://*.pusher.app https://accounts.google.com https://www.googleapis.com https://*.tradingview.com https://*.tradingview-widget.com`,
	`img-src 'self' data: blob: https:`,
	"frame-src 'self' https://*.tradingview.com https://*.tradingview-widget.com https://accounts.google.com",
	"base-uri 'self'",
	"form-action 'self'",
	"object-src 'none'",
].join('; ');

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		/**
		 * These four came with the project scaffold and used to be injected
		 * into production as well, which is a data leak rather than a
		 * debugging aid: each one posts to `window.parent` with a target
		 * origin of '*', so any page that frames the app receives them. The
		 * console hook forwards every console error, and the fetch patch
		 * reads the body of every failed request and console.errors it — so a
		 * failed CRM or auth response would have been handed to the embedder
		 * verbatim. They stay in development, where the parent frame is the
		 * editor, and no longer ship.
		 */
		const tags = isDev
			? [
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsRuntimeErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsViteErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: {type: 'module'},
				children: configHorizonsConsoleErrroHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configWindowFetchMonkeyPatch,
				injectTo: 'head',
			},
		]
			: [
			{
				tag: 'meta',
				attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
				injectTo: 'head-prepend',
			},
			{
				tag: 'meta',
				attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' },
				injectTo: 'head-prepend',
			},
		];

		if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
			tags.push(
				{
					tag: 'script',
					attrs: {
						src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
						'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
					},
					injectTo: 'head',
				}
			);
		}

		return {
			html,
			tags,
		};
	},
};

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig({
	customLogger: logger,
	plugins: [
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), iframeRouteRestorationPlugin()] : []),
		react(),
		addTransformIndexHtml
	],
	server: {
		/**
		 * The dev server is bound to the loopback interface and answers only
		 * to localhost. It was set to accept any origin and any Host header,
		 * which is what turns the known esbuild dev-server advisory into a
		 * real one: with `cors: true` any website the developer visits can
		 * read the project's source straight off this port, and
		 * `allowedHosts: true` removes the DNS-rebinding check that would
		 * otherwise stop it.
		 */
		host: 'localhost',
		cors: false,
		allowedHosts: ['localhost', '127.0.0.1'],
		/**
		 * In development the app calls /api on its own origin and this proxy
		 * forwards it, so the browser never makes a cross-origin request and
		 * CORS never enters the picture. In production the app talks to
		 * API_ORIGIN directly and this block does not exist.
		 *
		 * `secure: false` accepts the API's certificate without validating
		 * it. That is only tolerable because it is scoped to the dev server;
		 * it must never be carried into a deployed config.
		 */
		proxy: {
			'/api': {
				target: API_ORIGIN,
				changeOrigin: true,
				secure: false,
			},
		},
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			]
		}
	}
});
