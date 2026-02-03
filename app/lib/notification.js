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

        // Order Type
        const typeMap = {
            'delivery': '🛵 توصيل منزلي',
            'pickup': '🥡 استلام من المطعم',
            'dine_in': '🍽️ تناول في المطعم'
        };
        const orderType = typeMap[order.orderType] || order.orderType || 'طلب';

        // Location Link (Google Maps)
        let locationLine = '';
        if (order.location) {
            try {
                const loc = typeof order.location === 'string' ? JSON.parse(order.location) : order.location;
                if (loc && (loc.latitude || loc.lat) && (loc.longitude || loc.lng)) {
                    const lat = loc.latitude || loc.lat;
                    const lng = loc.longitude || loc.lng;
                    // Note: Markdown format [text](url)
                    locationLine = `\n🗺️ *موقع العميل:* [فتح في خرائط جوجل](https://www.google.com/maps?q=${lat},${lng})`;
                }
            } catch(e) {}
        }

        // Delivery Cost Detail
        let deliveryInfo = '';
        if (order.orderType === 'delivery') {
            const cost = order.deliveryCost > 0 ? `${order.deliveryCost} دج` : 'مجاني / غير محدد';
            deliveryInfo = `🚚 *رسوم التوصيل:* ${cost}\n`;
        }

        const message = `
🚨 *طلب جديد وارد! (#${order.id})*
ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
📌 *نوع الطلب:* ${orderType}

👤 *العميل:* ${order.customerName}
📱 *الهاتف:* \`${order.customerPhone}\`
📍 *العنوان:* ${order.customerAddress || '---'}${locationLine}

📝 *محتويات الطلب:*
${itemsList}
ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
💵 *المجموع الفرعي:* ${order.subtotal} دج
${deliveryInfo}💰 *الإجمالي الكلي:* ${order.total} دج
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
