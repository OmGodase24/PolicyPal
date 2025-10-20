#!/bin/bash

# PolicyPal Deployment Health Check Script
# Tests all deployed services to ensure they're running correctly

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PolicyPal Deployment Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Update these URLs with your actual deployment URLs
BACKEND_URL="https://backend-production-xxxx.up.railway.app"
AI_SERVICE_URL="https://policypal-ai-service.onrender.com"
FRONTEND_URL="https://policy-pal-xxxx.vercel.app"

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -e "Checking ${YELLOW}${service_name}${NC}..."
    echo -e "  URL: ${url}"
    
    # Make request and capture status code
    http_code=$(curl -o /dev/null -s -w "%{http_code}" -m 10 "$url")
    
    # Check if request was successful
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "  Status: ${GREEN}✓ OK${NC} (HTTP ${http_code})"
        return 0
    else
        echo -e "  Status: ${RED}✗ FAILED${NC} (HTTP ${http_code})"
        return 1
    fi
}

# Counter for failed checks
failed_checks=0

# 1. Check Backend Health
echo ""
echo -e "${BLUE}[1/3] Backend Service${NC}"
if ! check_service "Backend API" "${BACKEND_URL}/health" 200; then
    ((failed_checks++))
    echo -e "  ${RED}→ Backend is not responding correctly${NC}"
    echo -e "  ${RED}→ Check Railway logs for errors${NC}"
fi
echo ""

# 2. Check AI Service Health
echo -e "${BLUE}[2/3] AI Service${NC}"
if ! check_service "AI Service API" "${AI_SERVICE_URL}/" 200; then
    ((failed_checks++))
    echo -e "  ${RED}→ AI Service is not responding correctly${NC}"
    echo -e "  ${RED}→ Note: Render free tier may be sleeping (takes ~30s to wake)${NC}"
    echo -e "  ${RED}→ Try again in 30 seconds or check Render logs${NC}"
fi
echo ""

# 3. Check Frontend
echo -e "${BLUE}[3/3] Frontend Application${NC}"
if ! check_service "Frontend Site" "${FRONTEND_URL}" 200; then
    ((failed_checks++))
    echo -e "  ${RED}→ Frontend is not accessible${NC}"
    echo -e "  ${RED}→ Check Vercel deployment status${NC}"
fi
echo ""

# Additional checks
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Additional Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if URLs are updated from template
if [[ "$BACKEND_URL" == *"xxxx"* ]]; then
    echo -e "${YELLOW}⚠ Warning: Backend URL not updated in script${NC}"
    echo -e "  Edit this script and replace BACKEND_URL with your actual Railway URL"
    ((failed_checks++))
fi

if [[ "$AI_SERVICE_URL" == *"xxxx"* ]]; then
    echo -e "${YELLOW}⚠ Warning: AI Service URL not updated in script${NC}"
    echo -e "  Edit this script and replace AI_SERVICE_URL with your actual Render URL"
    ((failed_checks++))
fi

if [[ "$FRONTEND_URL" == *"xxxx"* ]]; then
    echo -e "${YELLOW}⚠ Warning: Frontend URL not updated in script${NC}"
    echo -e "  Edit this script and replace FRONTEND_URL with your actual Vercel URL"
    ((failed_checks++))
fi

# SSL Certificate check
echo ""
echo -e "${BLUE}SSL Certificate Status:${NC}"
for url in "$BACKEND_URL" "$AI_SERVICE_URL" "$FRONTEND_URL"; do
    if [[ "$url" != *"xxxx"* ]]; then
        domain=$(echo "$url" | sed -e 's|https://||' -e 's|/.*||')
        if openssl s_client -connect "${domain}:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            echo -e "  ${GREEN}✓${NC} ${domain}"
        else
            echo -e "  ${RED}✗${NC} ${domain} - SSL verification failed"
        fi
    fi
done

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}✓ All services are healthy!${NC}"
    echo -e "${GREEN}✓ Your deployment is working correctly${NC}"
    echo ""
    echo -e "Your app is live at: ${BLUE}${FRONTEND_URL}${NC}"
    exit 0
else
    echo -e "${RED}✗ ${failed_checks} check(s) failed${NC}"
    echo -e "${YELLOW}⚠ Please review the errors above${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting tips:${NC}"
    echo -e "  1. Check deployment logs in each platform's dashboard"
    echo -e "  2. Verify environment variables are set correctly"
    echo -e "  3. Ensure CORS settings match your frontend URL"
    echo -e "  4. For Render: Free tier services sleep after 15min inactivity"
    echo -e "  5. Wait 1-2 minutes after changes for redeployment"
    echo ""
    echo -e "Platform dashboards:"
    echo -e "  Railway: ${BLUE}https://railway.app/dashboard${NC}"
    echo -e "  Render:  ${BLUE}https://dashboard.render.com/${NC}"
    echo -e "  Vercel:  ${BLUE}https://vercel.com/dashboard${NC}"
    exit 1
fi

