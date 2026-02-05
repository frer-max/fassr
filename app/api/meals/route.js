import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';
import { uploadImage, deleteImage } from '@/app/lib/cloudinary';

// Force dynamic behavior to bypass cache completely for meals data
export const dynamic = 'force-dynamic';

async function getMeals() {
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
                updatedAt: true,
                sizes: {
                    select: { id: true, name: true, price: true }
                },
                category: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { order: 'asc' }
        });
}

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
                    updatedAt: true,
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

        // 🟢 CLOUDINARY LOGIC: Handle Image Upload/Cleanup
        let finalImageUrl = body.image; // Default to incoming (could be URL or null)

        // Case 1: New Image Uploaded (Base64)
        if (body.image && body.image.startsWith('data:image')) {
            try {
                // Upload to Cloudinary
                finalImageUrl = await uploadImage(body.image);
                console.log(`Uploaded new image to Cloudinary: ${finalImageUrl}`);

                // Clean up OLD image if it existed
                if (existingMeal && existingMeal.image) {
                     // If it was Cloudinary, delete from Cloud
                     await deleteImage(existingMeal.image);
                     
                     // If it was Local (legacy), delete from FS
                     if (existingMeal.image.startsWith('/uploads/')) {
                        try {
                            const fs = require('fs/promises');
                            const path = require('path');
                            const oldPath = path.join(process.cwd(), 'public', existingMeal.image);
                            await fs.unlink(oldPath);
                        } catch (e) { /* Ignore */ }
                     }
                }
            } catch (uploadError) {
                console.error('Cloudinary Upload Failed:', uploadError);
                return NextResponse.json({ 
                    error: `فشل رفع الصورة للسحابة: ${uploadError.message || 'خطأ غير معروف'}` 
                }, { status: 500 });
            }
        } 
        // Case 2: Image Removed (body.image is null/empty but old existed)
        else if (!body.image && existingMeal && existingMeal.image) {
             await deleteImage(existingMeal.image);
             finalImageUrl = null;
        }
        else if (body.image !== existingMeal?.image && existingMeal?.image) {
             // Case 3: URL changed but not base64 (maybe manually edited or special case)?
             // Just delete old one to be safe if it was Cloudinary
             await deleteImage(existingMeal.image);
        }

        meal = await prisma.meal.update({
            where: { id: id },
            data: {
                name: body.name,
                description: body.description || '',
                image: finalImageUrl || null,
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
        // 🟢 CLOUDINARY LOGIC: Handle New Creation
        let finalImageUrl = body.image;

        if (body.image && body.image.startsWith('data:image')) {
            try {
                finalImageUrl = await uploadImage(body.image);
                console.log(`Uploaded new image (Create) to Cloudinary: ${finalImageUrl}`);
            } catch (uploadError) {
                console.error('Cloudinary Upload Failed (Create):', uploadError);
                return NextResponse.json({ 
                    error: `فشل رفع الصورة للسحابة: ${uploadError.message || 'خطأ غير معروف'}` 
                }, { status: 500 });
            }
        }

        meal = await prisma.meal.create({
            data: {
                name: body.name,
                description: body.description || '',
                image: finalImageUrl || null,
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
            // 🟢 Cloudinary Delete
            await deleteImage(meal.image);

            // Legacy Local Check
            if (meal.image.startsWith('/uploads/')) {
                 const fs = require('fs/promises');
                 const path = require('path');
                 // Image path is relative to public folder
                 // meal.image is like "/uploads/meals/xyz.jpg"
                 const filePath = path.join(process.cwd(), 'public', meal.image);
                 
                 try {
                     await fs.unlink(filePath);
                 } catch (err) { /* Ignore */ }
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
