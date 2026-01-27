git status > git_status_check.txt 2>&1
echo ---LOG--- >> git_status_check.txt
git log -1 >> git_status_check.txt 2>&1
