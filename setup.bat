npm init -y
mkdir backend
cd backend
npm init -y
npm install express sqlite3 cors multer json2csv
cd ..
mkdir frontend
cd frontend
npx -y create-vite@latest ./ --template react
npm install
npm install react-router-dom lucide-react jspdf
cd ..
npm install concurrently -D
