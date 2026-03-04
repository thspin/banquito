#!/bin/bash
# Deploy script for Banquito to Vercel

echo "🚀 Starting Banquito deployment to Vercel..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "🔍 Checking Vercel login status..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Please login to Vercel${NC}"
    vercel login
fi

# Build frontend
echo ""
echo "📦 Building frontend..."
cd frontend
npm install
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build successful${NC}"
cd ..

# Check environment variables
echo ""
echo "🔧 Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  WARNING: DATABASE_URL not set${NC}"
    echo "Make sure to set it in Vercel dashboard:"
    echo "  https://vercel.com/dashboard"
    echo ""
fi

# Deploy to Vercel
echo ""
echo "🚀 Deploying to Vercel..."
echo ""

# Ask if production or preview
read -p "Deploy to production? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Deploying to PRODUCTION...${NC}"
    vercel --prod
else
    echo -e "${YELLOW}Deploying to PREVIEW...${NC}"
    vercel
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run database migrations if needed:"
    echo "     cd backend && alembic upgrade head"
    echo ""
    echo "  2. Visit your deployed site and test"
    echo ""
    echo "  3. Check logs if needed:"
    echo "     vercel logs --tail"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above"
    exit 1
fi
