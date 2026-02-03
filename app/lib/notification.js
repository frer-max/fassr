import prisma from '@/app/lib/prisma';

export async function sendOrderNotification(order) {
    try {
        console.log("🔔 Preparing Telegram notification...");
        
        // 1. Get Settings
        const settings = await prisma.settings.findFirst();
        if (!settings || !settings.telegramBotToken || !settings.telegramChatId) {
            console.log("⚠️ Telegram notification skipped: Missing Bot Token or Chat ID in Settings.");
            return;
        }

        // 2. Format Message (Arabic Friendly)
        const itemsList = order.items.map(i => 
            `▫️ ${i.quantity}x ${i.mealName} ${i.size ? `(${i.size})` : ''}`
        ).join('\n');

        // Escape generic Markdown characters if needed, or just use plain text if complex.
        // MarkdownV2 is strict. 'Markdown' (legacy) is easier for basic bolding.
        const message = `
🚨 *طلب جديد وارد! (#${order.id})*

👤 *العميل:* ${order.customerName}
📱 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress || 'بدون عنوان'}

📝 *التفاصيل:*
${itemsList}

💰 *الإجمالي:* ${order.total} دج
        `.trim();

        // 3. Send to Telegram
        const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
        
        // Set a timeout to avoid hanging the Vercel function
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: settings.telegramChatId,
                text: message,
                parse_mode: 'Markdown'
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.text();
            console.error("❌ Telegram API Error:", err);
        } else {
            console.log("✅ Telegram notification sent successfully");
        }
    } catch (e) {
        console.error("❌ Failed to send notification:", e);
    }
}
