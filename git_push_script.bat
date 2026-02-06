@echo on
git remote remove origin
git remote add origin https://github.com/fastfastfood08-create/fast_food.git
git branch -M main
git add .
git commit -m "Push to new repository"
git push -u origin main
pause
