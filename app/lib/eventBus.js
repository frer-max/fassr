
// Singleton Event Emitter for Server-Sent Events
import { EventEmitter } from 'events';

// Use a global variable to preserve the instance across hot-reloads in dev
// Note: In serverless environments (like Vercel), this might not work perfectly for all cases,
// but for a persistent Node process (VPS/Local), it's the standard way.

if (!global.orderEventBus) {
    global.orderEventBus = new EventEmitter();
    global.orderEventBus.setMaxListeners(100); // Allow many clients (SSE connections)
}

const eventBus = global.orderEventBus;

export default eventBus;
