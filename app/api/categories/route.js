import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

// Correct approach: Define the cached function OUTSIDE with strict keys
const getCategoriesCached = async (fetchAll) => {
    const fn = unstable_cache(
        async () => {
             const whereClause = fetchAll ? {} : { active: true };
             return await prisma.category.findMany({
                select: { id: true, name: true, icon: true, order: true, active: true },
                orderBy: { order: 'asc' },
                where: whereClause
            });
        },
        ['categories-list', fetchAll ? 'all' : 'active'],
        { tags: ['categories'] }
    );
    return fn();
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    
    const categories = await getCategoriesCached(includeAll);
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("POST /api/categories body:", JSON.stringify(body));
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
    }
    
    if (!body.icon || body.icon.trim() === '') {
      return NextResponse.json({ error: 'أيقونة القسم مطلوبة' }, { status: 400 });
    }
    
    let category;
    if (body.id) {
        const id = parseInt(body.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // Fetch existing category to check for old image cleanup
        const existingCategory = await prisma.category.findUnique({
            where: { id: id },
            select: { icon: true }
        });

        // Cleanup old image if it's being replaced and is a local upload
        if (existingCategory && existingCategory.icon && existingCategory.icon !== body.icon && existingCategory.icon.startsWith('/uploads/')) {
             try {
                const fs = require('fs/promises');
                const path = require('path');
                const oldPath = path.join(process.cwd(), 'public', existingCategory.icon);
                await fs.unlink(oldPath);
                console.log(`Cleaned up old category icon: ${oldPath}`);
            } catch (e) {
                // Ignore if file doesn't exist, log other errors
                if (e.code !== 'ENOENT') console.warn(`Error deleting old category icon:`, e);
            }
        }

        category = await prisma.category.update({
            where: { id: id },
            data: {
                name: body.name,
                icon: body.icon,
                active: body.active !== undefined ? body.active : true
            }
        });
    } else {
        // Check for duplicate name
        const existing = await prisma.category.findFirst({ where: { name: body.name } });
        if (existing) {
             return NextResponse.json({ error: 'يوجد قسم بهذا الاسم بالفعل' }, { status: 400 });
        }

        category = await prisma.category.create({
            data: {
                name: body.name,
                icon: body.icon,
                order: parseInt(body.order) || 0,
                active: body.active !== undefined ? body.active : true
            }
        });
    }
    
    revalidateTag('categories');
    return NextResponse.json(category);
  } catch (error) {
    console.error("Category Save Error:", error);
    return NextResponse.json({ 
      error: 'فشل في حفظ القسم'
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
        if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // 1. Fetch category to get its icon AND associated meals to clean up their images
        const category = await prisma.category.findUnique({
            where: { id: numericId },
            select: { icon: true }
        });

        const meals = await prisma.meal.findMany({
            where: { categoryId: numericId },
            select: { id: true, image: true }
        });

        const fs = require('fs/promises');
        const path = require('path');

        // 2. Delete Category Icon if it's a local file
        if (category && category.icon && category.icon.startsWith('/uploads/')) {
            try {
                const iconPath = path.join(process.cwd(), 'public', category.icon);
                await fs.unlink(iconPath);
                console.log(`Deleted category icon: ${iconPath}`);
            } catch (e) {
                if (e.code !== 'ENOENT') console.warn(`Error deleting category icon ${category.icon}:`, e);
            }
        }

        // 3. Delete Meal Images
        if (meals.length > 0) {
            await Promise.all(meals.map(async (meal) => {
                if (meal.image && meal.image.startsWith('/uploads/')) {
                    try {
                        const filePath = path.join(process.cwd(), 'public', meal.image);
                        await fs.unlink(filePath);
                        console.log(`Deleted meal image: ${filePath}`);
                    } catch (e) {
                         // Ignore file not found, log others
                         if (e.code !== 'ENOENT') console.error(`Error deleting file for meal ${meal.id}:`, e);
                    }
                }
            }));
        }

        // 4. Perform Database Deletion (Transaction)
        await prisma.$transaction(async (tx) => {
            // Explicitly delete meals first to ensure they are gone (fixes "meals still exist" issue)
            await tx.meal.deleteMany({
                where: { categoryId: numericId }
            });
            
            // Delete the category
            await tx.category.delete({
                where: { id: numericId }
            });
        });

        revalidateTag('categories');
        revalidateTag('meals'); // Also refresh meals cache
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Category Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
