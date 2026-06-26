Remove-Item -Recurse -Force frontend -ErrorAction SilentlyContinue
npx -y create-vite@5 frontend --template react
cd frontend
npm install
npm install react-router-dom lucide-react jspdf qrcode.react
cd ..
