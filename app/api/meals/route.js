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
    
    // Safety check if database is reachable
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch(dbError) {
        console.error("Database connection check failed:", dbError);
        // Fallback to empty array if DB is down, to prevent 500 crash effectively
        return NextResponse.json([]); 
    }

    // If pagination params are present, bypass the 'all-meals' cache and query directly
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    if (page || limit || categoryId) {
        const pageNum = parseInt(page || '1');
        const limitNum = parseInt(limit || '50');
        const skip = (pageNum - 1) * limitNum;
        
        const where = {};
        if (categoryId) where.categoryId = parseInt(categoryId);
        if (!isNaN(parseInt(searchParams.get('active')))) where.active = searchParams.get('active') === 'true';

        const [meals, total] = await Promise.all([
             prisma.meal.findMany({
                where,
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
                    sizes: { select: { id: true, name: true, price: true } },
                    category: { select: { id: true, name: true } }
                },
                orderBy: { order: 'asc' },
                skip: page ? skip : undefined,
                take: limit ? limitNum : undefined
            }),
            prisma.meal.count({ where })
        ]);
        
        return NextResponse.json({
            meals,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }

    // Default behavior: Fetch ALL (cached) - Backward compatibility for initial load if needed, 
    // but we should encourage using pagination.
    const meals = await getMeals();
    return NextResponse.json(meals);
  } catch (error) {
    console.error("GET /api/meals error:", error);
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("POST /api/meals body:", JSON.stringify(body));
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم الوجبة مطلوب' }, { status: 400 });
    }

    const catId = parseInt(body.categoryId);
    if (!body.categoryId || isNaN(catId)) {
      return NextResponse.json({ error: 'القسم مطلوب' }, { status: 400 });
    }

    const price = parseFloat(body.price);
    const safePrice = isNaN(price) ? 0 : price;

    let meal; 

    // Prepare sizes safely
    const prepareSizes = (sizes) => {
        if (!sizes || !Array.isArray(sizes)) return [];
        return sizes.map(s => {
            const p = parseFloat(s.price);
            return {
                name: s.name || 'size',
                price: isNaN(p) ? 0 : p
            };
        });
    };

    // ID exists -> Update
    if (body.id) {
        const id = parseInt(body.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // Handle sizes update (delete old, create new is simplest strategy for now)
        if (body.sizes !== undefined) {
             // Transaction would be better but simple sequential for now
            await prisma.mealSize.deleteMany({ where: { mealId: id }});
        }
        
        // Fetch existing meal to check for old image cleanup
        const existingMeal = await prisma.meal.findUnique({
             where: { id: id },
             select: { image: true }
        });

        // Cleanup old image if different and is local
        if (existingMeal && existingMeal.image && existingMeal.image !== body.image && existingMeal.image.startsWith('/uploads/')) {
             try {
                const fs = require('fs/promises');
                const path = require('path');
                const oldPath = path.join(process.cwd(), 'public', existingMeal.image);
                await fs.unlink(oldPath);
                console.log(`Cleaned up old meal image: ${oldPath}`);
            } catch (e) {
                if (e.code !== 'ENOENT') console.warn(`Error deleting old meal image:`, e);
            }
        }

        meal = await prisma.meal.update({
            where: { id: id },
            data: {
                name: body.name,
                description: body.description || '',
                image: body.image || null,
                price: safePrice,
                categoryId: catId,
                active: body.active !== undefined ? body.active : true,
                popular: body.popular || false,
                hasSizes: body.hasSizes || false,
                sizes: body.sizes && body.sizes.length > 0 ? {
                    create: prepareSizes(body.sizes)
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
                price: safePrice,
                categoryId: catId,
                active: body.active !== undefined ? body.active : true,
                popular: body.popular || false,
                hasSizes: body.hasSizes || false,
                order: parseInt(body.order) || 0,
                sizes: {
                    create: prepareSizes(body.sizes)
                }
            },
            include: { sizes: true }
        });
    }
    
    revalidateTag('meals');
    return NextResponse.json(meal);
  } catch (error) {
    console.error("Meal Save Error:", error);
    return NextResponse.json({ 
      error: 'فشل في حفظ الوجبة: ' + (error.message || 'Unknown error')
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
        const numericId = parseInt(id);
        if(isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // 1. Get the meal first to find image path
        const meal = await prisma.meal.findUnique({
            where: { id: numericId },
            select: { image: true }
        });

        if (meal && meal.image) {
            // Check if it's a local upload
            if (meal.image.startsWith('/uploads/')) {
                 const fs = require('fs/promises');
                 const path = require('path');
                 // Image path is relative to public folder
                 // meal.image is like "/uploads/meals/xyz.jpg"
                 const filePath = path.join(process.cwd(), 'public', meal.image);
                 
                 try {
                     await fs.unlink(filePath);
                     console.log(`Deleted image file: ${filePath}`);
                 } catch (err) {
                     console.warn(`Failed to delete image file: ${filePath}`, err);
                     // Continue to delete record anyway
                 }
            }
        }

        await prisma.meal.delete({
            where: { id: numericId }
        });
        
        revalidateTag('meals');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Meal Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
