import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { sendOrderNotification } from '@/app/lib/notification';
import eventBus from '@/app/lib/eventBus';

export const dynamic = 'force-dynamic';

function notifyClients() {
    eventBus.emit('order-update');
}

// Helper to normalize order for frontend

function normalizeOrder(order) {
    let location = order.location;
    if (typeof location === 'string' && (location.startsWith('{') || location.startsWith('['))) {
        try { location = JSON.parse(location); } catch (e) {
            console.error("Failed to parse location JSON:", e);
        }
    }

    // CRITICAL: Map 'pending' db status to 'new' for frontend admin panel
    const status = order.status === 'pending' ? 'new' : order.status;

    return {
        id: order.id,
        orderNumber: order.id, // Use ID as order number
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: order.customerAddress,
        location: location,
        total: order.total,
        subtotal: order.subtotal,
        deliveryCost: order.deliveryCost,
        status: status, 
        orderType: order.orderType,
        notes: order.notes,
        rating: order.rating,
        review: order.review,
        ratingSeen: order.ratingSeen,
        createdAt: order.createdAt,
        items: order.items.map(i => ({
            quantity: i.quantity,
            name: i.mealName,
            mealId: i.mealId,
            price: i.price,
            sizeName: i.size
        }))
    };
}

export async function GET(request) {
    console.log("GET /api/orders called");
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const phone = searchParams.get('phone');

        const search = searchParams.get('search');

        let whereClause = {};
        if (id) {
            whereClause.id = parseInt(id);
        } else if (phone) {
            whereClause.customerPhone = { contains: phone.trim() };
        } else if (search) {
            const query = search.trim();
            // Check if query is numeric (for ID or precise phone)
            const isNumeric = /^\d+$/.test(query);
            
            whereClause = {
                OR: [
                    { customerName: { contains: query, mode: 'insensitive' } },
                    { customerPhone: { contains: query } },
                    // If numeric, also allow searching by ID
                    ...(isNumeric ? [{ id: parseInt(query) }] : [])
                ]
            };
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const [orders, totalOrders] = await Promise.all([
            prisma.order.findMany({
                where: whereClause,
                include: { items: true },
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: limit
            }),
            prisma.order.count({ where: whereClause })
        ]);

        console.log(`Fetched ${orders.length} orders from DB (Page ${page})`);

        const cleanOrders = orders.map(normalizeOrder);
        return NextResponse.json({
            orders: cleanOrders,
            pagination: {
                total: totalOrders,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalOrders / limit)
            }
        });

    } catch (error) {
        console.error("GET /api/orders CRITICAL ERROR:", error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        console.log("POST /api/orders body:", JSON.stringify(body, null, 2));

        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ error: 'Order must have items' }, { status: 400 });
        }

        // Force 'new' status if not specified or properly mapped
        const initialStatus = body.status || 'new';

        const order = await prisma.order.create({
            data: {
                customerName: body.customerName || 'Guest',
                customerPhone: body.customerPhone,
                customerAddress: body.customerAddress || body.address || '',
                location: body.location ? (typeof body.location === 'string' ? body.location : JSON.stringify(body.location)) : '',
                total: parseFloat(body.total) || 0,
                subtotal: parseFloat(body.subtotal) || 0,
                deliveryCost: parseFloat(body.deliveryCost) || 0,
                status: initialStatus,
                orderType: body.orderType || 'delivery',
                notes: body.notes || '',
                items: {
                    create: body.items.map(item => ({
                        mealId: parseInt(item.mealId || item.id),
                        mealName: item.name || item.mealName || 'Unknown',
                        quantity: parseInt(item.quantity) || 1,
                        price: parseFloat(item.price) || 0,
                        size: item.sizeName || item.size || ''
                    }))
                }
            },
            include: { items: true }
        });

        // 🔔 Send Notification (Server-Side)
        // We await this so the function logic completes before response, ensuring reliable delivery
        // The utility has a generic timeout to prevent hanging.
        await sendOrderNotification(order);
        
        notifyClients(); // SSE Trigger

        return NextResponse.json(normalizeOrder(order));
    } catch (error) {
        console.error("POST /api/orders CRITICAL ERROR:", error);
        return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, status, rating, review, ratingSeen } = body;

        console.log(`PUT /api/orders updating ID ${id}`, body);

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const data = {};
        if (status) data.status = status;
        if (rating !== undefined) data.rating = parseInt(rating);
        if (review !== undefined) data.review = review;
        if (ratingSeen !== undefined) data.ratingSeen = ratingSeen;

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: data,
            include: { items: true }
        });

        notifyClients(); // SSE Trigger

        return NextResponse.json(normalizeOrder(order));
    } catch (error) {
        console.error("PUT /api/orders ERROR:", error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        console.log(`DELETE /api/orders ID ${id}`);

        await prisma.order.delete({ where: { id: parseInt(id) } });
        notifyClients(); // SSE Trigger
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/orders ERROR:", error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
