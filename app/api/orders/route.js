import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        location: true,
        total: true,
        subtotal: true,
        deliveryCost: true,
        status: true,
        orderType: true,
        notes: true,
        rating: true,
        review: true,
        createdAt: true,
        items: {
            select: {
                quantity: true,
                mealName: true,
                price: true,
                size: true
            }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const cleanOrders = orders.map(o => ({
        id: o.id,
        orderNumber: o.id,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        address: o.customerAddress,
        location: o.location,
        total: o.total,
        subtotal: o.subtotal,
        deliveryCost: o.deliveryCost,
        status: o.status,
        orderType: o.orderType,
        notes: o.notes,
        rating: o.rating,
        review: o.review,
        createdAt: o.createdAt,
        items: o.items.map(i => ({
            quantity: i.quantity,
            name: i.mealName,
            price: i.price,
            sizeName: i.size
        }))
    }));

    return NextResponse.json(cleanOrders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const order = await prisma.order.create({
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress || body.address || '',
        location: body.location ? (typeof body.location === 'string' ? body.location : JSON.stringify(body.location)) : '',
        total: parseFloat(body.total) || 0,
        subtotal: parseFloat(body.subtotal) || 0,
        deliveryCost: parseFloat(body.deliveryCost) || 0,
        status: body.status || 'new',
        orderType: body.orderType || 'delivery',
        notes: body.notes || '',
        items: {
          create: body.items.map(item => ({
            mealId: parseInt(item.mealId || item.id),
            mealName: item.name || item.mealName || 'Unknown',
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            size: item.sizeName || item.size || ''
          }))
        }
      },
      include: { items: true } // We need items for return
    });
    
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to create order' 
    }, { status: 500 });
  }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, status, rating, review } = body;

        if (!id) return NextResponse.json({error: 'ID required'}, {status: 400});

        const data = {};
        if (status) data.status = status;
        if (rating !== undefined) data.rating = parseInt(rating);
        if (review !== undefined) data.review = review;
        
        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: data
        });
        
        return NextResponse.json(order);
    } catch (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({error: 'ID required'}, {status: 400});

    try {
        await prisma.order.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}

