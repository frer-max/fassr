import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

// Cache the entire initialization payload for 1 hour, or until revalidated
const getInitData = unstable_cache(
    async () => {
        const [categories, meals, settings] = await Promise.all([
            // Categories - only active and sorted
            prisma.category.findMany({
                where: { active: true },
                select: { id: true, name: true, icon: true, order: true },
                orderBy: { order: 'asc' }
            }),
            // Meals - only active and sorted, including sizes
            prisma.meal.findMany({
                where: { active: true },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    image: true,
                    price: true,
                    categoryId: true,
                    hasSizes: true,
                    sizes: {
                        select: { id: true, name: true, price: true }
                    }
                },
                orderBy: { order: 'asc' }
            }),
            // Settings - get the first (and usually only) one
            prisma.settings.findFirst()
        ]);

        return {
            categories,
            meals,
            settings: mapSettingsToFrontend(settings) || {
                restaurantName: 'Restaurant',
                phone: '',
                address: '',
                currency: 'دج',
                isOpen: true,
                delivery: { enabled: true, type: 'fixed', fixedCost: 200 }
            }
        };
    },
    ['init-data-cache'],
    { tags: ['categories', 'meals', 'settings'], revalidate: 3600 }
);

// Helper to Map DB -> Frontend (Must match /api/settings/route.js logic)
function mapSettingsToFrontend(dbSettings) {
    if (!dbSettings) return null;
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
        },
        telegramBotToken: dbSettings.telegramBotToken || '',
        telegramChatId: dbSettings.telegramChatId || ''
    };
}


export async function GET(request) {
    try {
        // We skip the DB health check here for maximum speed. 
        // If the cache exists, we serve it immediately.
        // If not, Prisma will throw on first query which we catch.
        
        const data = await getInitData();
        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/init error:", error);
        // Fallback in case of catastrophic DB failure
        return NextResponse.json({ 
            error: 'Failed to fetch initialization data',
            categories: [],
            meals: [],
            settings: {}
        }, { status: 500 });
    }
}
