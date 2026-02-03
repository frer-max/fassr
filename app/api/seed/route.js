import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    // 1. Categories
    const categories = [];

    // 2. Meals
    const meals = [];

    const settings = {
        restaurantName: 'مطعمي',
        phone: '0555123456',
        address: 'الجزائر العاصمة',
        currency: 'دج',
        isOpen: true,
        allowPreOrders: true,
        minPreOrderHours: 1,
        maxPreOrderHours: 24,
        openTime: '10:00',
        closeTime: '23:00',
        deliveryEnabled: true,
        deliveryType: 'fixed',
        deliveryFixedCost: 200,
        deliveryFreeAbove: 2000,
        deliveryCostPerKm: 50,
        deliveryMaxDistance: 15,
        adminPassword: 'admin123'
    };

    // --- Execution ---
    
    // 1. Settings
    await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, ...settings }
    });

    // 2. Categories
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { id: cat.id },
            update: {}, // Don't overwrite if exists
            create: {
                id: cat.id,
                name: cat.name,
                icon: cat.icon,
                order: cat.order,
                active: cat.active
            }
        });
    }

    // 3. Meals
    for (const meal of meals) {
        const { sizes, ...mealData } = meal;
        
        // Upsert Meal
        await prisma.meal.upsert({
            where: { id: meal.id },
            update: {},
            create: {
                ...mealData,
                sizes: {
                    create: sizes.map(s => ({ name: s.name, price: s.price }))
                }
            }
        });
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully' });

  } catch (error) {
    console.error('Seed Error:', error);
    return NextResponse.json({ error: 'Failed to seed database', details: error.message }, { status: 500 });
  }
}
