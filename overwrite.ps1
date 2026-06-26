Copy-Item -Path ".\HumjoliSafa_ERP\backend\server.js" -Destination ".\backend\server.js" -Force
Copy-Item -Path ".\HumjoliSafa_ERP\backend\database.js" -Destination ".\backend\database.js" -Force
Copy-Item -Path ".\HumjoliSafa_ERP\frontend\src" -Destination ".\frontend" -Recurse -Force
Copy-Item -Path ".\HumjoliSafa_ERP\frontend\vite.config.js" -Destination ".\frontend\vite.config.js" -Force
Copy-Item -Path ".\HumjoliSafa_ERP\package.json" -Destination ".\package.json" -Force
Copy-Item -Path ".\HumjoliSafa_ERP\AGREEMENT_AND_LIABILITY_TERMS.md" -Destination ".\AGREEMENT_AND_LIABILITY_TERMS.md" -Force
Copy-Item -Path ".\HumjoliSafa_ERP\documentation" -Destination ".\" -Recurse -Force
