import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

const getCachedSettings = unstable_cache(
  async () => {
    return await prisma.settings.findFirst();
  },
  ['settings-cache'],
  { tags: ['settings'] }
);

export async function GET() {
  try {
    const settings = await getCachedSettings();
    if (!settings) {
        return NextResponse.json({});
    }
    return NextResponse.json(mapSettingsToFrontend(settings));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    
    const data = {
        restaurantName: body.restaurantName,
        phone: body.phone,
        address: body.address,
        isOpen: body.isOpen,
        adminPassword: body.adminPassword,
        minPreOrderHours: body.minPreOrderHours !== undefined ? parseInt(body.minPreOrderHours) : undefined,
        maxPreOrderHours: body.maxPreOrderHours !== undefined ? parseInt(body.maxPreOrderHours) : undefined,
        openTime: body.openTime,
        closeTime: body.closeTime,
        allowPreOrders: body.allowPreOrders,
        currency: body.currency,
        // Delivery mapping
        deliveryEnabled: body.delivery ? body.delivery.enabled : undefined,
        deliveryType: body.delivery ? body.delivery.type : undefined,
        deliveryFixedCost: body.delivery ? parseFloat(body.delivery.fixedCost || 0) : undefined,
        deliveryCostPerKm: body.delivery ? parseFloat(body.delivery.costPerKm || 0) : undefined,
        deliveryMaxDistance: body.delivery ? parseFloat(body.delivery.maxDistance || 0) : undefined,
        deliveryFreeAbove: body.delivery ? parseFloat(body.delivery.freeAbove || 0) : undefined,
    };

    // Remove undefined values to allow partial updates if needed, though usually settings is full update
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    const settings = await prisma.settings.upsert({
        where: { id: 1 },
        update: data,
        create: { id: 1, ...data }
    });
    
    // Invalidate cache
    revalidateTag('settings');
    
    return NextResponse.json(mapSettingsToFrontend(settings));
    
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

// Helper to Map DB -> Frontend
function mapSettingsToFrontend(dbSettings) {
    if (!dbSettings) return {};
    return {
        id: dbSettings.id,
        restaurantName: dbSettings.restaurantName,
        phone: dbSettings.phone,
        address: dbSettings.address,
        currency: dbSettings.currency,
        isOpen: dbSettings.isOpen,
        allowPreOrders: dbSettings.allowPreOrders,
        minPreOrderHours: dbSettings.minPreOrderHours,
        maxPreOrderHours: dbSettings.maxPreOrderHours,
        openTime: dbSettings.openTime,
        closeTime: dbSettings.closeTime,
        adminPassword: dbSettings.adminPassword, 
        delivery: {
            enabled: dbSettings.deliveryEnabled,
            type: dbSettings.deliveryType,
            fixedCost: dbSettings.deliveryFixedCost,
            costPerKm: dbSettings.deliveryCostPerKm,
            maxDistance: dbSettings.deliveryMaxDistance,
            freeAbove: dbSettings.deliveryFreeAbove
        }
    };
}

export async function POST(request) {
    return PUT(request);
}
