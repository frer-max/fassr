import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

const getMeals = unstable_cache(
    async () => {
        return await prisma.meal.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                categoryId: true,
                active: true,
                popular: true,
                order: true,
                hasSizes: true,
                sizes: {
                    select: { id: true, name: true, price: true }
                },
                category: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { order: 'asc' }
        });
    },
    ['meals-all-cache'],
    { tags: ['meals'] }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    const meals = await getMeals();
    
    if (categoryId) {
        const filtered = meals.filter(m => m.categoryId === parseInt(categoryId));
        return NextResponse.json(filtered);
    }
    
    return NextResponse.json(meals);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم الوجبة مطلوب' }, { status: 400 });
    }

    if (!body.categoryId) {
      return NextResponse.json({ error: 'القسم مطلوب' }, { status: 400 });
    }

    let meal; 

    // ID exists -> Update
    if (body.id) {
        // Handle sizes update (delete old, create new is simplest strategy for now)
        if (body.sizes !== undefined) {
            await prisma.mealSize.deleteMany({ where: { mealId: body.id }});
        }
        
        meal = await prisma.meal.update({
            where: { id: body.id },
            data: {
                name: body.name,
                description: body.description || '',
                image: body.image || null,
                price: parseFloat(body.price) || 0,
                categoryId: parseInt(body.categoryId),
                active: body.active !== undefined ? body.active : true,
                popular: body.popular || false,
                hasSizes: body.hasSizes || false,
                sizes: body.sizes && body.sizes.length > 0 ? {
                    create: body.sizes.map(s => ({
                        name: s.name,
                        price: parseFloat(s.price)
                    }))
                } : undefined
            },
            include: { sizes: true }
        });
    } else {
        // Create
        meal = await prisma.meal.create({
            data: {
                name: body.name,
                description: body.description || '',
                image: body.image || null,
                price: parseFloat(body.price) || 0,
                categoryId: parseInt(body.categoryId),
                active: body.active !== undefined ? body.active : true,
                popular: body.popular || false,
                hasSizes: body.hasSizes || false,
                order: body.order || 0,
                sizes: {
                    create: (body.sizes || []).map(s => ({
                        name: s.name,
                        price: parseFloat(s.price)
                    }))
                }
            },
            include: { sizes: true }
        });
    }
    
    revalidateTag('meals');
    return NextResponse.json(meal);
  } catch (error) {
    return NextResponse.json({ 
      error: 'فشل في حفظ الوجبة'
    }, { status: 500 });
  }
}


export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        await prisma.meal.delete({
            where: { id: parseInt(id) }
        });
        revalidateTag('meals');
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
