
import { NextResponse } from 'next/server';
import eventBus from '@/app/lib/eventBus';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Notify client of connection
    writer.write(encoder.encode('data: connected\n\n'));

    // Listener for order updates
    const onUpdate = () => {
        // We just send a simple "update" signal. The client will then fetch the latest data.
        // This keeps the SSE payload light and avoids complex data sync issues.
        const message = `data: update\n\n`;
        writer.write(encoder.encode(message)).catch(err => {
            console.error('Error writing to stream', err);
        });
    };

    // Registered listener
    eventBus.on('order-update', onUpdate);

    // Clean up when the connection closes
    request.signal.addEventListener('abort', () => {
        eventBus.off('order-update', onUpdate);
        writer.close().catch(() => {});
    });

    return new NextResponse(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
